const express = require('express');
const router = express.Router();

const db = require('../config/database');

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

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
            SELECT *
            FROM albums
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            albums
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al obtener los álbumes'
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

        // Buscar el álbum
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

        // Comprobar que se han recibido archivos
        if (!req.files || req.files.length === 0) {

            return res.status(400).json({
                success: false,
                message: 'No se ha recibido ningún archivo'
            });

        }

        // Guardar información en MySQL
        for (const file of req.files) {

            await db.query(
                `INSERT INTO files
                (album_id, original_name, stored_name, mime_type, size)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    album.id,
                    file.originalname,
                    file.filename,
                    file.mimetype,
                    file.size
                ]
            );

        }

        res.status(201).json({

            success: true,

            message: 'Archivos subidos correctamente',

            files: req.files.map(file => ({
                originalName: file.originalname,
                storedName: file.filename,
                mimeType: file.mimetype,
                size: file.size
            }))

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Error al subir los archivos'
        });

    }

});

module.exports = router;