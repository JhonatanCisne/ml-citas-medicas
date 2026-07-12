import json
from datetime import date, datetime, timedelta

import jwt
from django.conf import settings
from django.db import transaction
from django.db.models import Count
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Administrador, AgendaMedica, Cita, Especialidad, Medico, Notificacion, Paciente


def _body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return {}


def _token_for(user):
    payload = {
        "sub": str(user["id"]),
        "role": user["role"],
        "email": user["email"],
        "name": user["name"],
        "exp": datetime.utcnow() + timedelta(hours=settings.JWT_EXP_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def _current_user(request):
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header.split(" ", 1)[1]
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


def _auth_required(view):
    def wrapper(request, *args, **kwargs):
        user = _current_user(request)
        if not user:
            return JsonResponse({"detail": "Token inválido o ausente."}, status=401)
        request.user_payload = user
        return view(request, *args, **kwargs)

    return wrapper


def _full_name(obj):
    return f"{obj.nombres} {getattr(obj, 'apellidos', '')}".strip()


def _time(value):
    return value.strftime("%H:%M")


def _cita_dict(cita):
    medico = cita.id_medico
    paciente = cita.id_paciente
    especialidad = medico.id_especialidad
    sede = medico.id_sede
    return {
        "id": cita.id_cita,
        "paciente_id": paciente.id_paciente,
        "paciente": _full_name(paciente),
        "paciente_email": paciente.correo,
        "medico_id": medico.id_medico,
        "medico": _full_name(medico),
        "medico_email": medico.correo,
        "especialidad": especialidad.nombre,
        "sede": sede.nombre,
        "consultorio": sede.nombre,
        "agenda_id": cita.id_agenda_id,
        "fecha": cita.fecha.isoformat(),
        "hora_inicio": _time(cita.hora_inicio),
        "hora_fin": _time(cita.hora_fin),
        "modalidad": cita.modalidad,
        "estado": cita.estado,
        "motivo_consulta": cita.motivo_consulta or "",
    }


def _estado_agenda_para_cita(estado_cita):
    return "DISPONIBLE" if estado_cita == "CANCELADA" else "OCUPADA"


@require_http_methods(["GET"])
def health(_request):
    return JsonResponse({"ok": True, "service": "clinica-api"})


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = _body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    demo = settings.DEMO_USERS.get(email)

    if not demo or password != demo["password"]:
        return JsonResponse({"detail": "Credenciales inválidas."}, status=400)

    role = demo["role"]
    try:
        if role == "paciente":
            obj = Paciente.objects.get(correo__iexact=email, estado="ACTIVO")
            user = {"id": obj.id_paciente, "role": role, "email": obj.correo, "name": _full_name(obj)}
        elif role == "medico":
            obj = Medico.objects.get(correo__iexact=email, estado="ACTIVO")
            user = {"id": obj.id_medico, "role": role, "email": obj.correo, "name": _full_name(obj)}
        else:
            obj = Administrador.objects.get(correo__iexact=email)
            user = {"id": obj.id_administrador, "role": role, "email": obj.correo, "name": obj.nombres}
    except (Paciente.DoesNotExist, Medico.DoesNotExist, Administrador.DoesNotExist):
        return JsonResponse(
            {"detail": "Usuario demo no existe en la base. Ejecuta: python manage.py seed_demo"},
            status=400,
        )

    return JsonResponse({"token": _token_for(user), "user": user})


@require_http_methods(["GET"])
@_auth_required
def me(request):
    user = request.user_payload
    return JsonResponse({"user": {"id": int(user["sub"]), "role": user["role"], "email": user["email"], "name": user["name"]}})


@require_http_methods(["GET"])
@_auth_required
def catalogo(_request):
    especialidades = [
        {
            "id": esp.id_especialidad,
            "nombre": esp.nombre,
            "descripcion": esp.descripcion or "Atención médica especializada.",
        }
        for esp in Especialidad.objects.filter(estado="ACTIVA").order_by("nombre")
    ]
    medicos = [
        {
            "id": med.id_medico,
            "nombre": _full_name(med),
            "correo": med.correo,
            "especialidad_id": med.id_especialidad_id,
            "especialidad": med.id_especialidad.nombre,
            "sede": med.id_sede.nombre,
            "cmp": med.cmp,
        }
        for med in Medico.objects.select_related("id_especialidad", "id_sede").filter(estado="ACTIVO").order_by("apellidos")
    ]
    agendas_qs = (
        AgendaMedica.objects.select_related("id_medico")
        .filter(estado="DISPONIBLE")
        .order_by("fecha", "hora_inicio", "id_medico_id")
    )
    agendas = [
        {
            "id": agenda.id_agenda,
            "medico_id": agenda.id_medico_id,
            "fecha": agenda.fecha.isoformat(),
            "hora_inicio": _time(agenda.hora_inicio),
            "hora_fin": _time(agenda.hora_fin),
            "estado": agenda.estado,
        }
        for agenda in agendas_qs
    ]
    return JsonResponse({"especialidades": especialidades, "medicos": medicos, "agendas": agendas})


@require_http_methods(["GET"])
@_auth_required
def citas(request):
    user = request.user_payload
    qs = Cita.objects.select_related(
        "id_paciente",
        "id_medico",
        "id_medico__id_especialidad",
        "id_medico__id_sede",
        "id_agenda",
    ).order_by("fecha", "hora_inicio")

    if user["role"] == "paciente":
        qs = qs.filter(id_paciente_id=int(user["sub"]))
    elif user["role"] == "medico":
        qs = qs.filter(id_medico_id=int(user["sub"]))
    elif user["role"] == "admin":
        estado = request.GET.get("estado")
        if estado:
            qs = qs.filter(estado=estado)

    total = qs.count()
    page = max(1, int(request.GET.get("page", "1") or "1"))
    page_size = max(1, min(100, int(request.GET.get("page_size", "10") or "10")))
    total_pages = max(1, (total + page_size - 1) // page_size)
    if page > total_pages:
        page = total_pages
    start = (page - 1) * page_size
    end = start + page_size

    citas_data = [_cita_dict(cita) for cita in qs[start:end]]
    return JsonResponse(
        {
            "scope": user["role"],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1,
            "citas": citas_data,
        }
    )


@require_http_methods(["GET"])
@_auth_required
def dashboard(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede ver el dashboard."}, status=403)

    today = date.today()
    base = Cita.objects.select_related("id_medico__id_especialidad")
    estados = {row["estado"]: row["total"] for row in base.values("estado").annotate(total=Count("id_cita"))}
    especialidades = list(
        base.values("id_medico__id_especialidad__nombre")
        .annotate(total=Count("id_cita"))
        .order_by("-total")[:6]
    )
    proximos_dias = list(
        base.filter(fecha__gte=today)
        .values("fecha")
        .annotate(total=Count("id_cita"))
        .order_by("fecha")[:7]
    )

    total_citas = base.count()
    cancelaciones_pendientes = estados.get("SOLICITA_CANCELACION", 0)
    programadas = estados.get("PROGRAMADA", 0)
    asistidas = estados.get("ASISTIDA", 0)
    canceladas = estados.get("CANCELADA", 0)
    agendas_disponibles = AgendaMedica.objects.filter(estado="DISPONIBLE").count()

    return JsonResponse(
        {
            "metricas": {
                "total_citas": total_citas,
                "programadas": programadas,
                "asistidas": asistidas,
                "canceladas": canceladas,
                "cancelaciones_pendientes": cancelaciones_pendientes,
                "agendas_disponibles": agendas_disponibles,
            },
            "por_estado": [{"label": key, "total": value} for key, value in estados.items()],
            "por_especialidad": [
                {"label": row["id_medico__id_especialidad__nombre"] or "Sin especialidad", "total": row["total"]}
                for row in especialidades
            ],
            "proximos_dias": [
                {"label": row["fecha"].isoformat(), "total": row["total"]}
                for row in proximos_dias
            ],
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def crear_cita(request):
    user = request.user_payload
    if user["role"] != "paciente":
        return JsonResponse({"detail": "Solo un paciente puede reservar citas."}, status=403)

    data = _body(request)
    agenda_id = data.get("agenda_id")
    modalidad = data.get("modalidad") or "PRESENCIAL"
    motivo = data.get("motivo_consulta") or "Consulta programada desde prototipo"

    with transaction.atomic():
        agenda = (
            AgendaMedica.objects.select_for_update()
            .select_related("id_medico")
            .filter(id_agenda=agenda_id, estado="DISPONIBLE")
            .first()
        )
        if not agenda:
            return JsonResponse({"detail": "El horario seleccionado ya no está disponible."}, status=400)

        paciente = Paciente.objects.get(id_paciente=int(user["sub"]))
        inicio = datetime.combine(agenda.fecha, agenda.hora_inicio)
        fin = datetime.combine(agenda.fecha, agenda.hora_fin)
        duracion = max(1, int((fin - inicio).total_seconds() / 60))

        cita = Cita.objects.create(
            id_paciente=paciente,
            id_medico=agenda.id_medico,
            id_agenda=agenda,
            fecha=agenda.fecha,
            hora_inicio=agenda.hora_inicio,
            hora_fin=agenda.hora_fin,
            fecha_registro=timezone.now(),
            duracion_minutos=duracion,
            modalidad=modalidad,
            estado="PROGRAMADA",
            motivo_consulta=motivo,
        )
        agenda.estado = _estado_agenda_para_cita(cita.estado)
        agenda.save(update_fields=["estado"])

    return JsonResponse({"cita": _cita_dict(cita)}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def marcar_asistido(request, cita_id):
    user = request.user_payload
    if user["role"] != "medico":
        return JsonResponse({"detail": "Solo el médico puede marcar asistencia."}, status=403)

    cita = Cita.objects.select_related("id_agenda").filter(id_cita=cita_id, id_medico_id=int(user["sub"])).first()
    if not cita:
        return JsonResponse({"detail": "Cita no encontrada."}, status=404)
    if cita.estado != "PROGRAMADA":
        return JsonResponse({"detail": "La cita no está programada."}, status=400)

    inicio = datetime.combine(cita.fecha, cita.hora_inicio)
    if timezone.now().replace(tzinfo=None) < inicio:
        return JsonResponse({"detail": "Solo se puede marcar como asistida desde la hora de la cita."}, status=400)

    cita.estado = "ASISTIDA"
    cita.save(update_fields=["estado"])
    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def solicitar_cancelacion(request, cita_id):
    user = request.user_payload
    qs = Cita.objects.select_related("id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede")
    if user["role"] == "paciente":
        qs = qs.filter(id_paciente_id=int(user["sub"]))
    elif user["role"] == "medico":
        qs = qs.filter(id_medico_id=int(user["sub"]))
    else:
        return JsonResponse({"detail": "El administrador aprueba o rechaza cancelaciones."}, status=403)

    cita = qs.filter(id_cita=cita_id).first()
    if not cita:
        return JsonResponse({"detail": "Cita no encontrada."}, status=404)
    if cita.estado not in ["PROGRAMADA", "SOLICITA_CANCELACION"]:
        return JsonResponse({"detail": "La cita no permite solicitar cancelación."}, status=400)

    cita.estado = "SOLICITA_CANCELACION"
    cita.save(update_fields=["estado"])
    Notificacion.objects.create(
        id_paciente=cita.id_paciente,
        id_cita=cita,
        mensaje="Solicitud de cancelación pendiente de aprobación administrativa.",
        tipo="CANCELACION",
        canal="SISTEMA",
        fecha_envio=timezone.now(),
        estado="PENDIENTE",
    )
    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def aprobar_cancelacion(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede aprobar cancelaciones."}, status=403)

    with transaction.atomic():
        cita = Cita.objects.select_for_update().select_related("id_agenda").filter(id_cita=cita_id).first()
        if not cita:
            return JsonResponse({"detail": "Cita no encontrada."}, status=404)
        if cita.estado != "SOLICITA_CANCELACION":
            return JsonResponse({"detail": "La cita no tiene cancelación pendiente."}, status=400)
        cita.estado = "CANCELADA"
        cita.save(update_fields=["estado"])
        cita.id_agenda.estado = "DISPONIBLE"
        cita.id_agenda.save(update_fields=["estado"])

    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def rechazar_cancelacion(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede rechazar cancelaciones."}, status=403)

    cita = Cita.objects.filter(id_cita=cita_id).first()
    if not cita:
        return JsonResponse({"detail": "Cita no encontrada."}, status=404)
    if cita.estado != "SOLICITA_CANCELACION":
        return JsonResponse({"detail": "La cita no tiene cancelación pendiente."}, status=400)
    cita.estado = "PROGRAMADA"
    cita.save(update_fields=["estado"])
    return JsonResponse({"cita": _cita_dict(cita)})
