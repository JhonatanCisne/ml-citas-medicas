from django.db import models


class Paciente(models.Model):
    id_paciente = models.AutoField(primary_key=True)
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    dni = models.CharField(max_length=20, unique=True)
    correo = models.CharField(max_length=100, unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    direccion = models.CharField(max_length=150, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    estado = models.CharField(max_length=20, default="ACTIVO")
    contrasena = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = "paciente"


class Especialidad(models.Model):
    id_especialidad = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.CharField(max_length=255, blank=True, null=True)
    estado = models.CharField(max_length=20, default="ACTIVA")

    class Meta:
        managed = False
        db_table = "especialidad"


class Sede(models.Model):
    id_sede = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=150)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    estado = models.CharField(max_length=20, default="ACTIVA")

    class Meta:
        managed = False
        db_table = "sede"


class Medico(models.Model):
    id_medico = models.AutoField(primary_key=True)
    id_especialidad = models.ForeignKey(Especialidad, models.DO_NOTHING, db_column="id_especialidad")
    id_sede = models.ForeignKey(Sede, models.DO_NOTHING, db_column="id_sede")
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    cmp = models.CharField(max_length=20, unique=True)
    correo = models.CharField(max_length=100, unique=True)
    telefono = models.CharField(max_length=20, blank=True, null=True)
    estado = models.CharField(max_length=20, default="ACTIVO")
    contrasena = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = "medico"


class AgendaMedica(models.Model):
    id_agenda = models.AutoField(primary_key=True)
    id_medico = models.ForeignKey(Medico, models.DO_NOTHING, db_column="id_medico")
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    tipo_turno = models.CharField(max_length=30, default="REGULAR")
    estado = models.CharField(max_length=20, default="DISPONIBLE")

    class Meta:
        managed = False
        db_table = "agenda_medica"


class Cita(models.Model):
    id_cita = models.AutoField(primary_key=True)
    id_paciente = models.ForeignKey(Paciente, models.DO_NOTHING, db_column="id_paciente")
    id_medico = models.ForeignKey(Medico, models.DO_NOTHING, db_column="id_medico")
    id_agenda = models.ForeignKey(AgendaMedica, models.DO_NOTHING, db_column="id_agenda")
    fecha = models.DateField()
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    fecha_registro = models.DateTimeField()
    duracion_minutos = models.IntegerField()
    modalidad = models.CharField(max_length=20)
    estado = models.CharField(max_length=20, default="PROGRAMADA")
    motivo_consulta = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "cita"


class HistorialMedico(models.Model):
    id_historial = models.AutoField(primary_key=True)
    id_paciente = models.OneToOneField(Paciente, models.DO_NOTHING, db_column="id_paciente")
    fecha_creacion = models.DateTimeField()
    estado = models.CharField(max_length=20, default="ACTIVO")

    class Meta:
        managed = False
        db_table = "historial_medico"


class ConsultaMedica(models.Model):
    id_consulta = models.AutoField(primary_key=True)
    id_cita = models.OneToOneField(Cita, models.DO_NOTHING, db_column="id_cita")
    id_historial = models.ForeignKey(HistorialMedico, models.DO_NOTHING, db_column="id_historial")
    fecha_atencion = models.DateTimeField()
    diagnostico = models.TextField(blank=True, null=True)
    observaciones = models.TextField(blank=True, null=True)
    tratamiento = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "consulta_medica"


class Notificacion(models.Model):
    id_notificacion = models.AutoField(primary_key=True)
    id_paciente = models.ForeignKey(Paciente, models.DO_NOTHING, db_column="id_paciente")
    id_cita = models.ForeignKey(Cita, models.DO_NOTHING, db_column="id_cita")
    mensaje = models.CharField(max_length=255)
    tipo = models.CharField(max_length=50)
    canal = models.CharField(max_length=30)
    fecha_envio = models.DateTimeField()
    estado = models.CharField(max_length=20)

    class Meta:
        managed = False
        db_table = "notificacion"


class SolicitudDisponibilidad(models.Model):
    id_solicitud = models.AutoField(primary_key=True)
    id_medico = models.ForeignKey(Medico, models.DO_NOTHING, db_column="id_medico")
    tipo = models.CharField(max_length=20)  # BLOQUEO, APERTURA, VACACIONES, DESCANSO
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    hora_inicio = models.TimeField(blank=True, null=True)
    hora_fin = models.TimeField(blank=True, null=True)
    motivo = models.CharField(max_length=255)
    estado = models.CharField(max_length=20, default="PENDIENTE")  # PENDIENTE, APROBADA, RECHAZADA, CANCELADA
    fecha_solicitud = models.DateTimeField()
    fecha_resolucion = models.DateTimeField(blank=True, null=True)
    comentario_admin = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "solicitud_disponibilidad"


class Administrador(models.Model):
    id_administrador = models.AutoField(primary_key=True)
    nombres = models.CharField(max_length=100)
    correo = models.CharField(max_length=100, unique=True)
    usuario = models.CharField(max_length=50, unique=True)
    contrasena = models.CharField(max_length=255)

    class Meta:
        managed = False
        db_table = "administrador"
