# Bitácora de viajes

App de registro de viajes con login por usuario (Supabase) — cada usuario ve solo sus propios viajes.

## 1. Configurar

Ya viene con tus claves de Supabase en `.env`. Si alguna vez cambias de proyecto de Supabase,
edita ese archivo con la nueva URL y clave (Project Settings → API en tu panel de Supabase).

## 2. Probar en local

Necesitas [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
npm install
npm run dev
```

Abre la URL que te muestre en la terminal (normalmente http://localhost:5173).
Regístrate con tu email, confirma el email si Supabase te lo pide, e inicia sesión.

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Bitácora de viajes"
```

Crea un repositorio nuevo en github.com (botón "New"), y luego:

```bash
git remote add origin https://github.com/TU_USUARIO/bitacora-viajes.git
git branch -M main
git push -u origin main
```

## 4. Publicar en Vercel (gratis)

1. Ve a vercel.com → inicia sesión con GitHub.
2. "Add New..." → "Project" → elige el repositorio `bitacora-viajes`.
3. En "Environment Variables" añade (¡importante, el `.env` no se sube a GitHub!):
   - `VITE_SUPABASE_URL` = tu Project URL de Supabase
   - `VITE_SUPABASE_ANON_KEY` = tu clave pública
4. Dale a "Deploy". En 1-2 minutos tendrás tu enlace `tu-app.vercel.app`.

## Modificar la app más adelante

Todo el código vive en `src/`:
- `src/TravelLog.jsx` — la app en sí (formulario, estadísticas, mapa, banderas)
- `src/Auth.jsx` — pantalla de login/registro
- `src/data.js` — lista de países, banderas, insignias
- `src/App.jsx` — decide si mostrar login o la app

Cada vez que cambies algo y lo subas a GitHub (`git add . && git commit -m "..." && git push`),
Vercel lo vuelve a publicar solo, automáticamente. No hace falta repetir el paso 4.
