# Sistema Clínica

Monorepo del prototipo de gestión de citas médicas: API Django + dashboard React.

## Estructura

```
sistema-clinica/
├── backend_clinica/          # API REST (Django)
└── prototipoNav/CI/clinica-dashboard/  # Frontend (React + Vite)
```

## Requisitos previos

- **Python** 3.12+
- **Node.js** 18+ y npm
- **PostgreSQL** 14+ en `127.0.0.1:5432`
- Base de datos creada (por defecto: `clinica_ml`)

## Configuración inicial

### 1. Backend

```bash
cd backend_clinica
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajusta credenciales si es necesario
```

Variables de entorno del backend (archivo `backend_clinica/.env`):

| Variable     | Descripción              | Valor por defecto        |
|--------------|--------------------------|--------------------------|
| `DB_NAME`    | Nombre de la base        | `clinica_ml`             |
| `DB_USER`    | Usuario PostgreSQL       | `postgres`               |
| `DB_PASSWORD`| Contraseña PostgreSQL    | `postgres123`            |
| `DB_HOST`    | Host de la base          | `127.0.0.1`              |
| `DB_PORT`    | Puerto PostgreSQL        | `5432`                   |
| `SECRET_KEY` | Clave Django             | (ver `.env.example`)     |
| `JWT_SECRET` | Clave para tokens JWT    | (ver `.env.example`)     |

Carga datos demo (después de crear las tablas con tu script SQL):

```bash
python manage.py seed_demo
```

Ejecutar API:

```bash
python manage.py runserver 127.0.0.1:8000
```

### 2. Frontend

```bash
cd prototipoNav/CI/clinica-dashboard
npm install
cp .env.example .env   # opcional, ya tiene valor por defecto
npm run dev
```

El dashboard corre en `http://localhost:5173` y apunta a la API en `http://127.0.0.1:8000/api`.

## Dependencias

### Backend (`requirements.txt`)

- Django 5.2
- Django REST Framework
- django-cors-headers
- psycopg (driver PostgreSQL)
- PyJWT
- python-dotenv

### Frontend (`package.json`)

- React 19
- Vite 8
- Tailwind CSS 4

## Conexión a la base de datos

La conexión PostgreSQL se configura **únicamente** en:

`backend_clinica/clinica_api/settings.py` → bloque `DATABASES`

Las credenciales se leen desde `backend_clinica/.env`. Django usa el ORM para todas las consultas; no hay conexiones directas en otros archivos del proyecto.

## Usuarios demo

Ver `backend_clinica/usuarios_demo.txt` para credenciales de prueba (paciente, médico, admin).

## Endpoints principales

- `POST /api/auth/login/`
- `GET /api/catalogo/`
- `GET /api/citas/`
- `POST /api/citas/crear/`
- `POST /api/citas/<id>/asistir/`
- `POST /api/citas/<id>/solicitar-cancelacion/`
- `POST /api/citas/<id>/aprobar-cancelacion/`
- `POST /api/citas/<id>/rechazar-cancelacion/`
