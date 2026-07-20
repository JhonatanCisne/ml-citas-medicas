import csv
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path

import jwt
from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    Administrador,
    AgendaMedica,
    Cita,
    Especialidad,
    Medico,
    Notificacion,
    Paciente,
    PlantillaHorario,
    Sede,
    SolicitudDisponibilidad,
)

TIPOS_SOLICITUD_DISPONIBILIDAD = {"BLOQUEO", "APERTURA", "VACACIONES", "DESCANSO"}


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


def _cita_dict(cita, contactado=None, motivo_cancelacion=None, fecha_solicitud_cancelacion=None):
    medico = cita.id_medico
    paciente = cita.id_paciente
    especialidad = medico.id_especialidad
    sede = medico.id_sede
    data = {
        "id": cita.id_cita,
        "paciente_id": paciente.id_paciente,
        "paciente": _full_name(paciente),
        "paciente_email": paciente.correo,
        "medico_id": medico.id_medico,
        "medico": _full_name(medico),
        "medico_email": medico.correo,
        "especialidad": especialidad.nombre,
        "especialidad_id": especialidad.id_especialidad,
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
    if contactado is not None:
        data["contactado"] = contactado
    if motivo_cancelacion is not None:
        data["motivo_cancelacion"] = motivo_cancelacion
    if fecha_solicitud_cancelacion is not None:
        data["fecha_solicitud_cancelacion"] = fecha_solicitud_cancelacion.isoformat() if fecha_solicitud_cancelacion else None
    return data


def _estado_agenda_para_cita(estado_cita):
    return "DISPONIBLE" if estado_cita == "CANCELADA" else "OCUPADA"


def _solicitud_dict(solicitud):
    return {
        "id": solicitud.id_solicitud,
        "medico_id": solicitud.id_medico_id,
        "medico": _full_name(solicitud.id_medico),
        "tipo": solicitud.tipo,
        "fecha_inicio": solicitud.fecha_inicio.isoformat(),
        "fecha_fin": solicitud.fecha_fin.isoformat(),
        "hora_inicio": _time(solicitud.hora_inicio) if solicitud.hora_inicio else None,
        "hora_fin": _time(solicitud.hora_fin) if solicitud.hora_fin else None,
        "motivo": solicitud.motivo,
        "estado": solicitud.estado,
        "fecha_solicitud": solicitud.fecha_solicitud.isoformat(),
        "fecha_resolucion": solicitud.fecha_resolucion.isoformat() if solicitud.fecha_resolucion else None,
        "comentario_admin": solicitud.comentario_admin,
    }


@require_http_methods(["GET"])
def health(_request):
    return JsonResponse({"ok": True, "service": "clinica-api"})


@csrf_exempt
@require_http_methods(["POST"])
def login(request):
    data = _body(request)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = None
    try:
        obj = Paciente.objects.get(correo__iexact=email, estado="ACTIVO")
        if password == obj.contrasena:
            user = {"id": obj.id_paciente, "role": "paciente", "email": obj.correo, "name": _full_name(obj)}
    except Paciente.DoesNotExist:
        pass

    if user is None:
        try:
            obj = Medico.objects.get(correo__iexact=email, estado="ACTIVO")
            if password == obj.contrasena:
                user = {"id": obj.id_medico, "role": "medico", "email": obj.correo, "name": _full_name(obj)}
        except Medico.DoesNotExist:
            pass

    if user is None:
        try:
            obj = Administrador.objects.get(correo__iexact=email)
            if password == obj.contrasena:
                user = {"id": obj.id_administrador, "role": "admin", "email": obj.correo, "name": obj.nombres}
        except Administrador.DoesNotExist:
            pass

    if user is None:
        return JsonResponse({"detail": "Credenciales inválidas."}, status=400)

    return JsonResponse({"token": _token_for(user), "user": user})


@csrf_exempt
@require_http_methods(["POST"])
def registrar_paciente(request):
    data = _body(request)
    nombres = (data.get("nombres") or "").strip()
    apellidos = (data.get("apellidos") or "").strip()
    dni = (data.get("dni") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    telefono = (data.get("telefono") or "").strip()
    direccion = (data.get("direccion") or "").strip()
    fecha_nacimiento = (data.get("fecha_nacimiento") or "").strip()
    password = data.get("password") or ""

    errores = {}
    if not nombres:
        errores["nombres"] = "Campo obligatorio."
    if not apellidos:
        errores["apellidos"] = "Campo obligatorio."
    if not dni:
        errores["dni"] = "Campo obligatorio."
    elif not (dni.isdigit() and len(dni) == 8):
        errores["dni"] = "El DNI debe tener 8 dígitos."
    elif Paciente.objects.filter(dni=dni).exists():
        errores["dni"] = "Ya existe una cuenta registrada con este DNI."
    if not correo or "@" not in correo:
        errores["correo"] = "Correo inválido."
    elif Paciente.objects.filter(correo__iexact=correo).exists():
        errores["correo"] = "Ya existe una cuenta registrada con este correo."
    if len(password) < 6:
        errores["password"] = "La contraseña debe tener al menos 6 caracteres."

    fecha_nacimiento_val = None
    if fecha_nacimiento:
        try:
            fecha_nacimiento_val = date.fromisoformat(fecha_nacimiento)
        except ValueError:
            errores["fecha_nacimiento"] = "Fecha inválida."

    if errores:
        return JsonResponse({"detail": "Revise los datos ingresados.", "errores": errores}, status=400)

    paciente = Paciente.objects.create(
        nombres=nombres,
        apellidos=apellidos,
        dni=dni,
        correo=correo,
        telefono=telefono or None,
        direccion=direccion or None,
        fecha_nacimiento=fecha_nacimiento_val,
        estado="ACTIVO",
        contrasena=password,
    )
    user = {"id": paciente.id_paciente, "role": "paciente", "email": paciente.correo, "name": _full_name(paciente)}
    return JsonResponse({"token": _token_for(user), "user": user}, status=201)


@require_http_methods(["GET"])
@_auth_required
def me(request):
    user = request.user_payload
    return JsonResponse({"user": {"id": int(user["sub"]), "role": user["role"], "email": user["email"], "name": user["name"]}})


HORIZONTE_EXTENSION_DIAS = 90
MINIMO_DIAS_RESTANTES = 30


def _extender_horarios_desde_plantillas():
    """Mantiene una ventana móvil de horarios DISPONIBLES a partir de la plantilla
    semanal de cada médico, para que nunca se agoten a medida que avanza el calendario."""
    hoy = date.today()
    limite = hoy + timedelta(days=HORIZONTE_EXTENSION_DIAS)
    medico_ids = PlantillaHorario.objects.values_list("id_medico_id", flat=True).distinct()

    for medico_id in medico_ids:
        ultima = (
            AgendaMedica.objects.filter(id_medico_id=medico_id, estado="DISPONIBLE", fecha__gte=hoy)
            .order_by("-fecha")
            .values_list("fecha", flat=True)
            .first()
        )
        if ultima and (ultima - hoy).days >= MINIMO_DIAS_RESTANTES:
            continue

        bloques = list(PlantillaHorario.objects.filter(id_medico_id=medico_id))
        if not bloques:
            continue
        bloques_por_dia = {}
        for b in bloques:
            bloques_por_dia.setdefault(b.dia_semana, []).append(b)

        desde = (ultima + timedelta(days=1)) if ultima else hoy
        if desde > limite:
            continue

        nuevos = []
        dia = desde
        while dia <= limite:
            for b in bloques_por_dia.get(dia.weekday(), []):
                for inicio, fin in _slots_de_bloque(dia, b.hora_inicio, b.hora_fin, 30):
                    nuevos.append((dia, inicio, fin, b.tipo_turno))
            dia += timedelta(days=1)
        if not nuevos:
            continue

        existentes = set(
            AgendaMedica.objects.filter(id_medico_id=medico_id, fecha__gte=desde, fecha__lte=limite).values_list(
                "fecha", "hora_inicio"
            )
        )
        objetos = [
            AgendaMedica(id_medico_id=medico_id, fecha=d, hora_inicio=i, hora_fin=f, tipo_turno=t, estado="DISPONIBLE")
            for d, i, f, t in nuevos
            if (d, i) not in existentes
        ]
        if objetos:
            AgendaMedica.objects.bulk_create(objetos, batch_size=500)


@require_http_methods(["GET"])
@_auth_required
def catalogo(_request):
    _extender_horarios_desde_plantillas()
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
        .filter(estado="DISPONIBLE", fecha__gte=date.today())
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
    sedes = [
        {"id": sede.id_sede, "nombre": sede.nombre, "direccion": sede.direccion}
        for sede in Sede.objects.filter(estado="ACTIVA").order_by("nombre")
    ]
    return JsonResponse({"especialidades": especialidades, "medicos": medicos, "agendas": agendas, "sedes": sedes})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def crear_medico(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede crear médicos."}, status=403)

    data = _body(request)
    nombres = (data.get("nombres") or "").strip()
    apellidos = (data.get("apellidos") or "").strip()
    cmp = (data.get("cmp") or "").strip()
    correo = (data.get("correo") or "").strip().lower()
    telefono = (data.get("telefono") or "").strip()
    especialidad_id = data.get("especialidad_id")
    sede_id = data.get("sede_id")
    password = data.get("password") or ""

    errores = {}
    if not nombres:
        errores["nombres"] = "Campo obligatorio."
    if not apellidos:
        errores["apellidos"] = "Campo obligatorio."
    if not cmp:
        errores["cmp"] = "Campo obligatorio."
    elif Medico.objects.filter(cmp=cmp).exists():
        errores["cmp"] = "Ya existe un médico registrado con este CMP."
    if not correo or "@" not in correo:
        errores["correo"] = "Correo inválido."
    elif Medico.objects.filter(correo__iexact=correo).exists():
        errores["correo"] = "Ya existe un médico registrado con este correo."
    if len(password) < 6:
        errores["password"] = "La contraseña debe tener al menos 6 caracteres."

    especialidad = Especialidad.objects.filter(id_especialidad=especialidad_id).first() if especialidad_id else None
    if not especialidad_id:
        errores["especialidad_id"] = "Seleccione una especialidad."
    elif not especialidad:
        errores["especialidad_id"] = "Especialidad no encontrada."

    sede = Sede.objects.filter(id_sede=sede_id).first() if sede_id else None
    if not sede_id:
        errores["sede_id"] = "Seleccione una sede."
    elif not sede:
        errores["sede_id"] = "Sede no encontrada."

    if errores:
        return JsonResponse({"detail": "Revise los datos ingresados.", "errores": errores}, status=400)

    medico = Medico.objects.create(
        id_especialidad=especialidad,
        id_sede=sede,
        nombres=nombres,
        apellidos=apellidos,
        cmp=cmp,
        correo=correo,
        telefono=telefono or None,
        estado="ACTIVO",
        contrasena=password,
    )
    return JsonResponse(
        {
            "medico": {
                "id": medico.id_medico,
                "nombre": _full_name(medico),
                "correo": medico.correo,
                "cmp": medico.cmp,
                "especialidad_id": especialidad.id_especialidad,
                "especialidad": especialidad.nombre,
                "sede": sede.nombre,
            }
        },
        status=201,
    )


DIAS_SEMANA_VALIDOS = {0, 1, 2, 3, 4, 5, 6}
TIPOS_TURNO_VALIDOS = {"REGULAR", "AFTER_OFFICE"}


def _horario_dict(agenda):
    return {
        "id": agenda.id_agenda,
        "medico_id": agenda.id_medico_id,
        "medico": _full_name(agenda.id_medico),
        "fecha": agenda.fecha.isoformat(),
        "hora_inicio": _time(agenda.hora_inicio),
        "hora_fin": _time(agenda.hora_fin),
        "tipo_turno": agenda.tipo_turno,
        "estado": agenda.estado,
    }


def _plantilla_dict(bloque):
    return {
        "id": bloque.id_plantilla,
        "medico_id": bloque.id_medico_id,
        "dia_semana": bloque.dia_semana,
        "hora_inicio": _time(bloque.hora_inicio),
        "hora_fin": _time(bloque.hora_fin),
        "tipo_turno": bloque.tipo_turno,
    }


def _slots_de_bloque(dia, hora_inicio, hora_fin, duracion_minutos):
    cursor = datetime.combine(dia, hora_inicio)
    fin_bloque = datetime.combine(dia, hora_fin)
    paso = timedelta(minutes=duracion_minutos)
    slots = []
    while cursor + paso <= fin_bloque:
        slots.append((cursor.time(), (cursor + paso).time()))
        cursor += paso
    return slots


@require_http_methods(["GET"])
@_auth_required
def horarios_medico(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    medico_id = request.GET.get("medico_id")
    if not medico_id:
        return JsonResponse({"detail": "Indique medico_id."}, status=400)

    qs = AgendaMedica.objects.select_related("id_medico").filter(id_medico_id=medico_id)

    fecha_desde = request.GET.get("fecha_desde")
    fecha_hasta = request.GET.get("fecha_hasta")
    if fecha_desde:
        qs = qs.filter(fecha__gte=fecha_desde)
    if fecha_hasta:
        qs = qs.filter(fecha__lte=fecha_hasta)

    qs = qs.order_by("fecha", "hora_inicio")[:500]
    return JsonResponse({"horarios": [_horario_dict(a) for a in qs]})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def crear_horarios(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede designar horarios."}, status=403)

    data = _body(request)
    medico_id = data.get("medico_id")
    fecha_inicio_raw = (data.get("fecha_inicio") or "").strip()
    fecha_fin_raw = (data.get("fecha_fin") or fecha_inicio_raw).strip()
    hora_inicio_raw = (data.get("hora_inicio") or "").strip()
    hora_fin_raw = (data.get("hora_fin") or "").strip()
    duracion_minutos = data.get("duracion_minutos") or 30
    tipo_turno = (data.get("tipo_turno") or "REGULAR").strip().upper()
    dias_semana = data.get("dias_semana")

    errores = {}
    medico = Medico.objects.filter(id_medico=medico_id).first() if medico_id else None
    if not medico_id:
        errores["medico_id"] = "Seleccione un médico."
    elif not medico:
        errores["medico_id"] = "Médico no encontrado."

    try:
        fecha_inicio = date.fromisoformat(fecha_inicio_raw)
    except ValueError:
        fecha_inicio = None
        errores["fecha_inicio"] = "Fecha inválida."

    try:
        fecha_fin = date.fromisoformat(fecha_fin_raw)
    except ValueError:
        fecha_fin = None
        errores["fecha_fin"] = "Fecha inválida."

    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        errores["fecha_fin"] = "Debe ser igual o posterior a la fecha de inicio."
    if fecha_inicio and fecha_fin and (fecha_fin - fecha_inicio).days > 90:
        errores["fecha_fin"] = "El rango no puede superar 90 días."

    try:
        hora_inicio = time.fromisoformat(hora_inicio_raw)
    except ValueError:
        hora_inicio = None
        errores["hora_inicio"] = "Hora inválida."

    try:
        hora_fin = time.fromisoformat(hora_fin_raw)
    except ValueError:
        hora_fin = None
        errores["hora_fin"] = "Hora inválida."

    if hora_inicio and hora_fin and hora_fin <= hora_inicio:
        errores["hora_fin"] = "Debe ser posterior a la hora de inicio."

    try:
        duracion_minutos = int(duracion_minutos)
        if duracion_minutos <= 0 or duracion_minutos > 240:
            raise ValueError
    except (TypeError, ValueError):
        errores["duracion_minutos"] = "Duración inválida (1 a 240 minutos)."

    if tipo_turno not in TIPOS_TURNO_VALIDOS:
        errores["tipo_turno"] = "Tipo de turno inválido."

    if dias_semana is not None:
        try:
            dias_semana = {int(d) for d in dias_semana}
            if not dias_semana or not dias_semana.issubset(DIAS_SEMANA_VALIDOS):
                raise ValueError
        except (TypeError, ValueError):
            errores["dias_semana"] = "Días de la semana inválidos."

    if errores:
        return JsonResponse({"detail": "Revise los datos ingresados.", "errores": errores}, status=400)

    nuevos = []
    dia = fecha_inicio
    while dia <= fecha_fin:
        if dias_semana is None or dia.weekday() in dias_semana:
            for inicio, fin in _slots_de_bloque(dia, hora_inicio, hora_fin, duracion_minutos):
                nuevos.append((dia, inicio, fin))
        dia += timedelta(days=1)

    if not nuevos:
        return JsonResponse(
            {"detail": "Revise los datos ingresados.", "errores": {"hora_fin": "El rango no genera ningún horario."}},
            status=400,
        )

    existentes = set(
        AgendaMedica.objects.filter(
            id_medico=medico,
            fecha__gte=fecha_inicio,
            fecha__lte=fecha_fin,
        ).values_list("fecha", "hora_inicio")
    )

    creados = 0
    omitidos = 0
    for dia, inicio, fin in nuevos:
        if (dia, inicio) in existentes:
            omitidos += 1
            continue
        AgendaMedica.objects.create(
            id_medico=medico,
            fecha=dia,
            hora_inicio=inicio,
            hora_fin=fin,
            tipo_turno=tipo_turno,
            estado="DISPONIBLE",
        )
        creados += 1

    return JsonResponse({"creados": creados, "omitidos_duplicados": omitidos}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def eliminar_horario(request, horario_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    agenda = AgendaMedica.objects.filter(id_agenda=horario_id).first()
    if not agenda:
        return JsonResponse({"detail": "Horario no encontrado."}, status=404)
    if agenda.estado == "OCUPADA":
        return JsonResponse({"detail": "No se puede eliminar un horario con una cita asignada."}, status=400)

    agenda.delete()
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
@_auth_required
def plantilla_horario(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    medico_id = request.GET.get("medico_id")
    if not medico_id:
        return JsonResponse({"detail": "Indique medico_id."}, status=400)

    qs = PlantillaHorario.objects.filter(id_medico_id=medico_id).order_by("dia_semana", "hora_inicio")
    return JsonResponse({"bloques": [_plantilla_dict(b) for b in qs]})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def crear_bloque_plantilla(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede editar la plantilla."}, status=403)

    data = _body(request)
    medico_id = data.get("medico_id")
    dia_semana_raw = data.get("dia_semana")
    hora_inicio_raw = (data.get("hora_inicio") or "").strip()
    hora_fin_raw = (data.get("hora_fin") or "").strip()
    tipo_turno = (data.get("tipo_turno") or "REGULAR").strip().upper()

    errores = {}
    medico = Medico.objects.filter(id_medico=medico_id).first() if medico_id else None
    if not medico_id:
        errores["medico_id"] = "Seleccione un médico."
    elif not medico:
        errores["medico_id"] = "Médico no encontrado."

    dia_semana = None
    try:
        dia_semana = int(dia_semana_raw)
        if dia_semana not in DIAS_SEMANA_VALIDOS:
            raise ValueError
    except (TypeError, ValueError):
        errores["dia_semana"] = "Día de la semana inválido."
        dia_semana = None

    try:
        hora_inicio = time.fromisoformat(hora_inicio_raw)
    except ValueError:
        hora_inicio = None
        errores["hora_inicio"] = "Hora inválida."

    try:
        hora_fin = time.fromisoformat(hora_fin_raw)
    except ValueError:
        hora_fin = None
        errores["hora_fin"] = "Hora inválida."

    if hora_inicio and hora_fin and hora_fin <= hora_inicio:
        errores["hora_fin"] = "Debe ser posterior a la hora de inicio."

    if tipo_turno not in TIPOS_TURNO_VALIDOS:
        errores["tipo_turno"] = "Tipo de turno inválido."

    if not errores and medico and dia_semana is not None and hora_inicio and hora_fin:
        solapa = PlantillaHorario.objects.filter(
            id_medico=medico, dia_semana=dia_semana, hora_inicio__lt=hora_fin, hora_fin__gt=hora_inicio
        ).first()
        if solapa:
            errores["hora_inicio"] = f"Se superpone con un bloque existente ({_time(solapa.hora_inicio)}-{_time(solapa.hora_fin)})."

    if errores:
        return JsonResponse({"detail": "Revise los datos ingresados.", "errores": errores}, status=400)

    bloque = PlantillaHorario.objects.create(
        id_medico=medico,
        dia_semana=dia_semana,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        tipo_turno=tipo_turno,
    )
    return JsonResponse({"bloque": _plantilla_dict(bloque)}, status=201)


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def eliminar_bloque_plantilla(request, bloque_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    bloque = PlantillaHorario.objects.filter(id_plantilla=bloque_id).first()
    if not bloque:
        return JsonResponse({"detail": "Bloque no encontrado."}, status=404)

    bloque.delete()
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def aplicar_plantilla(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede generar horarios."}, status=403)

    data = _body(request)
    medico_id = data.get("medico_id")
    fecha_inicio_raw = (data.get("fecha_inicio") or "").strip()
    fecha_fin_raw = (data.get("fecha_fin") or "").strip()
    duracion_minutos = data.get("duracion_minutos") or 30

    errores = {}
    medico = Medico.objects.filter(id_medico=medico_id).first() if medico_id else None
    if not medico_id:
        errores["medico_id"] = "Seleccione un médico."
    elif not medico:
        errores["medico_id"] = "Médico no encontrado."

    try:
        fecha_inicio = date.fromisoformat(fecha_inicio_raw)
    except ValueError:
        fecha_inicio = None
        errores["fecha_inicio"] = "Fecha inválida."

    try:
        fecha_fin = date.fromisoformat(fecha_fin_raw)
    except ValueError:
        fecha_fin = None
        errores["fecha_fin"] = "Fecha inválida."

    if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
        errores["fecha_fin"] = "Debe ser igual o posterior a la fecha de inicio."
    if fecha_inicio and fecha_fin and (fecha_fin - fecha_inicio).days > 180:
        errores["fecha_fin"] = "El rango no puede superar 180 días."

    try:
        duracion_minutos = int(duracion_minutos)
        if duracion_minutos <= 0 or duracion_minutos > 240:
            raise ValueError
    except (TypeError, ValueError):
        errores["duracion_minutos"] = "Duración inválida (1 a 240 minutos)."

    if errores:
        return JsonResponse({"detail": "Revise los datos ingresados.", "errores": errores}, status=400)

    bloques = list(PlantillaHorario.objects.filter(id_medico=medico))
    if not bloques:
        return JsonResponse(
            {"detail": "Este médico no tiene una plantilla semanal configurada.", "errores": {"medico_id": "Sin plantilla semanal."}},
            status=400,
        )

    bloques_por_dia = {}
    for b in bloques:
        bloques_por_dia.setdefault(b.dia_semana, []).append(b)

    nuevos = []
    dia = fecha_inicio
    while dia <= fecha_fin:
        for b in bloques_por_dia.get(dia.weekday(), []):
            for inicio, fin in _slots_de_bloque(dia, b.hora_inicio, b.hora_fin, duracion_minutos):
                nuevos.append((dia, inicio, fin, b.tipo_turno))
        dia += timedelta(days=1)

    if not nuevos:
        return JsonResponse(
            {"detail": "Revise los datos ingresados.", "errores": {"fecha_fin": "El rango no genera ningún horario con la plantilla actual."}},
            status=400,
        )

    existentes = set(
        AgendaMedica.objects.filter(
            id_medico=medico, fecha__gte=fecha_inicio, fecha__lte=fecha_fin
        ).values_list("fecha", "hora_inicio")
    )

    creados = 0
    omitidos = 0
    for dia, inicio, fin, tipo_turno in nuevos:
        if (dia, inicio) in existentes:
            omitidos += 1
            continue
        AgendaMedica.objects.create(
            id_medico=medico,
            fecha=dia,
            hora_inicio=inicio,
            hora_fin=fin,
            tipo_turno=tipo_turno,
            estado="DISPONIBLE",
        )
        creados += 1

    return JsonResponse({"creados": creados, "omitidos_duplicados": omitidos}, status=201)


# Carpeta donde el proyecto de ML (independiente, fuera de este repo) deja los
# CSV ya calculados. El backend solo los lee como archivos planos: no importa
# pandas/sklearn/xgboost ni ejecuta ningun modelo, para no acoplar ese stack
# al del backend.
RUTA_RECOMENDACIONES_ML = Path(__file__).resolve().parent.parent / "ml_recomendaciones"


def _leer_csv(ruta):
    if not ruta.exists():
        return None
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


@require_http_methods(["GET"])
@_auth_required
def recomendacion_horarios(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    filas = _leer_csv(RUTA_RECOMENDACIONES_ML / "recomendacion_horarios.csv")
    if filas is None:
        return JsonResponse({"disponible": False})

    metricas_filas = _leer_csv(RUTA_RECOMENDACIONES_ML / "metricas.csv")
    metricas = metricas_filas[0] if metricas_filas else None

    return JsonResponse(
        {
            "disponible": True,
            "generado_en": metricas["generado_en"] if metricas else None,
            "filas_entrenamiento": metricas["filas_entrenamiento"] if metricas else None,
            "metricas": metricas,
            "recomendaciones": filas,
        }
    )


ORDENAMIENTOS_CITAS = {
    "fecha": ("fecha", "hora_inicio"),
    "-fecha": ("-fecha", "-hora_inicio"),
    "estado": ("estado", "fecha", "hora_inicio"),
    "-estado": ("-estado", "fecha", "hora_inicio"),
}


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
    )

    if user["role"] == "paciente":
        qs = qs.filter(id_paciente_id=int(user["sub"]))
    elif user["role"] == "medico":
        qs = qs.filter(id_medico_id=int(user["sub"]))
    elif user["role"] == "admin":
        estados = [e for e in request.GET.get("estado", "").split(",") if e]
        if estados:
            qs = qs.filter(estado__in=estados)

        especialidad_id = request.GET.get("especialidad")
        if especialidad_id:
            qs = qs.filter(id_medico__id_especialidad_id=especialidad_id)

        fecha_desde = request.GET.get("fecha_desde")
        if fecha_desde:
            try:
                qs = qs.filter(fecha__gte=date.fromisoformat(fecha_desde))
            except ValueError:
                pass
        fecha_hasta = request.GET.get("fecha_hasta")
        if fecha_hasta:
            try:
                qs = qs.filter(fecha__lte=date.fromisoformat(fecha_hasta))
            except ValueError:
                pass

        search = request.GET.get("search", "").strip()
        if search:
            condicion = (
                Q(id_paciente__nombres__icontains=search)
                | Q(id_paciente__apellidos__icontains=search)
                | Q(id_medico__nombres__icontains=search)
                | Q(id_medico__apellidos__icontains=search)
            )
            if search.isdigit():
                condicion |= Q(id_cita=int(search))
            qs = qs.filter(condicion)

    ordering = ORDENAMIENTOS_CITAS.get(request.GET.get("ordering"), ("fecha", "hora_inicio"))
    qs = qs.order_by(*ordering)

    total = qs.count()
    if user["role"] == "admin":
        page = max(1, int(request.GET.get("page", "1") or "1"))
        page_size = max(1, min(100, int(request.GET.get("page_size", "10") or "10")))
    else:
        # Un paciente o médico ve siempre su lista completa: no tiene sentido
        # paginar "mis citas" y dejar la próxima cita fuera de la primera página.
        page = 1
        page_size = max(total, 1)
    total_pages = max(1, (total + page_size - 1) // page_size)
    if page > total_pages:
        page = total_pages
    start = (page - 1) * page_size
    end = start + page_size

    pagina = list(qs[start:end])
    if user["role"] == "admin":
        contactadas_ids = set(
            Notificacion.objects.filter(
                id_cita_id__in=[c.id_cita for c in pagina],
                tipo="CANCELACION",
                estado="CONTACTADO",
            ).values_list("id_cita_id", flat=True)
        )
        solicitudes_cancelacion = {}
        for notif in (
            Notificacion.objects.filter(id_cita_id__in=[c.id_cita for c in pagina], tipo="CANCELACION")
            .order_by("fecha_envio")
        ):
            # Si hay varias, se queda con la más reciente (el filtro por fecha_envio ascendente + sobrescritura logra esto).
            solicitudes_cancelacion[notif.id_cita_id] = (notif.mensaje, notif.fecha_envio)

        citas_data = [
            _cita_dict(
                cita,
                contactado=cita.id_cita in contactadas_ids,
                motivo_cancelacion=solicitudes_cancelacion.get(cita.id_cita, (None, None))[0],
                fecha_solicitud_cancelacion=solicitudes_cancelacion.get(cita.id_cita, (None, None))[1],
            )
            for cita in pagina
        ]
    else:
        citas_data = [_cita_dict(cita) for cita in pagina]

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


RANGOS_DASHBOARD = {"hoy": 0, "semana": 6, "mes": 29}


@require_http_methods(["GET"])
@_auth_required
def dashboard(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede ver el dashboard."}, status=403)

    today = date.today()
    rango = request.GET.get("rango", "total")
    base = Cita.objects.select_related("id_medico__id_especialidad")
    if rango in RANGOS_DASHBOARD:
        desde = today - timedelta(days=RANGOS_DASHBOARD[rango])
        base = base.filter(fecha__gte=desde, fecha__lte=today)
    else:
        rango = "total"

    estados = {row["estado"]: row["total"] for row in base.values("estado").annotate(total=Count("id_cita"))}
    especialidades = list(
        base.values("id_medico__id_especialidad__nombre")
        .annotate(total=Count("id_cita"))
        .order_by("-total")[:6]
    )

    # Independiente del rango: siempre son las citas programadas realmente
    # próximas (no depende del filtro histórico que se esté viendo).
    proximas_citas_qs = (
        Cita.objects.select_related("id_medico__id_especialidad")
        .filter(estado="PROGRAMADA", fecha__gte=today, fecha__lte=today + timedelta(days=7))
        .order_by("fecha", "hora_inicio")[:10]
    )
    proximas_citas = [
        {
            "id": cita.id_cita,
            "fecha": cita.fecha.isoformat(),
            "hora_inicio": _time(cita.hora_inicio),
            "especialidad": cita.id_medico.id_especialidad.nombre,
        }
        for cita in proximas_citas_qs
    ]

    total_citas = base.count()
    cancelaciones_pendientes = estados.get("SOLICITA_CANCELACION", 0)
    programadas = estados.get("PROGRAMADA", 0)
    asistidas = estados.get("ASISTIDA", 0) + estados.get("ATENDIDA", 0)
    canceladas = estados.get("CANCELADA", 0)
    agendas_disponibles = AgendaMedica.objects.filter(estado="DISPONIBLE").count()

    return JsonResponse(
        {
            "rango": rango,
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
            "proximas_citas": proximas_citas,
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
    motivo = data.get("motivo_consulta") or "Consulta programada"

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
    data = _body(request)
    motivo = (data.get("motivo") or "").strip()
    if not motivo:
        return JsonResponse({"detail": "Debe indicar un motivo para la cancelación."}, status=400)

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
        mensaje=motivo,
        tipo="CANCELACION",
        canal="SISTEMA",
        fecha_envio=timezone.now(),
        estado="PENDIENTE",
    )
    return JsonResponse({"cita": _cita_dict(cita)})


@require_http_methods(["GET"])
@_auth_required
def mis_notificaciones(request):
    user = request.user_payload
    if user["role"] != "paciente":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    # Se excluye tipo "CANCELACION": es el motivo que el propio paciente escribió
    # al solicitar la cancelación, no algo que deba notificársele.
    qs = (
        Notificacion.objects.filter(id_paciente_id=int(user["sub"]))
        .exclude(tipo="CANCELACION")
        .order_by("-fecha_envio")[:20]
    )
    notificaciones = [
        {
            "id": n.id_notificacion,
            "cita_id": n.id_cita_id,
            "tipo": n.tipo,
            "mensaje": n.mensaje,
            "fecha_envio": n.fecha_envio.isoformat(),
        }
        for n in qs
    ]
    return JsonResponse({"notificaciones": notificaciones})


@require_http_methods(["GET"])
@_auth_required
def paciente_detalle(request, paciente_id):
    user = request.user_payload
    if user["role"] not in ("medico", "admin"):
        return JsonResponse({"detail": "No autorizado."}, status=403)

    paciente = Paciente.objects.filter(id_paciente=paciente_id).first()
    if not paciente:
        return JsonResponse({"detail": "Paciente no encontrado."}, status=404)

    citas_qs = Cita.objects.select_related("id_medico__id_especialidad").filter(id_paciente_id=paciente_id)
    if user["role"] == "medico":
        if not citas_qs.filter(id_medico_id=int(user["sub"])).exists():
            return JsonResponse({"detail": "No autorizado para ver este paciente."}, status=403)

    historial = [
        {
            "id": cita.id_cita,
            "fecha": cita.fecha.isoformat(),
            "especialidad": cita.id_medico.id_especialidad.nombre,
            "estado": cita.estado,
        }
        for cita in citas_qs.order_by("-fecha", "-hora_inicio")[:5]
    ]

    return JsonResponse(
        {
            "paciente": {
                "id": paciente.id_paciente,
                "nombres": _full_name(paciente),
                "correo": paciente.correo,
                "telefono": paciente.telefono,
                "direccion": paciente.direccion,
            },
            "historial": historial,
        }
    )


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def retirar_cancelacion(request, cita_id):
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
    if cita.estado != "SOLICITA_CANCELACION":
        return JsonResponse({"detail": "La cita no tiene una cancelación pendiente."}, status=400)

    cita.estado = "PROGRAMADA"
    cita.save(update_fields=["estado"])
    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def aprobar_cancelacion(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede aprobar cancelaciones."}, status=403)

    data = _body(request)
    reembolso = bool(data.get("reembolso"))

    with transaction.atomic():
        cita = Cita.objects.select_for_update().select_related(
            "id_agenda", "id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede"
        ).filter(id_cita=cita_id).first()
        if not cita:
            return JsonResponse({"detail": "Cita no encontrada."}, status=404)
        if cita.estado != "SOLICITA_CANCELACION":
            return JsonResponse({"detail": "La cita no tiene cancelación pendiente."}, status=400)
        cita.estado = "CANCELADA"
        cita.save(update_fields=["estado"])
        cita.id_agenda.estado = "DISPONIBLE"
        cita.id_agenda.save(update_fields=["estado"])

        Notificacion.objects.filter(id_cita=cita, tipo="CANCELACION", estado__in=["PENDIENTE", "CONTACTADO"]).update(estado="APROBADA")
        Notificacion.objects.create(
            id_paciente=cita.id_paciente,
            id_cita=cita,
            mensaje="Su solicitud de cancelación fue aprobada." + (" Se procesará el reembolso correspondiente." if reembolso else ""),
            tipo="CANCELACION_APROBADA",
            canal="SISTEMA",
            fecha_envio=timezone.now(),
            estado="ENVIADA",
        )

    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def rechazar_cancelacion(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede rechazar cancelaciones."}, status=403)

    data = _body(request)
    comentario = (data.get("comentario") or "").strip()
    if not comentario:
        return JsonResponse({"detail": "Debe indicar el motivo del rechazo."}, status=400)

    cita = Cita.objects.select_related(
        "id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede"
    ).filter(id_cita=cita_id).first()
    if not cita:
        return JsonResponse({"detail": "Cita no encontrada."}, status=404)
    if cita.estado != "SOLICITA_CANCELACION":
        return JsonResponse({"detail": "La cita no tiene cancelación pendiente."}, status=400)
    cita.estado = "PROGRAMADA"
    cita.save(update_fields=["estado"])

    Notificacion.objects.filter(id_cita=cita, tipo="CANCELACION", estado__in=["PENDIENTE", "CONTACTADO"]).update(estado="RECHAZADA")
    Notificacion.objects.create(
        id_paciente=cita.id_paciente,
        id_cita=cita,
        mensaje=comentario,
        tipo="CANCELACION_RECHAZADA",
        canal="SISTEMA",
        fecha_envio=timezone.now(),
        estado="ENVIADA",
    )
    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def solicitar_disponibilidad(request):
    user = request.user_payload
    if user["role"] != "medico":
        return JsonResponse({"detail": "Solo un médico puede solicitar cambios de disponibilidad."}, status=403)

    data = _body(request)
    tipo = (data.get("tipo") or "").strip().upper()
    if tipo not in TIPOS_SOLICITUD_DISPONIBILIDAD:
        return JsonResponse({"detail": "Tipo de solicitud inválido."}, status=400)

    motivo = (data.get("motivo") or "").strip()
    if not motivo:
        return JsonResponse({"detail": "Debe indicar un motivo."}, status=400)

    fecha_inicio_raw = data.get("fecha_inicio")
    if not fecha_inicio_raw:
        return JsonResponse({"detail": "Debe indicar la fecha de inicio."}, status=400)
    fecha_fin_raw = data.get("fecha_fin") or fecha_inicio_raw

    try:
        fecha_inicio = date.fromisoformat(fecha_inicio_raw)
        fecha_fin = date.fromisoformat(fecha_fin_raw)
    except ValueError:
        return JsonResponse({"detail": "Fecha inválida."}, status=400)

    if fecha_fin < fecha_inicio:
        return JsonResponse({"detail": "La fecha final no puede ser anterior a la inicial."}, status=400)

    hora_inicio = hora_fin = None
    if tipo in ("BLOQUEO", "APERTURA"):
        hora_inicio_raw = data.get("hora_inicio")
        hora_fin_raw = data.get("hora_fin")
        if not hora_inicio_raw or not hora_fin_raw:
            return JsonResponse({"detail": "Debe indicar hora de inicio y fin para bloquear o abrir un horario."}, status=400)
        try:
            hora_inicio = time.fromisoformat(hora_inicio_raw)
            hora_fin = time.fromisoformat(hora_fin_raw)
        except ValueError:
            return JsonResponse({"detail": "Hora inválida."}, status=400)
        if hora_fin <= hora_inicio:
            return JsonResponse({"detail": "La hora final debe ser posterior a la hora de inicio."}, status=400)

    medico = Medico.objects.get(id_medico=int(user["sub"]))
    solicitud = SolicitudDisponibilidad.objects.create(
        id_medico=medico,
        tipo=tipo,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        motivo=motivo,
        estado="PENDIENTE",
        fecha_solicitud=timezone.now(),
    )
    return JsonResponse({"solicitud": _solicitud_dict(solicitud)}, status=201)


@require_http_methods(["GET"])
@_auth_required
def mis_solicitudes_disponibilidad(request):
    user = request.user_payload
    if user["role"] != "medico":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    qs = (
        SolicitudDisponibilidad.objects.select_related("id_medico")
        .filter(id_medico_id=int(user["sub"]))
        .order_by("-fecha_solicitud")
    )
    return JsonResponse({"solicitudes": [_solicitud_dict(s) for s in qs]})


@require_http_methods(["GET"])
@_auth_required
def solicitudes_disponibilidad(request):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    qs = SolicitudDisponibilidad.objects.select_related("id_medico").order_by("-fecha_solicitud")
    estado = request.GET.get("estado")
    if estado:
        qs = qs.filter(estado=estado)
    return JsonResponse({"solicitudes": [_solicitud_dict(s) for s in qs]})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def aprobar_disponibilidad(request, solicitud_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede aprobar solicitudes."}, status=403)

    with transaction.atomic():
        solicitud = (
            SolicitudDisponibilidad.objects.select_for_update()
            .select_related("id_medico")
            .filter(id_solicitud=solicitud_id)
            .first()
        )
        if not solicitud:
            return JsonResponse({"detail": "Solicitud no encontrada."}, status=404)
        if solicitud.estado != "PENDIENTE":
            return JsonResponse({"detail": "La solicitud ya fue resuelta."}, status=400)

        if solicitud.tipo == "APERTURA":
            existe = AgendaMedica.objects.filter(
                id_medico=solicitud.id_medico,
                fecha=solicitud.fecha_inicio,
                hora_inicio=solicitud.hora_inicio,
            ).exists()
            if not existe:
                AgendaMedica.objects.create(
                    id_medico=solicitud.id_medico,
                    fecha=solicitud.fecha_inicio,
                    hora_inicio=solicitud.hora_inicio,
                    hora_fin=solicitud.hora_fin,
                    tipo_turno="REGULAR",
                    estado="DISPONIBLE",
                )
        else:
            # BLOQUEO, VACACIONES, DESCANSO: bloquea los horarios ya disponibles
            # en el rango (no toca horarios ya ocupados por una cita existente).
            agendas = AgendaMedica.objects.filter(
                id_medico=solicitud.id_medico,
                fecha__gte=solicitud.fecha_inicio,
                fecha__lte=solicitud.fecha_fin,
                estado="DISPONIBLE",
            )
            if solicitud.tipo == "BLOQUEO" and solicitud.hora_inicio:
                agendas = agendas.filter(hora_inicio=solicitud.hora_inicio)
            agendas.update(estado="BLOQUEADO")

        solicitud.estado = "APROBADA"
        solicitud.fecha_resolucion = timezone.now()
        solicitud.save(update_fields=["estado", "fecha_resolucion"])

    return JsonResponse({"solicitud": _solicitud_dict(solicitud)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def rechazar_disponibilidad(request, solicitud_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede rechazar solicitudes."}, status=403)

    data = _body(request)
    comentario = (data.get("comentario") or "").strip()
    if not comentario:
        return JsonResponse({"detail": "Debe indicar el motivo del rechazo."}, status=400)

    solicitud = SolicitudDisponibilidad.objects.filter(id_solicitud=solicitud_id).first()
    if not solicitud:
        return JsonResponse({"detail": "Solicitud no encontrada."}, status=404)
    if solicitud.estado != "PENDIENTE":
        return JsonResponse({"detail": "La solicitud ya fue resuelta."}, status=400)

    solicitud.estado = "RECHAZADA"
    solicitud.fecha_resolucion = timezone.now()
    solicitud.comentario_admin = comentario
    solicitud.save(update_fields=["estado", "fecha_resolucion", "comentario_admin"])
    return JsonResponse({"solicitud": _solicitud_dict(solicitud)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def cancelar_solicitud_disponibilidad(request, solicitud_id):
    user = request.user_payload
    if user["role"] != "medico":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    solicitud = SolicitudDisponibilidad.objects.filter(id_solicitud=solicitud_id, id_medico_id=int(user["sub"])).first()
    if not solicitud:
        return JsonResponse({"detail": "Solicitud no encontrada."}, status=404)
    if solicitud.estado != "PENDIENTE":
        return JsonResponse({"detail": "Solo se pueden cancelar solicitudes pendientes."}, status=400)

    solicitud.estado = "CANCELADA"
    solicitud.fecha_resolucion = timezone.now()
    solicitud.save(update_fields=["estado", "fecha_resolucion"])
    return JsonResponse({"solicitud": _solicitud_dict(solicitud)})


ESTADOS_CITA_VALIDOS = {"PROGRAMADA", "ATENDIDA", "CANCELADA", "REPROGRAMADA"}


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def cambiar_estado_cita(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede cambiar el estado manualmente."}, status=403)

    data = _body(request)
    nuevo_estado = (data.get("estado") or "").strip().upper()
    if nuevo_estado not in ESTADOS_CITA_VALIDOS:
        return JsonResponse({"detail": "Estado inválido."}, status=400)

    with transaction.atomic():
        cita = Cita.objects.select_for_update().select_related(
            "id_agenda", "id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede"
        ).filter(id_cita=cita_id).first()
        if not cita:
            return JsonResponse({"detail": "Cita no encontrada."}, status=404)

        cita.estado = nuevo_estado
        cita.save(update_fields=["estado"])
        if nuevo_estado == "CANCELADA" and cita.id_agenda_id:
            AgendaMedica.objects.filter(id_agenda=cita.id_agenda_id).update(estado="DISPONIBLE")

    return JsonResponse({"cita": _cita_dict(cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def reprogramar_cita(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede reprogramar citas."}, status=403)

    data = _body(request)
    nueva_agenda_id = data.get("agenda_id")
    if not nueva_agenda_id:
        return JsonResponse({"detail": "Debe indicar el nuevo horario."}, status=400)

    with transaction.atomic():
        cita = Cita.objects.select_for_update().select_related(
            "id_agenda", "id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede"
        ).filter(id_cita=cita_id).first()
        if not cita:
            return JsonResponse({"detail": "Cita no encontrada."}, status=404)
        if cita.estado not in ("PROGRAMADA", "SOLICITA_CANCELACION"):
            return JsonResponse({"detail": "Solo se pueden reprogramar citas activas."}, status=400)

        nueva_agenda = (
            AgendaMedica.objects.select_for_update()
            .select_related("id_medico")
            .filter(id_agenda=nueva_agenda_id, estado="DISPONIBLE")
            .first()
        )
        if not nueva_agenda:
            return JsonResponse({"detail": "El horario seleccionado ya no está disponible."}, status=400)

        if cita.id_agenda_id:
            AgendaMedica.objects.filter(id_agenda=cita.id_agenda_id).update(estado="DISPONIBLE")
        cita.estado = "REPROGRAMADA"
        cita.save(update_fields=["estado"])

        inicio = datetime.combine(nueva_agenda.fecha, nueva_agenda.hora_inicio)
        fin = datetime.combine(nueva_agenda.fecha, nueva_agenda.hora_fin)
        duracion = max(1, int((fin - inicio).total_seconds() / 60))

        nueva_cita = Cita.objects.create(
            id_paciente=cita.id_paciente,
            id_medico=nueva_agenda.id_medico,
            id_agenda=nueva_agenda,
            fecha=nueva_agenda.fecha,
            hora_inicio=nueva_agenda.hora_inicio,
            hora_fin=nueva_agenda.hora_fin,
            fecha_registro=timezone.now(),
            duracion_minutos=duracion,
            modalidad=cita.modalidad,
            estado="PROGRAMADA",
            motivo_consulta=cita.motivo_consulta,
        )
        nueva_agenda.estado = "OCUPADA"
        nueva_agenda.save(update_fields=["estado"])

    return JsonResponse({"cita_anterior": _cita_dict(cita), "cita_nueva": _cita_dict(nueva_cita)})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def marcar_contactado(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "No autorizado."}, status=403)

    notificacion = (
        Notificacion.objects.filter(id_cita_id=cita_id, tipo="CANCELACION").order_by("-fecha_envio").first()
    )
    if not notificacion:
        return JsonResponse({"detail": "No hay una solicitud de cancelación registrada para esta cita."}, status=404)

    notificacion.estado = "CONTACTADO"
    notificacion.save(update_fields=["estado"])
    return JsonResponse({"ok": True})


@csrf_exempt
@require_http_methods(["POST"])
@_auth_required
def anular_cita(request, cita_id):
    user = request.user_payload
    if user["role"] != "admin":
        return JsonResponse({"detail": "Solo el administrador puede anular citas."}, status=403)

    with transaction.atomic():
        cita = Cita.objects.select_for_update().select_related(
            "id_agenda", "id_paciente", "id_medico", "id_medico__id_especialidad", "id_medico__id_sede"
        ).filter(id_cita=cita_id).first()
        if not cita:
            return JsonResponse({"detail": "Cita no encontrada."}, status=404)
        if cita.estado == "ANULADA":
            return JsonResponse({"detail": "La cita ya está anulada."}, status=400)

        cita.estado = "ANULADA"
        cita.save(update_fields=["estado"])
        if cita.id_agenda_id:
            AgendaMedica.objects.filter(id_agenda=cita.id_agenda_id, estado="OCUPADA").update(estado="DISPONIBLE")

    return JsonResponse({"cita": _cita_dict(cita)})
