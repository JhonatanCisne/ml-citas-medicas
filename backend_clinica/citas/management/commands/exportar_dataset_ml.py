import csv
from collections import defaultdict
from pathlib import Path

from django.core.management.base import BaseCommand

from citas.models import Cita

DIAS_SEMANA = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]


def bucket_horario(hora):
    if hora.hour < 12:
        return "Manana"
    if hora.hour < 18:
        return "Tarde"
    return "After Office"


class Command(BaseCommand):
    help = "Exporta un CSV de demanda real (Fecha, Especialidad, PreferenciaHoraria, DiaSemana, HistoricoDemanda, Demanda) para reentrenar los modelos de ml/avance3ml con datos reales de la clinica."

    def add_arguments(self, parser):
        parser.add_argument(
            "--salida",
            default=r"C:\Users\Jhonatan\Downloads\avance3ml\avance3ml\data\dataset_citas_real.csv",
            help="Ruta del CSV de salida.",
        )

    def handle(self, *args, **options):
        salida = Path(options["salida"])
        salida.parent.mkdir(parents=True, exist_ok=True)

        qs = (
            Cita.objects.exclude(estado="ANULADA")
            .select_related("id_medico__id_especialidad")
            .values_list("fecha", "hora_inicio", "id_medico__id_especialidad__nombre")
        )

        conteos = defaultdict(int)
        for fecha, hora_inicio, especialidad in qs:
            dia_semana = DIAS_SEMANA[fecha.weekday()]
            horario = bucket_horario(hora_inicio)
            conteos[(fecha, especialidad, horario, dia_semana)] += 1

        if not conteos:
            self.stdout.write(self.style.ERROR("No hay citas en la base de datos para exportar."))
            return

        filas = sorted(conteos.items(), key=lambda item: item[0][0])

        # HistoricoDemanda: promedio movil de la Demanda observada en ocurrencias
        # anteriores de la misma combinacion (Especialidad, PreferenciaHoraria,
        # DiaSemana), calculado en orden cronologico para no usar datos futuros.
        historial_por_combo = defaultdict(list)
        registros = []
        for (fecha, especialidad, horario, dia_semana), demanda in filas:
            combo = (especialidad, horario, dia_semana)
            previos = historial_por_combo[combo]
            historico = round(sum(previos) / len(previos)) if previos else demanda
            registros.append(
                {
                    "Fecha": fecha.isoformat(),
                    "Especialidad": especialidad,
                    "PreferenciaHoraria": horario,
                    "DiaSemana": dia_semana,
                    "HistoricoDemanda": historico,
                    "Demanda": demanda,
                }
            )
            previos.append(demanda)
            if len(previos) > 8:
                previos.pop(0)

        with open(salida, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["Fecha", "Especialidad", "PreferenciaHoraria", "DiaSemana", "HistoricoDemanda", "Demanda"])
            writer.writeheader()
            writer.writerows(registros)

        self.stdout.write(self.style.SUCCESS(f"Exportadas {len(registros)} filas ({len(conteos)} combinaciones fecha/especialidad/horario) a {salida}"))
