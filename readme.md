# 🔧 Visualizador CAD Profesional

## 🚀 Deploy en Vercel

Visualizador CAD profesional con Autodesk Viewer que soporta múltiples formatos: DWG, DXF, STEP, IPT, IGS, STL.

### ✨ Características

- ✅ **Formatos soportados**: DWG, DXF, STEP, STP, IPT, IGS, IGES, STL
- ✅ **Herramientas profesionales**: Medición, sección, explosión
- ✅ **Interfaz moderna**: Responsive y optimizada
- ✅ **Subida de archivos**: Hasta 50MB por archivo
- ✅ **Visualización 3D/2D**: Navegación completa
- ✅ **Compartir en red**: Acceso multiusuario

### 🌐 URLs de Acceso

- **Producción**: https://tu-proyecto.vercel.app
- **Desarrollo**: http://localhost:3001

### 📁 Estructura del Proyecto

```
cad-viewer-profesional/
├── api/
│   └── index.js          # Servidor backend (Vercel Functions)
├── public/
│   └── index.html        # Interfaz del visualizador
├── package.json          # Dependencias
├── vercel.json          # Configuración de Vercel
├── .gitignore           # Archivos a ignorar
└── README.md            # Este archivo
```

### 🔧 Configuración de Variables de Entorno

En tu dashboard de Vercel, configura estas variables:

- `FORGE_CLIENT_ID`: Tu Client ID de Autodesk Forge
- `FORGE_CLIENT_SECRET`: Tu Client Secret de Autodesk Forge
- `NODE_ENV`: production

### 🚀 Deploy Rápido

1. **Fork/Clone este repositorio**
2. **Conectar con Vercel**:
   - Ve a [vercel.com](https://vercel.com)
   - "Import Git Repository"
   - Selecciona este repositorio
3. **Configurar variables de entorno**
4. **Deploy automático**

### 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Acceder a: http://localhost:3001
```

### 📊 API Endpoints

- `GET /api/health` - Estado del servidor
- `POST /api/auth/token` - Obtener token de Autodesk Forge
- `POST /api/upload` - Subir archivo CAD
- `GET /api/status/:urn` - Estado de conversión
- `GET /api/model/:urn/metadata` - Metadata del modelo
- `GET /api/info` - Información del servidor

### 🔒 Límites y Consideraciones

- **Tamaño máximo**: 50MB por archivo (Vercel)
- **Formatos**: DWG, DXF, STEP, IPT, IGS, STL
- **Autodesk Forge**: 100 conversiones gratis/mes
- **Almacenamiento**: Temporal (30 días)

### 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript, Autodesk Viewer
- **Backend**: Node.js, Express.js
- **Platform**: Vercel (Serverless Functions)
- **APIs**: Autodesk Forge (Data Management + Model Derivative)

### 📝 Uso

1. **Cargar archivo**: Haz clic en "Cargar Archivo"
2. **Seleccionar**: Elige tu archivo CAD
3. **Esperar conversión**: El archivo se procesa automáticamente
4. **Visualizar**: Usa las herramientas de navegación y medición
5. **Compartir**: Comparte la URL con tu equipo

### 🆘 Soporte

Si encuentras problemas:

1. Verifica que el archivo sea un formato soportado
2. Confirma que el tamaño sea menor a 50MB
3. Revisa las variables de entorno en Vercel
4. Consulta los logs en el dashboard de Vercel

### 📜 Licencia

MIT License - Uso libre para proyectos personales y comerciales.

---

**¡Listo para visualizar tus modelos CAD en la web!** 🎉