const express = require('express');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const indexRoutes = require('./routes/index.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos públicos
app.use(express.static(path.join(__dirname, '../public')));
// API
app.use('/api', indexRoutes);

// Archivos subidos
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Comprobar conexión con la base de datos
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 AS connected');

        res.json({
            success: true,
            database: rows[0].connected === 1
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            database: false
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});