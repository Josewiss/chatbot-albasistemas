// api/index.js - Servidor backend optimizado para Vercel
const express = require('express');
const multer = require('multer');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const app = express();

// ============================================================================
// CONFIGURACIÓN DE AUTODESK FORGE
// ============================================================================
const FORGE_CONFIG = {
    CLIENT_ID: process.env.FORGE_CLIENT_ID || 'JM7AOlzEAZj4SsoS0WaLcOTIeBmCDY4m0iWq6Mlchdsfx3sZ',
    CLIENT_SECRET: process.env.FORGE_CLIENT_SECRET || 'KwNuW6WR0hsYzUMk36FE7T1XIw7GmtBhCrNbUdcm6xTLArAI4AxxAVaG3CaU1AeU',
    SCOPE: 'data:read data:write data:create bucket:create bucket:read',
    BASE_URL: 'https://developer.api.autodesk.com'
};

// Bucket para almacenar archivos
const BUCKET_KEY = 'cad-viewer-bucket-' + crypto.randomBytes(8).toString('hex').toLowerCase();

// Variables globales para cache de token
let accessToken = null;
let tokenExpiry = null;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        /\.vercel\.app$/,
        /\.vercel\.com$/,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        process.env.FRONTEND_URL || ''
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Para Vercel, usamos memoria en lugar de disco
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB para Vercel
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.dwg', '.dxf', '.step', '.stp', '.ipt', '.igs', '.iges', '.stl'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Formato de archivo no soportado: ${fileExtension}`));
        }
    }
});

// ============================================================================
// FUNCIONES DE AUTODESK FORGE
// ============================================================================

// Obtener token de acceso
async function getAccessToken() {
    try {
        // Si el token existe y no ha expirado, lo reutilizamos
        if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
            return accessToken;
        }

        console.log('🔑 Obteniendo nuevo token de acceso...');
        
        const response = await fetch(`${FORGE_CONFIG.BASE_URL}/authentication/v1/authenticate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: FORGE_CONFIG.CLIENT_ID,
                client_secret: FORGE_CONFIG.CLIENT_SECRET,
                grant_type: 'client_credentials',
                scope: FORGE_CONFIG.SCOPE
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response status:', response.status);
            console.error('Response text:', errorText);
            throw new Error(`Error de autenticación: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Renovar 1 minuto antes
        
        console.log('✅ Token obtenido correctamente');
        return accessToken;
        
    } catch (error) {
        console.error('❌ Error obteniendo token:', error);
        throw error;
    }
}

