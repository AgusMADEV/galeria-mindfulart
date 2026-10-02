const express = require('express');
const router = express.Router();

const db = require('../config/database');

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { ZipArchive } = require('archiver');


const { convertToMp4 } = require('../utils/videoConverter');

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },

    filename: (req, file, cb) => {

        const extension = path.extname(file.originalname);

        const uniqueName =
            `${crypto.randomBytes(16).toString('hex')}${extension}`;

        cb(null, uniqueName);
    }

});

const upload = multer({

    storage,

    limits: {
        fileSize: 500 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'video/mp4',
            'video/webm',
            'video/quicktime'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de archivo no permitido'));
        }

    }

});

// Obtener todos los álbumes
router.get('/albums', async (req, res) => {

    try {

        const [albums] = await db.query(`
            SELECT
                a.*,

                COUNT(f.id) AS file_count,

                GROUP_CONCAT(
                    CASE
                        WHEN f.mime_type LIKE 'image/%'
                        THEN f.stored_name
                    END
                    ORDER BY f.created_at ASC
                    SEPARATOR ','
                ) AS preview_images

            FROM albums a

            LEFT JOIN files f
                ON f.album_id = a.id

            GROUP BY a.id

            ORDER BY a.created_at DESC
        `);

        const formattedAlbums = albums.map(album => {

            const previewImages = album.preview_images
                ? album.preview_images.split(',').slice(0, 3)
                : [];

            return {
                ...album,
                file_count: Number(album.file_count),
                preview_images: previewImages
            };

        });

        res.json({
            success: true,
            albums: formattedAlbums
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al obtener los álbumes'
        });

    }

});

router.put('/albums/:id', async (req, res) => {

    try {

        const { id } = req.params;
        const { name } = req.body;

        const cleanName = name?.trim();

        if (!cleanName) {

            return res.status(400).json({
                success: false,
                message: 'El nombre del álbum no puede estar vacío'
            });

        }

        const [result] = await db.query(
            `UPDATE albums
             SET name = ?
             WHERE id = ?`,
            [cleanName, id]
        );

        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });

        }

        res.json({
            success: true,
            message: 'Álbum actualizado correctamente'
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al actualizar el álbum'
        });

    }

});

// Crear un nuevo álbum
router.post('/albums', async (req, res) => {
    try {
        const { name } = req.body;

        // Comprobar que se ha enviado un nombre
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del álbum es obligatorio'
            });
        }

        // Generar un token aleatorio
        const token = require('crypto')
            .randomBytes(32)
            .toString('hex');

        // Crear el álbum
        const [result] = await db.query(
            `INSERT INTO albums (name, token)
             VALUES (?, ?)`,
            [name.trim(), token]
        );

        res.status(201).json({
            success: true,
            album: {
                id: result.insertId,
                name: name.trim(),
                token
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al crear el álbum'
        });
    }
});

// Obtener un álbum mediante su token
router.get('/albums/:token', async (req, res) => {

    try {

        const { token } = req.params;

        // Buscar el álbum
        const [albums] = await db.query(
            `SELECT id, name, token, created_at, expires_at
             FROM albums
             WHERE token = ?`,
            [token]
        );

        if (albums.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });

        }

        const album = albums[0];

        // Comprobar caducidad
        if (
            album.expires_at &&
            new Date(album.expires_at) < new Date()
        ) {

            return res.status(410).json({
                success: false,
                message: 'Este álbum ha caducado'
            });

        }

        // Obtener archivos del álbum
        const [files] = await db.query(
            `SELECT
                id,
                original_name,
                stored_name,
                preview_name,
                mime_type,
                size,
                created_at
            FROM files
             WHERE album_id = ?
             ORDER BY created_at ASC`,
            [album.id]
        );

        res.json({

            success: true,

            album: {
                ...album,
                files
            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al obtener el álbum'
        });

    }

});

// Subir archivos a un álbum
router.post('/albums/:token/files', upload.array('files', 50), async (req, res) => {

    try {

        const { token } = req.params;

        const [albums] = await db.query(
            `SELECT id, name
             FROM albums
             WHERE token = ?`,
            [token]
        );

        if (albums.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });

        }

        const album = albums[0];

        if (!req.files || req.files.length === 0) {

            return res.status(400).json({
                success: false,
                message: 'No se ha recibido ningún archivo'
            });

        }

        const uploadedFiles = [];

        for (const file of req.files) {

            let previewName = null;

            const extension = path
                .extname(file.originalname)
                .toLowerCase();

            if (extension === '.mov') {

                previewName =
                    `${path.basename(file.filename, extension)}.mp4`;

                const inputPath = path.join(
                    __dirname,
                    '../../uploads',
                    file.filename
                );

                const outputPath = path.join(
                    __dirname,
                    '../../uploads',
                    previewName
                );

                console.log(
                    `Convirtiendo ${file.originalname} a MP4...`
                );

                await convertToMp4(
                    inputPath,
                    outputPath
                );

                console.log(
                    `Conversión completada: ${previewName}`
                );
            }

            await db.query(
                `INSERT INTO files
                (
                    album_id,
                    original_name,
                    stored_name,
                    preview_name,
                    mime_type,
                    size
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    album.id,
                    file.originalname,
                    file.filename,
                    previewName,
                    file.mimetype,
                    file.size
                ]
            );

            uploadedFiles.push({
                originalName: file.originalname,
                storedName: file.filename,
                previewName,
                mimeType: file.mimetype,
                size: file.size
            });
        }

        res.status(201).json({

            success: true,

            message: 'Archivos subidos correctamente',

            files: uploadedFiles

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al subir los archivos'
        });

    }

});

router.post('/albums/:token/download', async (req, res) => {

    try {

        const { token } = req.params;
        const { fileIds } = req.body;

        if (!Array.isArray(fileIds) || fileIds.length === 0) {

            return res.status(400).json({
                success: false,
                message: 'No se han seleccionado archivos'
            });

        }

        const [albums] = await db.query(
            `SELECT id, name
             FROM albums
             WHERE token = ?`,
            [token]
        );

        if (albums.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Álbum no encontrado'
            });

        }

        const album = albums[0];

        const [files] = await db.query(
            `SELECT
                id,
                original_name,
                stored_name
             FROM files
             WHERE album_id = ?
             AND id IN (?)`,
            [album.id, fileIds]
        );

        if (files.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'No se encontraron los archivos'
            });

        }

        const archive = new ZipArchive({
            zlib: {
                level: 6
            }
        });

        archive.on('error', error => {
            console.error('Error creando ZIP:', error);

            if (!res.headersSent) {
                res.status(500).end();
            }
        });

        const zipName =
            `${album.name.replace(/[^a-z0-9áéíóúñü ]/gi, '_')}.zip`;

        res.attachment(zipName);

        archive.pipe(res);

        for (const file of files) {

            const filePath = path.join(
                __dirname,
                '../../uploads',
                file.stored_name
            );

            archive.file(filePath, {
                name: file.original_name
            });

        }

        await archive.finalize();

    } catch (error) {

        console.error(error);

        if (!res.headersSent) {

            res.status(500).json({
                success: false,
                message: 'Error al crear el ZIP'
            });

        }

    }

});

module.exports = router;