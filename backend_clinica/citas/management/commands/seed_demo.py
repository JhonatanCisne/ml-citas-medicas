from datetime import date, time, timedelta

from django.core.management.base import BaseCommand

from django.utils import timezone

from citas.models import Administrador, AgendaMedica, Cita, Especialidad, Medico, Paciente, Sede


class Command(BaseCommand):
    help = "Inserta datos demo sin cambiar la estructura de la base."

    def handle(self, *args, **options):
        paciente, _ = Paciente.objects.update_or_create(
            correo="paciente@clinica.com",
            defaults={
                "nombres": "Juan",
                "apellidos": "Pérez",
                "dni": "70000001",
                "telefono": "999111222",
                "direccion": "Av. Salud 123",
                "fecha_nacimiento": date(1993, 5, 18),
                "estado": "ACTIVO",
            },
        )
        sede, _ = Sede.objects.update_or_create(
            nombre="Sede Central",
            defaults={"direccion": "Av. Clínica 100", "telefono": "5116000", "estado": "ACTIVA"},
        )
        cardiologia, _ = Especialidad.objects.update_or_create(
            nombre="Cardiología",
            defaults={"descripcion": "Prevención, diagnóstico y tratamiento cardiovascular.", "estado": "ACTIVA"},
        )
        neurologia, _ = Especialidad.objects.update_or_create(
            nombre="Neurología",
            defaults={"descripcion": "Atención de trastornos del sistema nervioso.", "estado": "ACTIVA"},
        )
        general, _ = Especialidad.objects.update_or_create(
            nombre="Medicina General",
            defaults={"descripcion": "Atención primaria y control general de salud.", "estado": "ACTIVA"},
        )
        medico, _ = Medico.objects.update_or_create(
            correo="medico@clinica.com",
            defaults={
                "id_especialidad": cardiologia,
                "id_sede": sede,
                "nombres": "Alejandro",
                "apellidos": "Mendoza",
                "cmp": "CMP0001",
                "telefono": "988777666",
                "estado": "ACTIVO",
            },
        )
        Medico.objects.update_or_create(
            correo="neuro@clinica.com",
            defaults={
                "id_especialidad": neurologia,
                "id_sede": sede,
                "nombres": "Beatriz",
                "apellidos": "Silva",
                "cmp": "CMP0002",
                "telefono": "977666555",
                "estado": "ACTIVO",
            },
        )
        Medico.objects.update_or_create(
            correo="general@clinica.com",
            defaults={
                "id_especialidad": general,
                "id_sede": sede,
                "nombres": "Mateo",
                "apellidos": "Salazar",
                "cmp": "CMP0003",
                "telefono": "966555444",
                "estado": "ACTIVO",
            },
        )
        Administrador.objects.update_or_create(
            correo="admin@clinica.com",
            defaults={"nombres": "Administrador", "usuario": "admin", "contrasena": "Admin123"},
        )

        start = date.today()
        doctors = list(Medico.objects.filter(correo__in=["medico@clinica.com", "neuro@clinica.com", "general@clinica.com"]))
        slots = [(time(9, 0), time(9, 30)), (time(10, 0), time(10, 30)), (time(11, 30), time(12, 0)), (time(15, 0), time(15, 30))]
        medico_demo_slots = [
            (time(8, 0), time(8, 30)),
            (time(8, 30), time(9, 0)),
            (time(16, 0), time(16, 30)),
            (time(16, 30), time(17, 0)),
            (time(17, 0), time(17, 30)),
            (time(17, 30), time(18, 0)),
        ]
        for offset in range(1, 15):
            day = start + timedelta(days=offset)
            for doctor in doctors:
                for begin, end in slots:
                    agenda, _ = AgendaMedica.objects.get_or_create(
                        id_medico=doctor,
                        fecha=day,
                        hora_inicio=begin,
                        hora_fin=end,
                        defaults={"tipo_turno": "REGULAR", "estado": "DISPONIBLE"},
                    )
                    if not Cita.objects.filter(id_agenda=agenda).exists() and agenda.estado != "DISPONIBLE":
                        agenda.estado = "DISPONIBLE"
                        agenda.save(update_fields=["estado"])

        for offset in range(1, 31):
            day = start + timedelta(days=offset)
            for begin, end in medico_demo_slots:
                agenda, _ = AgendaMedica.objects.get_or_create(
                    id_medico=medico,
                    fecha=day,
                    hora_inicio=begin,
                    hora_fin=end,
                    defaults={"tipo_turno": "REGULAR", "estado": "DISPONIBLE"},
                )
                if not Cita.objects.filter(id_agenda=agenda).exists() and agenda.estado != "DISPONIBLE":
                    agenda.estado = "DISPONIBLE"
                    agenda.save(update_fields=["estado"])

        agenda_demo = (
            AgendaMedica.objects.filter(id_medico=medico, estado="DISPONIBLE")
            .order_by("fecha", "hora_inicio")
            .first()
        )
        if agenda_demo:
            cita, created = Cita.objects.get_or_create(
                id_paciente=paciente,
                id_medico=medico,
                id_agenda=agenda_demo,
                defaults={
                    "fecha": agenda_demo.fecha,
                    "hora_inicio": agenda_demo.hora_inicio,
                    "hora_fin": agenda_demo.hora_fin,
                    "fecha_registro": timezone.now(),
                    "duracion_minutos": 30,
                    "modalidad": "PRESENCIAL",
                    "estado": "PROGRAMADA",
                    "motivo_consulta": "Control cardiológico demo",
                },
            )
            if created:
                agenda_demo.estado = "OCUPADA"
                agenda_demo.save(update_fields=["estado"])

        self.stdout.write(self.style.SUCCESS(f"Datos demo listos. Paciente base: {paciente.correo}. Médico base: {medico.correo}."))