// Crear bucket si no existe
async function ensureBucketExists() {
    try {
        const token = await getAccessToken();
        
        // Verificar si el bucket existe
        const checkResponse = await fetch(`${FORGE_CONFIG.BASE_URL}/oss/v2/buckets/${BUCKET_KEY}/details`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (checkResponse.status === 200) {
            console.log(`📦 Bucket ${BUCKET_KEY} ya existe`);
            return;
        }

        // Crear bucket si no existe
        console.log(`🆕 Creando bucket ${BUCKET_KEY}...`);
        
        const createResponse = await fetch(`${FORGE_CONFIG.BASE_URL}/oss/v2/buckets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bucketKey: BUCKET_KEY,
                policyKey: 'temporary'
            })
        });

        if (!createResponse.ok) {
            const errorText = await createResponse.text();
            console.log(`⚠️ Bucket creation warning: ${createResponse.status} ${errorText}`);
            // No lanzar error si es 409 (bucket already exists)
            if (createResponse.status !== 409) {
                throw new Error(`Error creando bucket: ${createResponse.status} ${errorText}`);
            }
        }

        console.log('✅ Bucket verificado correctamente');
        
    } catch (error) {
        console.error('❌ Error con bucket:', error);
        // No lanzar error para que la app continúe funcionando
    }
}

// Subir archivo a Forge usando buffer de memoria
async function uploadToForge(fileBuffer, originalName) {
    try {
        const token = await getAccessToken();
        await ensureBucketExists();

        console.log(`📤 Subiendo archivo: ${originalName}`);

        const objectName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        const response = await fetch(`${FORGE_CONFIG.BASE_URL}/oss/v2/buckets/${BUCKET_KEY}/objects/${objectName}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': fileBuffer.length
            },
            body: fileBuffer
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error subiendo archivo: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Archivo subido correctamente');
        
        return {
            objectId: result.objectId,
            objectKey: result.objectKey,
            bucketKey: BUCKET_KEY,
            size: result.size
        };

    } catch (error) {
        console.error('❌ Error subiendo archivo:', error);
        throw error;
    }
}

// Convertir archivo usando Model Derivative API
async function translateFile(objectId) {
    try {
        const token = await getAccessToken();
        const urn = Buffer.from(objectId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        console.log(`🔄 Iniciando conversión del archivo... URN: ${urn}`);

        const response = await fetch(`${FORGE_CONFIG.BASE_URL}/modelderivative/v2/designdata/job`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'x-ads-force': 'true'
            },
            body: JSON.stringify({
                input: {
                    urn: urn
                },
                output: {
                    formats: [
                        {
                            type: 'svf2',
                            views: ['2d', '3d']
                        }
                    ]
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error iniciando conversión: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Conversión iniciada correctamente');
        
        return {
            urn: urn,
            derivatives: result.derivatives || []
        };

    } catch (error) {
        console.error('❌ Error en conversión:', error);
        throw error;
    }
}

// Verificar estado de conversión
async function checkTranslationStatus(urn) {
    try {
        const token = await getAccessToken();

        const response = await fetch(`${FORGE_CONFIG.BASE_URL}/modelderivative/v2/designdata/${urn}/manifest`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error verificando estado: ${response.status}`);
        }

        const manifest = await response.json();
        return manifest;

    } catch (error) {
        console.error('❌ Error verificando estado:', error);
        throw error;
    }
}

// ============================================================================
// RUTAS DE LA API
// ============================================================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        bucket: BUCKET_KEY
    });
});

// Obtener token de acceso para el cliente
app.post('/api/auth/token', async (req, res) => {
    try {
        const token = await getAccessToken();
        res.json({
            access_token: token,
            token_type: 'Bearer',
            expires_in: Math.floor((tokenExpiry - Date.now()) / 1000)
        });
    } catch (error) {
        console.error('Error en /api/auth/token:', error);
        res.status(500).json({ error: error.message });
    }
});

// Subir y procesar archivo CAD
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se proporcionó archivo' });
        }

        console.log(`📁 Procesando archivo: ${req.file.originalname}`);

        // Subir a Forge usando el buffer de memoria
        const uploadResult = await uploadToForge(req.file.buffer, req.file.originalname);
        
        // Iniciar conversión
        const translationResult = await translateFile(uploadResult.objectId);

        res.json({
            success: true,
            urn: translationResult.urn,
            objectId: uploadResult.objectId,
            filename: req.file.originalname,
            size: uploadResult.size,
            message: 'Archivo subido y conversión iniciada'
        });

    } catch (error) {
        console.error('Error en /api/upload:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verificar estado de conversión
app.get('/api/status/:urn', async (req, res) => {
    try {
        const { urn } = req.params;
        const manifest = await checkTranslationStatus(urn);
        
        res.json({
            status: manifest.status,
            progress: manifest.progress,
            region: manifest.region,
            derivatives: manifest.derivatives,
            success: manifest.status === 'success'
        });

    } catch (error) {
        console.error('Error en /api/status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener información del modelo
app.get('/api/model/:urn/metadata', async (req, res) => {
    try {
        const { urn } = req.params;
        const token = await getAccessToken();

        const response = await fetch(`${FORGE_CONFIG.BASE_URL}/modelderivative/v2/designdata/${urn}/metadata`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Error obteniendo metadata: ${response.status}`);
        }

        const metadata = await response.json();
        res.json(metadata);

    } catch (error) {
        console.error('Error en /api/model/metadata:', error);
        res.status(500).json({ error: error.message });
    }
});

// Obtener información del servidor
app.get('/api/info', (req, res) => {
    res.json({
        server: 'CAD Viewer Server',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        platform: 'Vercel',
        forge: {
            bucketKey: BUCKET_KEY,
            baseUrl: FORGE_CONFIG.BASE_URL
        },
        supportedFormats: ['.dwg', '.dxf', '.step', '.stp', '.ipt', '.igs', '.iges', '.stl'],
        maxFileSize: '50MB',
        status: 'running'
    });
});

// Manejo de errores
app.use((error, req, res, next) => {
    console.error('❌ Error del servidor:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Archivo demasiado grande. Máximo 50MB.' });
        }
    }
    
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
    });
});

// Ruta 404
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

// Inicialización para Vercel
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`✅ Servidor de desarrollo ejecutándose en puerto ${PORT}`);
    });
}

// Exportar para Vercel
module.exports = app;