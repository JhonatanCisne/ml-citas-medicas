# Backend Clínica

API REST local en Django para el prototipo de citas médicas.

## Instalación

```bash
cd backend_clinica
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL si difieren de las de desarrollo.

## Datos demo

Primero crea las tablas con tu script SQL. Luego ejecuta:

```bash
python manage.py seed_demo
```

Esto inserta datos de prueba sin cambiar la estructura de la base.

## Ejecutar

```bash
python manage.py runserver 127.0.0.1:8000
```

Endpoints principales:

- `POST /api/auth/login/`
- `GET /api/catalogo/`
- `GET /api/citas/`
- `POST /api/citas/crear/`
- `POST /api/citas/<id>/asistir/`
- `POST /api/citas/<id>/solicitar-cancelacion/`
- `POST /api/citas/<id>/aprobar-cancelacion/`
- `POST /api/citas/<id>/rechazar-cancelacion/`

Para instrucciones completas del monorepo, ver el [README principal](../README.md).
