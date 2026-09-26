const express = require('express');
const router = express.Router();

const db = require('../config/database');

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

module.exports = router;