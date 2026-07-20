import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Login from "./Login";
import { apiRequest, clearToken, getToken, setToken } from "./api";

const roleHome = { paciente: "Mis Citas", medico: "Agenda Médica", admin: "Dashboard" };

const navByRole = {
  paciente: ["Mis Citas", "Reservar Cita", "Notificaciones", "Canales de Atención"],
  medico: ["Agenda Médica", "Mi Disponibilidad", "Notificaciones"],
  admin: ["Dashboard", "Gestión de Citas", "Cancelaciones", "Disponibilidad", "Médicos", "Horarios"],
};

const estadoMeta = {
  PROGRAMADA: { label: "Programada", badge: "bg-green-50 text-green-700 border-green-200", icon: IconCheck },
  SOLICITA_CANCELACION: { label: "Solicita cancelación", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: IconClock },
  CANCELADA: { label: "Cancelada", badge: "bg-red-50 text-red-700 border-red-200", icon: IconAlert },
  ASISTIDA: { label: "Asistida", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: IconCheck },
  // Datos históricos restaurados del backup usan esta variante en vez de ASISTIDA.
  ATENDIDA: { label: "Atendida", badge: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: IconCheck },
  REPROGRAMADA: { label: "Reprogramada", badge: "bg-purple-50 text-purple-700 border-purple-200", icon: IconClock },
  // Anulación administrativa: distinta de una cancelación normal, no reversible.
  ANULADA: { label: "Anulada", badge: "bg-slate-200 text-slate-700 border-slate-300", icon: IconClose },
  // Estados de solicitudes de disponibilidad del médico.
  PENDIENTE: { label: "Pendiente", badge: "bg-amber-50 text-amber-700 border-amber-200", icon: IconClock },
  APROBADA: { label: "Aprobada", badge: "bg-green-50 text-green-700 border-green-200", icon: IconCheck },
  RECHAZADA: { label: "Rechazada", badge: "bg-red-50 text-red-700 border-red-200", icon: IconAlert },
};

// Estados que ya no están activos: se agrupan en "Historial" (colapsable).
const ESTADOS_HISTORIAL = new Set(["CANCELADA", "ASISTIDA", "ATENDIDA", "REPROGRAMADA", "ANULADA"]);

const TIPO_DISPONIBILIDAD_META = {
  BLOQUEO: { label: "Bloquear horario", icon: IconAlert },
  APERTURA: { label: "Abrir horario", icon: IconCheck },
  VACACIONES: { label: "Vacaciones", icon: IconCalendar },
  DESCANSO: { label: "Descanso", icon: IconClock },
};

const TIPOS_DISPONIBILIDAD_OPCIONES = Object.entries(TIPO_DISPONIBILIDAD_META).map(([value, meta]) => ({ value, label: meta.label }));

const TIPO_NOTIFICACION_META = {
  CANCELACION_APROBADA: { label: "Cancelación aprobada", icon: IconCheck, tone: "green" },
  CANCELACION_RECHAZADA: { label: "Cancelación rechazada", icon: IconAlert, tone: "red" },
  DISPONIBILIDAD_APROBADA: { label: "Solicitud aprobada", icon: IconCheck, tone: "green" },
  DISPONIBILIDAD_RECHAZADA: { label: "Solicitud rechazada", icon: IconAlert, tone: "red" },
};

function money(value) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function formatFecha(fecha) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function formatFechaHora(fechaHora) {
  return new Date(fechaHora).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ordenarPorFechaHora(citas) {
  return [...citas].sort((a, b) => `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`));
}

const NOMBRE_MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function diasDelMes(year, month) {
  const date = new Date(year, month, 1);
  let firstDay = date.getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= totalDays; i++) days.push(i);
  return days;
}

/* --- Iconos inline (sin dependencias externas) --- */
function IconCheck({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconClock({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconAlert({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  );
}
function IconCalendar({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconPin({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconBuilding({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function IconVideo({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
function IconHash({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 9h14M5 15h14M11 4L7 20m10-16l-4 16" />
    </svg>
  );
}
function IconChevronDown({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
function IconChevronLeft({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function IconChevronRight({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function IconMenu({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function IconClose({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconTrash({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0-.867 12.142A2 2 0 0114.138 21H9.862a2 2 0 01-1.995-1.858L7 7h10z" />
    </svg>
  );
}
function IconBell({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}
function IconInfo({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconKebab({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}
function IconSearch({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
    </svg>
  );
}
function IconArrowsSort({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h13M3 12h9m-9 5h5M17 3v14m0 0l-3-3m3 3l3-3" />
    </svg>
  );
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-500" />
      {children}
    </span>
  );
}

function EstadoBadge({ estado }) {
  const meta = estadoMeta[estado] || { label: estado.replace("_", " "), badge: "bg-slate-50 text-slate-600 border-slate-200", icon: IconAlert };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${meta.badge}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function CitaCard({ cita, actions, onVerPaciente }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {cita.especialidad}
          </span>
          <h3 className="mt-3 text-base font-extrabold text-slate-900">{cita.medico}</h3>
          {onVerPaciente ? (
            <button
              onClick={() => onVerPaciente(cita)}
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-blue-700 hover:underline"
            >
              {cita.paciente}
              <IconInfo className="h-3.5 w-3.5" />
            </button>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-500">{cita.paciente}</p>
          )}
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block font-bold text-slate-500">Fecha</span>
          <strong className="text-slate-800">{cita.fecha}</strong>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block font-bold text-slate-500">Hora</span>
          <strong className="text-slate-800">{cita.hora_inicio} - {cita.hora_fin}</strong>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
        Folio #{cita.id} · {cita.sede} · {cita.modalidad}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

/* Tarjeta dedicada al panel "Mis Citas" del paciente: 1 columna, chips con
   íconos, badge de estado con ícono y acciones según el estado de la cita. */
function CitaCardPaciente({ cita, onVerDetalle, onSolicitarCancelacion, onRetirarCancelacion }) {
  const esVirtual = cita.modalidad === "VIRTUAL";
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {cita.especialidad}
          </span>
          {/* Médico en peso extra-bold para diferenciarlo del paciente (más liviano, abajo) */}
          <h3 className="mt-3 text-base font-extrabold text-slate-900">{cita.medico}</h3>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Paciente: {cita.paciente}</p>
        </div>
        <EstadoBadge estado={cita.estado} />
      </div>

      {/* Bloque Fecha/Hora compacto en una sola fila */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
        <span className="inline-flex items-center gap-1.5">
          <IconCalendar className="h-3.5 w-3.5 text-slate-500" />
          {formatFecha(cita.fecha)}
        </span>
        <span className="text-slate-300">•</span>
        <span className="inline-flex items-center gap-1.5">
          <IconClock className="h-3.5 w-3.5 text-slate-500" />
          {cita.hora_inicio} - {cita.hora_fin}
        </span>
      </div>

      {/* Folio, sede y modalidad como chips individuales con ícono */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip icon={IconHash}>Folio #{cita.id}</Chip>
        <Chip icon={IconPin}>{cita.sede}</Chip>
        <Chip icon={esVirtual ? IconVideo : IconBuilding}>{esVirtual ? "Virtual" : "Presencial"}</Chip>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => onVerDetalle(cita)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Ver detalle
        </button>
        {cita.estado === "PROGRAMADA" && (
          <button
            onClick={() => onSolicitarCancelacion(cita)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            Solicitar cancelación
          </button>
        )}
        {cita.estado === "SOLICITA_CANCELACION" && (
          <button
            onClick={() => onRetirarCancelacion(cita)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar solicitud
          </button>
        )}
      </div>
    </article>
  );
}

function CitaCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-24 rounded bg-slate-100" />
      <div className="mt-3 h-4 w-40 rounded bg-slate-100" />
      <div className="mt-2 h-3 w-28 rounded bg-slate-100" />
      <div className="mt-4 h-8 w-full rounded bg-slate-100" />
      <div className="mt-3 flex gap-2">
        <div className="h-6 w-20 rounded bg-slate-100" />
        <div className="h-6 w-20 rounded bg-slate-100" />
        <div className="h-6 w-20 rounded bg-slate-100" />
      </div>
    </div>
  );
}

function ErrorBanner({ text, onRetry }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-center">
      <p className="text-sm font-bold text-red-700">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
          Reintentar
        </button>
      )}
    </div>
  );
}

function EmptyStateCitas({ onNueva }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600 shadow-inner">
        <IconCalendar className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800">No tienes citas médicas activas</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        Programa una nueva cita desde el asistente para agendar una hora de consulta con el especialista correspondiente.
      </p>
      <button onClick={onNueva} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700">
        Agendar Cita Ahora
      </button>
    </div>
  );
}

function DetalleCitaModal({ cita, onClose }) {
  if (!cita) return null;
  const esVirtual = cita.modalidad === "VIRTUAL";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{cita.especialidad}</span>
            <h3 className="mt-2 text-lg font-extrabold text-slate-900">Detalle de la cita</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          <EstadoBadge estado={cita.estado} />
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <Summary label="Folio" value={`#${cita.id}`} />
          <Summary label="Médico" value={`${cita.medico} · ${cita.medico_email}`} />
          <Summary label="Sede" value={cita.sede} />
          <Summary label="Modalidad" value={esVirtual ? "Virtual" : "Presencial"} />
          <Summary label="Fecha y hora" value={`${formatFecha(cita.fecha)} · ${cita.hora_inicio} - ${cita.hora_fin}`} />
          <Summary label="Motivo de consulta" value={cita.motivo_consulta || "No especificado"} />
        </div>
      </div>
    </div>
  );
}

// Modal genérico de confirmación (sí/no) para acciones como marcar
// asistencia o revertir una solicitud de cancelación.
function ConfirmModal({ title, text, confirmLabel, onCancel, onConfirm, tone = "blue" }) {
  const toneClasses = tone === "red" ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{text}</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white ${toneClasses}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para solicitar cancelación: exige un motivo antes de habilitar
// el botón de confirmar. Usado tanto por el paciente como por el médico.
function MotivoCancelacionModal({ cita, onCancel, onConfirm }) {
  const [motivo, setMotivo] = useState("");
  if (!cita) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">Solicitar cancelación</h3>
        <p className="mt-1 text-sm text-slate-500">
          Cita del <strong className="text-slate-700">{formatFecha(cita.fecha)}</strong> · {cita.hora_inicio}
        </p>
        <label className="mt-4 block text-xs font-bold text-slate-600">Motivo de la cancelación *</label>
        <textarea
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
          rows={3}
          placeholder="Explique el motivo de la cancelación..."
          autoFocus
        />
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivo.trim())}
            disabled={!motivo.trim()}
            className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar solicitud
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal compartido para que un administrador apruebe o rechace una solicitud
// de cancelación: muestra el motivo del paciente y el resumen de la cita
// antes del clic irreversible. Se reutiliza en "Cancelaciones" y "Gestión
// de Citas".
function RevisarCancelacionModal({ cita, modo, onCancel, onConfirm }) {
  const [comentario, setComentario] = useState("");
  const [reembolso, setReembolso] = useState(false);
  if (!cita) return null;
  const esAprobar = modo === "aprobar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">
          {esAprobar ? "Confirmar cancelación" : "Rechazar solicitud de cancelación"}
        </h3>

        <div className="mt-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Folio</span>
            <span className="font-bold text-slate-800">#{cita.id}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Paciente</span>
            <span className="font-bold text-slate-800">{cita.paciente}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Médico</span>
            <span className="font-bold text-slate-800">{cita.medico}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Fecha y hora</span>
            <span className="font-bold text-slate-800">{formatFecha(cita.fecha)} · {cita.hora_inicio}</span>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-700">Motivo de la solicitud</span>
          <p className="mt-1 text-sm text-amber-900">{cita.motivo_cancelacion || "El paciente no dejó un motivo registrado."}</p>
        </div>

        {esAprobar ? (
          <>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Esta acción libera el horario y notifica al paciente. No se puede deshacer.
            </p>
            <label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={reembolso} onChange={(event) => setReembolso(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Corresponde reembolso (S/ 80.00)
            </label>
          </>
        ) : (
          <>
            <label className="mt-3 block text-xs font-bold text-slate-600">Motivo del rechazo (se comunicará al paciente) *</label>
            <textarea
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
              placeholder="Explique por qué se rechaza la solicitud..."
              autoFocus
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">
              La cita volverá automáticamente al estado <strong>Programada</strong>.
            </p>
          </>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(esAprobar ? { reembolso } : { comentario: comentario.trim() })}
            disabled={!esAprobar && !comentario.trim()}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white disabled:cursor-not-allowed disabled:opacity-40 ${esAprobar ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {esAprobar ? "Confirmar cancelación" : "Rechazar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificacionCard({ notificacion, esNueva }) {
  const meta = TIPO_NOTIFICACION_META[notificacion.tipo] || { label: "Notificación", icon: IconBell, tone: "blue" };
  const Icon = meta.icon;
  const toneClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
  }[meta.tone] || "bg-blue-50 text-blue-600 border-blue-100";

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${esNueva ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${toneClasses}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-800">{meta.label}</span>
            {esNueva && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">Nuevo</span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">{notificacion.mensaje}</p>
          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{formatFechaHora(notificacion.fecha_envio)}</p>
        </div>
      </div>
    </article>
  );
}

function ProximaCitaWidget({ citas }) {
  const proxima = ordenarPorFechaHora(citas.filter((c) => c.estado === "PROGRAMADA"))[0];
  if (!proxima) return null;
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <h4 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
        <IconBell className="h-3.5 w-3.5" />
        Próxima cita
      </h4>
      <p className="mt-2 text-sm font-extrabold text-slate-900">{proxima.medico}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-blue-800">
        <IconCalendar className="h-3.5 w-3.5" />
        {formatFecha(proxima.fecha)} · {proxima.hora_inicio}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700/80">
        <IconPin className="h-3.5 w-3.5" />
        {proxima.sede}
      </p>
    </div>
  );
}

function PanelPaciente({ view, setView, user, citas, catalogo, refresh, loading, error }) {
  const [step, setStep] = useState(1);
  const [reserva, setReserva] = useState({ especialidadId: "", medicoId: "", agendaId: "", fecha: "", horaInicio: "", modalidad: "PRESENCIAL", motivo: "" });
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const [detalleCita, setDetalleCita] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [revertirModal, setRevertirModal] = useState(null);
  const [calCursor, setCalCursor] = useState(() => {
    const hoy = new Date();
    return { year: hoy.getFullYear(), month: hoy.getMonth() };
  });
  const paymentTimer = useRef(null);

  // Notificaciones (cancelación aprobada/rechazada, etc.) generadas por el
  // backend. El "visto" se guarda en el navegador comparando siempre contra
  // fecha_envio del propio backend (nunca contra Date.now() del navegador,
  // que quedaría desalineado por la zona horaria del servidor).
  const [notificaciones, setNotificaciones] = useState([]);
  const notifStorageKey = `notificaciones_visto_${user?.email || "paciente"}`;
  const [notifLastSeen, setNotifLastSeen] = useState(() => {
    try {
      return localStorage.getItem(notifStorageKey);
    } catch {
      return null;
    }
  });
  const notificacionesNuevas = notificaciones.filter((n) => !notifLastSeen || n.fecha_envio > notifLastSeen);
  const marcarNotificacionesVistas = () => {
    const maxFecha = notificaciones.reduce((max, n) => (n.fecha_envio > max ? n.fecha_envio : max), notifLastSeen || "");
    try {
      localStorage.setItem(notifStorageKey, maxFecha);
    } catch {
      // localStorage no disponible: la notificación seguirá apareciendo, sin romper la app.
    }
    setNotifLastSeen(maxFecha);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/notificaciones/mias/");
        setNotificaciones(data.notificaciones);
      } catch {
        // Silencioso: las notificaciones son un complemento, no deben bloquear "Mis Citas" si fallan.
      }
    })();
  }, []);

  const selectedEsp = catalogo.especialidades.find((e) => String(e.id) === String(reserva.especialidadId));
  const selectedDoctor = catalogo.medicos.find((m) => String(m.id) === String(reserva.medicoId));

  // Médicos de la especialidad elegida y sus horarios disponibles, para
  // poder elegir primero fecha/hora y recién luego filtrar médicos por esa
  // disponibilidad exacta (en vez de mostrar médico y luego sus +20 slots).
  const especialidadMedicoIds = useMemo(
    () => new Set(catalogo.medicos.filter((m) => String(m.especialidad_id) === String(reserva.especialidadId)).map((m) => m.id)),
    [catalogo.medicos, reserva.especialidadId]
  );
  const agendasEspecialidad = useMemo(
    () => catalogo.agendas.filter((a) => especialidadMedicoIds.has(a.medico_id)),
    [catalogo.agendas, especialidadMedicoIds]
  );
  const horariosPorFecha = useMemo(() => {
    const map = new Map();
    for (const agenda of agendasEspecialidad) {
      if (!map.has(agenda.fecha)) map.set(agenda.fecha, new Map());
      map.get(agenda.fecha).set(agenda.hora_inicio, agenda.hora_fin);
    }
    return map;
  }, [agendasEspecialidad]);
  const fechasDisponibles = useMemo(() => new Set(horariosPorFecha.keys()), [horariosPorFecha]);
  const medicosDisponiblesHorario = useMemo(() => {
    if (!reserva.fecha || !reserva.horaInicio) return [];
    return agendasEspecialidad
      .filter((a) => a.fecha === reserva.fecha && a.hora_inicio === reserva.horaInicio)
      .map((a) => ({ agendaId: a.id, medico: catalogo.medicos.find((m) => String(m.id) === String(a.medico_id)) }))
      .filter((item) => item.medico);
  }, [agendasEspecialidad, reserva.fecha, reserva.horaInicio, catalogo.medicos]);

  // Al elegir especialidad, ubicar el calendario en el mes del primer día con disponibilidad.
  const elegirEspecialidad = (espId) => {
    const medicoIds = new Set(catalogo.medicos.filter((m) => String(m.especialidad_id) === String(espId)).map((m) => m.id));
    const fechas = catalogo.agendas.filter((a) => medicoIds.has(a.medico_id)).map((a) => a.fecha).sort();
    if (fechas.length > 0) {
      const [y, m] = fechas[0].split("-").map(Number);
      setCalCursor({ year: y, month: m - 1 });
    }
    setReserva({ ...reserva, especialidadId: espId, medicoId: "", agendaId: "", fecha: "", horaInicio: "" });
    setStep(2);
  };

  const reset = () => {
    setStep(1);
    setReserva({ especialidadId: "", medicoId: "", agendaId: "", fecha: "", horaInicio: "", modalidad: "PRESENCIAL", motivo: "" });
    setMessage("");
    setShowConfirmModal(false);
  };

  const confirmarSolicitarCancelacion = async (motivo) => {
    const cita = cancelModal;
    setCancelModal(null);
    await apiRequest(`/citas/${cita.id}/solicitar-cancelacion/`, { method: "POST", body: JSON.stringify({ motivo }) });
    await refresh();
  };

  const confirmarRetirarCancelacion = async () => {
    const cita = revertirModal;
    setRevertirModal(null);
    await apiRequest(`/citas/${cita.id}/retirar-cancelacion/`, { method: "POST" });
    await refresh();
  };

  const confirmarPago = async () => {
    setPaying(true);
    setMessage("");
    paymentTimer.current = window.setTimeout(async () => {
      try {
        await apiRequest("/citas/crear/", {
          method: "POST",
          body: JSON.stringify({
            agenda_id: reserva.agendaId,
            modalidad: reserva.modalidad,
            motivo_consulta: reserva.motivo || "Consulta programada",
          }),
        });
        await refresh();
        setStep(5);
      } catch (err) {
        setMessage(err.message);
      } finally {
        setPaying(false);
      }
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (paymentTimer.current) {
        window.clearTimeout(paymentTimer.current);
      }
    };
  }, []);

  if (view === "Mis Citas") {
    const ordenadas = ordenarPorFechaHora(citas);
    const programadas = ordenadas.filter((c) => c.estado === "PROGRAMADA");
    const pendientesCancelacion = ordenadas.filter((c) => c.estado === "SOLICITA_CANCELACION");
    const historial = ordenadas.filter((c) => ESTADOS_HISTORIAL.has(c.estado));
    const mostrarSkeleton = loading && citas.length === 0;
    const mostrarVacio = !loading && !error && citas.length === 0;

    return (
      <section className="space-y-5">
        <Header
          title="Mis Citas Médicas"
          subtitle="Visualice y administre sus programaciones de consulta, ordenadas por fecha más próxima."
          action={<button onClick={() => { reset(); setView("Reservar Cita"); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Nueva cita</button>}
        />

        {error && <ErrorBanner text={error} onRetry={refresh} />}

        {notificacionesNuevas.length > 0 && (
          <button
            onClick={() => setView("Notificaciones")}
            className="flex w-full items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left hover:bg-blue-100"
          >
            <IconBell className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="text-xs font-bold text-blue-800">
              Tienes {notificacionesNuevas.length} notificación{notificacionesNuevas.length > 1 ? "es" : ""} nueva{notificacionesNuevas.length > 1 ? "s" : ""}
            </span>
            <span className="ml-auto text-xs font-bold text-blue-600 underline">Ver</span>
          </button>
        )}

        {mostrarSkeleton ? (
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => <CitaCardSkeleton key={i} />)}
          </div>
        ) : mostrarVacio ? (
          <EmptyStateCitas onNueva={() => { reset(); setView("Reservar Cita"); }} />
        ) : (
          <div className="space-y-6">
            {programadas.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Programadas</h3>
                <div className="grid grid-cols-1 gap-4">
                  {programadas.map((cita) => (
                    <CitaCardPaciente
                      key={cita.id}
                      cita={cita}
                      onVerDetalle={setDetalleCita}
                      onSolicitarCancelacion={setCancelModal}
                      onRetirarCancelacion={setRevertirModal}
                    />
                  ))}
                </div>
              </div>
            )}

            {pendientesCancelacion.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Solicita cancelación</h3>
                <div className="grid grid-cols-1 gap-4">
                  {pendientesCancelacion.map((cita) => (
                    <CitaCardPaciente
                      key={cita.id}
                      cita={cita}
                      onVerDetalle={setDetalleCita}
                      onSolicitarCancelacion={setCancelModal}
                      onRetirarCancelacion={setRevertirModal}
                    />
                  ))}
                </div>
              </div>
            )}

            {historial.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => setMostrarHistorial((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Historial ({historial.length})</span>
                  <IconChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${mostrarHistorial ? "rotate-180" : ""}`} />
                </button>
                {mostrarHistorial && (
                  <div className="grid grid-cols-1 gap-4">
                    {historial.map((cita) => (
                      <CitaCardPaciente
                        key={cita.id}
                        cita={cita}
                        onVerDetalle={setDetalleCita}
                        onSolicitarCancelacion={setCancelModal}
                        onRetirarCancelacion={setRevertirModal}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DetalleCitaModal cita={detalleCita} onClose={() => setDetalleCita(null)} />
        <MotivoCancelacionModal cita={cancelModal} onCancel={() => setCancelModal(null)} onConfirm={confirmarSolicitarCancelacion} />
        {revertirModal && (
          <ConfirmModal
            title="¿Revertir la solicitud de cancelación?"
            text={<>La cita del <strong>{formatFecha(revertirModal.fecha)}</strong> a las <strong>{revertirModal.hora_inicio}</strong> volverá al estado Programada.</>}
            confirmLabel="Sí, revertir"
            onCancel={() => setRevertirModal(null)}
            onConfirm={confirmarRetirarCancelacion}
          />
        )}
      </section>
    );
  }

  if (view === "Notificaciones") {
    const ordenadas = [...notificaciones].sort((a, b) => b.fecha_envio.localeCompare(a.fecha_envio));
    return (
      <section className="space-y-5">
        <Header
          title="Notificaciones"
          subtitle="Avisos sobre tus citas: cancelaciones aprobadas o rechazadas."
          action={
            notificacionesNuevas.length > 0 && (
              <button onClick={marcarNotificacionesVistas} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
                Marcar todas como vistas
              </button>
            )
          }
        />
        {ordenadas.length === 0 ? (
          <EmptyState title="Sin notificaciones" text="Aquí aparecerán los avisos sobre cambios en tus citas, como cancelaciones aprobadas o rechazadas." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {ordenadas.map((n) => (
              <NotificacionCard key={n.id} notificacion={n} esNueva={!notifLastSeen || n.fecha_envio > notifLastSeen} />
            ))}
          </div>
        )}
      </section>
    );
  }

  if (view === "Canales de Atención") {
    return (
      <section className="space-y-5">
        <Header title="Canales de Atención" subtitle="Contactos disponibles para soporte administrativo y médico." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            ["Central de citas", "(01) 511-6000", "Reprogramación y consultas administrativas."],
            ["Urgencias", "(01) 511-6111", "Atención inmediata disponible todo el día."],
            ["Telemedicina", "Sala virtual", "Ingreso a consultas online programadas."],
          ].map(([title, value, text]) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">{title}</h3>
              <p className="mt-2 text-xl font-extrabold text-blue-700">{value}</p>
              <p className="mt-2 text-sm text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const STEP_LABELS = ["Especialidad", "Fecha/Horario", "Médico", "Pago"];

  return (
    <section className="space-y-5">
      <Header title="Reservar Cita" subtitle="Seleccione disponibilidad real del backend. El pago es una simulación visual." />
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {step < 5 && (
          <div className="mb-8 border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between max-w-xl mx-auto">
              {[1, 2, 3, 4].map((s) => {
                const completada = s < step;
                const activa = s === step;
                const alcanzable = s <= step;
                return (
                  <div key={s} className="flex items-center">
                    <button
                      type="button"
                      disabled={!alcanzable}
                      onClick={() => alcanzable && setStep(s)}
                      title={STEP_LABELS[s - 1]}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-150 ${
                        activa
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-4 ring-blue-500/10"
                          : completada
                          ? "bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 cursor-pointer"
                          : "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      {completada ? <IconCheck className="w-4 h-4" /> : s}
                    </button>
                    {s < 4 && (
                      <div className={`w-12 md:w-20 h-0.5 mx-2 rounded ${step > s ? "bg-green-300" : "bg-slate-100"}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between max-w-xl mx-auto mt-2">
              {STEP_LABELS.map((label, index) => (
                <span key={label} className={`w-8 text-center text-[9px] font-bold uppercase tracking-tight ${step === index + 1 ? "text-blue-700" : "text-slate-400"}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catalogo.especialidades.map((esp) => (
              <button key={esp.id} onClick={() => elegirEspecialidad(esp.id)} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                <strong className="text-slate-900">{esp.nombre}</strong>
                <span className="mt-2 block text-sm text-slate-500">{esp.descripcion}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">
                Elija fecha y horario para <span className="text-blue-700">{selectedEsp?.nombre}</span>
              </h3>
              <BackButton onClick={() => setStep(1)} label="Cambiar especialidad" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-extrabold text-slate-800 text-sm">{NOMBRE_MESES[calCursor.month]} {calCursor.year}</h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCalCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                    >
                      <IconChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
                      className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                    >
                      <IconChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
                  <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {diasDelMes(calCursor.year, calCursor.month).map((day, idx) => {
                    if (!day) return <div key={idx} />;
                    const fechaStr = `${calCursor.year}-${String(calCursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const disponible = fechasDisponibles.has(fechaStr);
                    const seleccionado = reserva.fecha === fechaStr;
                    return (
                      <button
                        type="button"
                        key={idx}
                        disabled={!disponible}
                        onClick={() => setReserva({ ...reserva, fecha: fechaStr, horaInicio: "", medicoId: "", agendaId: "" })}
                        className={`h-10 rounded-lg text-xs font-bold transition ${
                          seleccionado
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                            : disponible
                            ? "bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100"
                            : "text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                {fechasDisponibles.size === 0 && (
                  <p className="mt-3 text-xs font-semibold text-slate-400">No hay disponibilidad para esta especialidad por ahora.</p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="font-extrabold text-slate-800 text-sm mb-3">
                  {reserva.fecha ? "Horarios disponibles" : "Seleccione un día"}
                </h4>
                {!reserva.fecha ? (
                  <p className="text-xs text-slate-400">Elija un día resaltado en el calendario para ver las franjas horarias disponibles.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[...(horariosPorFecha.get(reserva.fecha) || new Map()).keys()].sort().map((hi) => (
                      <button
                        type="button"
                        key={hi}
                        onClick={() => { setReserva({ ...reserva, horaInicio: hi, medicoId: "", agendaId: "" }); setStep(3); }}
                        className={`py-2.5 rounded-lg border text-xs font-extrabold transition ${
                          reserva.horaInicio === hi
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {hi}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Médicos disponibles</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedEsp?.nombre} · {reserva.fecha && formatFecha(reserva.fecha)} · {reserva.horaInicio}
                </p>
              </div>
              <BackButton onClick={() => setStep(2)} label="Cambiar fecha/horario" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medicosDisponiblesHorario.length === 0 ? (
                <EmptyState title="Sin médicos disponibles" text="Ningún médico tiene disponibilidad exacta en ese horario. Elija otra fecha u horario." />
              ) : medicosDisponiblesHorario.map(({ agendaId, medico }) => (
                <button
                  key={agendaId}
                  onClick={() => { setReserva({ ...reserva, medicoId: medico.id, agendaId }); setStep(4); }}
                  className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50"
                >
                  <strong className="block text-slate-900">{medico.nombre}</strong>
                  <span className="mt-1 block text-sm text-slate-500">CMP {medico.cmp} · {medico.sede}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-400">{medico.correo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-slate-800">Verifique los Datos de la Cita</h3>
              <BackButton onClick={() => setStep(3)} label="Cambiar médico" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Summary label="Paciente" value={user.name} />
                <Summary label="Especialidad" value={selectedEsp?.nombre} />
                <Summary label="Médico" value={selectedDoctor?.nombre} />
                <Summary label="Fecha y hora" value={reserva.fecha ? `${formatFecha(reserva.fecha)} · ${reserva.horaInicio}` : "-"} />
              </div>
              <textarea value={reserva.motivo} onChange={(event) => setReserva({ ...reserva, motivo: event.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" placeholder="Motivo de consulta opcional" />
            </div>

            {/* Monto resaltado: es la decisión final antes de confirmar */}
            <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 flex items-center justify-between">
              <div>
                <span className="block text-[11px] uppercase font-bold text-blue-700/70 tracking-wider">Monto a pagar</span>
                <span className="text-xs text-blue-700/70">Pago simulado</span>
              </div>
              <span className="text-3xl font-extrabold text-blue-700">{money(80)}</span>
            </div>

            {message && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => setView("Mis Citas")} className="flex-1 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition duration-150">
                Cancelar Proceso
              </button>
              <button type="button" onClick={() => setShowConfirmModal(true)} className="flex-1 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/10">
                Confirmar pago y programar cita
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="mx-auto max-w-md py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-green-50 text-green-600 border border-green-200">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="mt-5 text-2xl font-extrabold text-slate-900">Cita programada</h3>
            <p className="mt-2 text-sm text-slate-500">El pago visual fue confirmado y la cita quedó registrada en la API.</p>
            <button onClick={() => setView("Mis Citas")} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Ver mis citas</button>
          </div>
        )}
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setShowConfirmModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 border border-blue-100">
              <IconAlert className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-extrabold text-slate-900">¿Confirmar esta reserva?</h3>
            <p className="mt-2 text-sm text-slate-500">
              Se agendará la cita con <strong className="text-slate-700">{selectedDoctor?.nombre}</strong>
              {reserva.fecha && <> el <strong className="text-slate-700">{formatFecha(reserva.fecha)}</strong> a las <strong className="text-slate-700">{reserva.horaInicio}</strong></>}, por un monto de <strong className="text-blue-700">{money(80)}</strong>. Esta acción no se puede deshacer desde aquí.
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
                Cancelar
              </button>
              <button type="button" onClick={() => { setShowConfirmModal(false); confirmarPago(); }} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs">
                Sí, confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">Procesando pago</h3>
            <p className="mt-2 text-sm text-slate-500">Monto: {money(80)}. Confirmando operación.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function PacienteInfoModal({ estado, onClose }) {
  if (!estado) return null;
  const { cita, data, loading, error } = estado;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-extrabold text-slate-900">{cita.paciente}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <p className="mt-4 text-sm font-semibold text-slate-400">Cargando información del paciente...</p>
        ) : error ? (
          <p className="mt-4 text-sm font-bold text-red-600">{error}</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <Summary label="Correo" value={data.paciente.correo} />
            <Summary label="Teléfono" value={data.paciente.telefono || "No registrado"} />
            <Summary label="Dirección" value={data.paciente.direccion || "No registrada"} />
            <Summary label="Motivo de esta consulta" value={cita.motivo_consulta || "No especificado"} />
            <div>
              <span className="mb-2 block text-[11px] font-bold uppercase text-slate-400">Historial reciente</span>
              {data.historial.length === 0 ? (
                <p className="text-xs text-slate-400">Sin citas previas registradas.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.historial.map((h) => (
                    <li key={h.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="font-bold text-slate-700">{formatFecha(h.fecha)} · {h.especialidad}</span>
                      <EstadoBadge estado={h.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const HISTORIAL_PAGE_SIZE = 12;

function MiDisponibilidad({ user, setView }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ tipo: "BLOQUEO", fechaInicio: "", fechaFin: "", horaInicio: "", horaFin: "", motivo: "" });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [cancelModal, setCancelModal] = useState(null);

  // Notificación de solicitudes resueltas que el médico aún no ha revisado
  // (marcar como vistas ocurre en la sección "Notificaciones", que comparte
  // esta misma clave de localStorage).
  const storageKey = `disponibilidad_visto_${user?.email || "medico"}`;
  const [lastSeen] = useState(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });
  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/disponibilidad/mias/");
      setSolicitudes(data.solicitudes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/disponibilidad/mias/");
        setSolicitudes(data.solicitudes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resueltasNoVistas = solicitudes.filter(
    (s) => s.estado !== "PENDIENTE" && s.fecha_resolucion && (!lastSeen || s.fecha_resolucion > lastSeen)
  );

  const necesitaHoras = form.tipo === "BLOQUEO" || form.tipo === "APERTURA";
  const necesitaRango = form.tipo === "VACACIONES";

  const submit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!form.fechaInicio) {
      setFormError("Debe indicar la fecha de inicio.");
      return;
    }
    if (necesitaHoras && (!form.horaInicio || !form.horaFin)) {
      setFormError("Debe indicar hora de inicio y fin.");
      return;
    }
    if (!form.motivo.trim()) {
      setFormError("Debe indicar un motivo.");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/disponibilidad/solicitar/", {
        method: "POST",
        body: JSON.stringify({
          tipo: form.tipo,
          fecha_inicio: form.fechaInicio,
          fecha_fin: necesitaRango ? form.fechaFin || form.fechaInicio : form.fechaInicio,
          hora_inicio: necesitaHoras ? form.horaInicio : null,
          hora_fin: necesitaHoras ? form.horaFin : null,
          motivo: form.motivo.trim(),
        }),
      });
      setForm({ tipo: "BLOQUEO", fechaInicio: "", fechaFin: "", horaInicio: "", horaFin: "", motivo: "" });
      await cargar();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarCancelar = async () => {
    const solicitud = cancelModal;
    setCancelModal(null);
    try {
      await apiRequest(`/disponibilidad/${solicitud.id}/cancelar/`, { method: "POST" });
      await cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <Header
        title="Mi Disponibilidad"
        subtitle="Solicite bloquear o abrir horarios, o marcar vacaciones y descansos. Un administrador debe aprobar el cambio antes de que se aplique."
      />

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">Tipo de solicitud</label>
            <select
              value={form.tipo}
              onChange={(event) => setForm({ ...form, tipo: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {TIPOS_DISPONIBILIDAD_OPCIONES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">{necesitaRango ? "Fecha de inicio" : "Fecha"}</label>
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(event) => setForm({ ...form, fechaInicio: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>
          {necesitaRango && (
            <div>
              <label className="text-sm font-bold text-slate-700">Fecha de fin</label>
              <input
                type="date"
                value={form.fechaFin}
                onChange={(event) => setForm({ ...form, fechaFin: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          )}
          {necesitaHoras && (
            <>
              <div>
                <label className="text-sm font-bold text-slate-700">Hora de inicio</label>
                <input
                  type="time"
                  value={form.horaInicio}
                  onChange={(event) => setForm({ ...form, horaInicio: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700">Hora de fin</label>
                <input
                  type="time"
                  value={form.horaFin}
                  onChange={(event) => setForm({ ...form, horaFin: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}
        </div>
        <div>
          <label className="text-sm font-bold text-slate-700">Motivo</label>
          <textarea
            value={form.motivo}
            onChange={(event) => setForm({ ...form, motivo: event.target.value })}
            rows={3}
            placeholder="Explique el motivo de la solicitud..."
            className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
        {formError && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}
        <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Mis solicitudes</h3>
          {resueltasNoVistas.length > 0 && (
            <button
              onClick={() => setView("Notificaciones")}
              className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-left hover:bg-blue-100"
            >
              <IconBell className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[11px] font-bold text-blue-800">
                {resueltasNoVistas.length} solicitud{resueltasNoVistas.length > 1 ? "es" : ""} resuelta{resueltasNoVistas.length > 1 ? "s" : ""} sin revisar
              </span>
              <span className="text-[11px] font-bold text-blue-600 underline">Ver</span>
            </button>
          )}
        </div>
        {error && <ErrorBanner text={error} onRetry={cargar} />}
        {loading ? (
          <div className="grid grid-cols-1 gap-4">{[1, 2].map((i) => <CitaCardSkeleton key={i} />)}</div>
        ) : solicitudes.length === 0 ? (
          <EmptyState title="Sin solicitudes" text="Aún no ha enviado solicitudes de disponibilidad." />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {solicitudes.map((s) => {
              const tipoMeta = TIPO_DISPONIBILIDAD_META[s.tipo] || { label: s.tipo, icon: IconAlert };
              const TipoIcon = tipoMeta.icon;
              const esNueva = s.estado !== "PENDIENTE" && s.fecha_resolucion && (!lastSeen || s.fecha_resolucion > lastSeen);
              return (
                <article key={s.id} className={`rounded-xl border bg-white p-4 shadow-sm ${esNueva ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                        <TipoIcon className="h-3.5 w-3.5" />
                        {tipoMeta.label}
                      </span>
                      <p className="mt-2 text-sm font-bold text-slate-800">
                        {s.fecha_inicio === s.fecha_fin ? formatFecha(s.fecha_inicio) : `${formatFecha(s.fecha_inicio)} - ${formatFecha(s.fecha_fin)}`}
                        {s.hora_inicio && ` · ${s.hora_inicio} - ${s.hora_fin}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {esNueva && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">Nuevo</span>
                      )}
                      <EstadoBadge estado={s.estado} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{s.motivo}</p>
                  {s.comentario_admin && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      Nota del administrador: {s.comentario_admin}
                    </p>
                  )}
                  {s.estado === "PENDIENTE" && (
                    <div className="mt-3">
                      <button
                        onClick={() => setCancelModal(s)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                      >
                        Cancelar solicitud
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {cancelModal && (
        <ConfirmModal
          title="¿Cancelar esta solicitud?"
          text="La solicitud pendiente se cancelará y no será revisada por el administrador."
          confirmLabel="Sí, cancelar"
          onCancel={() => setCancelModal(null)}
          onConfirm={confirmarCancelar}
        />
      )}
    </section>
  );
}

function NotificacionesMedico({ user }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Misma clave que usa "Mi Disponibilidad": marcar como vistas aquí también
  // limpia el aviso que aparece allá, y viceversa.
  const storageKey = `disponibilidad_visto_${user?.email || "medico"}`;
  const [lastSeen, setLastSeen] = useState(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/disponibilidad/mias/");
      setSolicitudes(data.solicitudes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/disponibilidad/mias/");
        setSolicitudes(data.solicitudes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const resueltas = solicitudes
    .filter((s) => s.estado !== "PENDIENTE")
    .sort((a, b) => (b.fecha_resolucion || "").localeCompare(a.fecha_resolucion || ""));
  const noVistas = resueltas.filter((s) => !lastSeen || (s.fecha_resolucion && s.fecha_resolucion > lastSeen));

  const marcarComoVistas = () => {
    const maxFecha = solicitudes.reduce((max, s) => (s.fecha_resolucion && s.fecha_resolucion > max ? s.fecha_resolucion : max), lastSeen || "");
    try {
      localStorage.setItem(storageKey, maxFecha);
    } catch {
      // localStorage no disponible: la notificación seguirá apareciendo, sin romper la app.
    }
    setLastSeen(maxFecha);
  };

  return (
    <section className="space-y-5">
      <Header
        title="Notificaciones"
        subtitle="Avisos sobre tus solicitudes de disponibilidad: aprobadas o rechazadas por el administrador."
        action={
          noVistas.length > 0 && (
            <button onClick={marcarComoVistas} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
              Marcar todas como vistas
            </button>
          )
        }
      />
      {error && <ErrorBanner text={error} onRetry={cargar} />}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">{[1, 2].map((i) => <CitaCardSkeleton key={i} />)}</div>
      ) : resueltas.length === 0 ? (
        <EmptyState title="Sin notificaciones" text="Aquí aparecerán los avisos cuando el administrador apruebe o rechace tus solicitudes de disponibilidad." />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {resueltas.map((s) => {
            const tipoLabel = (TIPO_DISPONIBILIDAD_META[s.tipo] || {}).label || s.tipo;
            const esAprobada = s.estado === "APROBADA";
            const mensaje = esAprobada
              ? `Tu solicitud de "${tipoLabel}" fue aprobada y ya se aplicó en tu agenda.`
              : `Tu solicitud de "${tipoLabel}" fue rechazada${s.comentario_admin ? `: ${s.comentario_admin}` : "."}`;
            const esNueva = !lastSeen || (s.fecha_resolucion && s.fecha_resolucion > lastSeen);
            return (
              <NotificacionCard
                key={s.id}
                notificacion={{
                  id: s.id,
                  tipo: esAprobada ? "DISPONIBILIDAD_APROBADA" : "DISPONIBILIDAD_RECHAZADA",
                  mensaje,
                  fecha_envio: s.fecha_resolucion,
                }}
                esNueva={esNueva}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function PanelMedico({ view, setView, citas, refresh, user }) {
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("activa");
  const [historialPage, setHistorialPage] = useState(1);
  const [asistirModal, setAsistirModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [revertirModal, setRevertirModal] = useState(null);
  const [pacienteInfo, setPacienteInfo] = useState(null);

  const activas = citas.filter((c) => c.estado === "PROGRAMADA" || c.estado === "SOLICITA_CANCELACION");
  const historial = ordenarPorFechaHora(citas.filter((c) => ESTADOS_HISTORIAL.has(c.estado))).reverse();
  const historialTotalPages = Math.max(1, Math.ceil(historial.length / HISTORIAL_PAGE_SIZE));
  const historialPagina = historial.slice((historialPage - 1) * HISTORIAL_PAGE_SIZE, historialPage * HISTORIAL_PAGE_SIZE);
  const lista = tab === "activa" ? activas : historialPagina;

  const cambiarTab = (next) => {
    setTab(next);
    setHistorialPage(1);
  };

  const runAction = async (path) => {
    setMessage("");
    try {
      await apiRequest(path, { method: "POST" });
      await refresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarAsistencia = async () => {
    const cita = asistirModal;
    setAsistirModal(null);
    await runAction(`/citas/${cita.id}/asistir/`);
  };

  const confirmarSolicitarCancelacion = async (motivo) => {
    const cita = cancelModal;
    setCancelModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/solicitar-cancelacion/`, { method: "POST", body: JSON.stringify({ motivo }) });
      await refresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarRevertir = async () => {
    const cita = revertirModal;
    setRevertirModal(null);
    await runAction(`/citas/${cita.id}/retirar-cancelacion/`);
  };

  const abrirPaciente = async (cita) => {
    setPacienteInfo({ cita, data: null, loading: true, error: "" });
    try {
      const data = await apiRequest(`/pacientes/${cita.paciente_id}/`);
      setPacienteInfo({ cita, data, loading: false, error: "" });
    } catch (err) {
      setPacienteInfo({ cita, data: null, loading: false, error: err.message });
    }
  };

  if (view === "Mi Disponibilidad") {
    return <MiDisponibilidad user={user} setView={setView} />;
  }

  if (view === "Notificaciones") {
    return <NotificacionesMedico user={user} />;
  }

  return (
    <section className="space-y-5">
      <Header title="Agenda Médica" subtitle="Citas asignadas al médico autenticado. La asistencia solo se permite desde la hora de la cita." />
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 border border-amber-200">{message}</p>}

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => cambiarTab("activa")}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${tab === "activa" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Agenda activa
        </button>
        <button
          onClick={() => cambiarTab("historial")}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${tab === "historial" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Historial ({historial.length})
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {lista.length === 0 ? (
          <EmptyState
            title={tab === "activa" ? "Sin citas asignadas" : "Sin historial"}
            text={tab === "activa" ? "No hay citas activas para este médico." : "Aún no hay citas atendidas ni canceladas."}
          />
        ) : lista.map((cita) => (
          <CitaCard
            key={cita.id}
            cita={cita}
            onVerPaciente={abrirPaciente}
            actions={
              cita.estado === "PROGRAMADA" ? (
                <>
                  <button onClick={() => setAsistirModal(cita)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Marcar asistido</button>
                  <button onClick={() => setCancelModal(cita)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600">Solicitar cancelación</button>
                </>
              ) : cita.estado === "SOLICITA_CANCELACION" ? (
                <button onClick={() => setRevertirModal(cita)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Revertir solicitud</button>
              ) : null
            }
          />
        ))}
      </div>

      {tab === "historial" && historialTotalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-500">
            Mostrando {historialPagina.length} de {historial.length} citas
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={historialPage <= 1}
              onClick={() => setHistorialPage((p) => p - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-700">
              {historialPage} / {historialTotalPages}
            </span>
            <button
              disabled={historialPage >= historialTotalPages}
              onClick={() => setHistorialPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {asistirModal && (
        <ConfirmModal
          title="¿Confirmar asistencia?"
          text={<>¿Confirmas la asistencia de <strong>{asistirModal.paciente}</strong> a las <strong>{asistirModal.hora_inicio}</strong>?</>}
          confirmLabel="Sí, marcar asistido"
          onCancel={() => setAsistirModal(null)}
          onConfirm={confirmarAsistencia}
        />
      )}

      {revertirModal && (
        <ConfirmModal
          title="¿Revertir la solicitud de cancelación?"
          text={<>La cita con <strong>{revertirModal.paciente}</strong> del <strong>{formatFecha(revertirModal.fecha)}</strong> volverá al estado Programada.</>}
          confirmLabel="Sí, revertir"
          onCancel={() => setRevertirModal(null)}
          onConfirm={confirmarRevertir}
        />
      )}

      <MotivoCancelacionModal cita={cancelModal} onCancel={() => setCancelModal(null)} onConfirm={confirmarSolicitarCancelacion} />
      <PacienteInfoModal estado={pacienteInfo} onClose={() => setPacienteInfo(null)} />
    </section>
  );
}

const ESTADO_COLOR_HEX = {
  PROGRAMADA: "#16a34a",
  SOLICITA_CANCELACION: "#d97706",
  CANCELADA: "#dc2626",
  ASISTIDA: "#4f46e5",
  ATENDIDA: "#4f46e5",
  REPROGRAMADA: "#9333ea",
};
const ESPECIALIDAD_COLORS = ["#2563eb", "#059669", "#d97706", "#e11d48", "#7c3aed", "#0891b2"];

function IconRefresh({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function DonutChart({ data, colors, size = 168, thickness = 26 }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((sum, d) => sum + d.total, 0);
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  let cumulative = 0;

  return (
    <div className="relative inline-block" onMouseLeave={() => setHover(null)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total === 0 ? (
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
        ) : (
          data.map((d, i) => {
            const percent = (d.total / total) * 100;
            const offset = -cumulative;
            cumulative += percent;
            const color = colors[d.label] || colors[i % colors.length] || "#94a3b8";
            return (
              <circle
                key={d.label}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={offset}
                pathLength={100}
                transform={`rotate(-90 ${cx} ${cy})`}
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseMove={(event) => {
                  const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setHover({ label: d.label, total: d.total, percent, x: event.clientX - rect.left, y: event.clientY - rect.top });
                }}
              />
            );
          })
        )}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold text-slate-900">{total.toLocaleString("es-PE")}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
      </div>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-lg"
          style={{ left: hover.x + 12, top: hover.y - 10 }}
        >
          {hover.label}: {hover.total.toLocaleString("es-PE")} ({hover.percent.toFixed(1)}%)
        </div>
      )}
    </div>
  );
}

function ChartLegend({ data, colors }) {
  const total = data.reduce((sum, d) => sum + d.total, 0) || 1;
  return (
    <ul className="space-y-1.5">
      {data.map((d, i) => (
        <li key={d.label} className="flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-2 truncate font-semibold text-slate-600">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[d.label] || colors[i % colors.length] || "#94a3b8" }} />
            <span className="truncate">{d.label.replace("_", " ")}</span>
          </span>
          <span className="shrink-0 font-bold text-slate-800">
            {d.total.toLocaleString("es-PE")} <span className="font-medium text-slate-400">({((d.total / total) * 100).toFixed(1)}%)</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function DonutCard({ title, data, colors }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-extrabold text-slate-900">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-slate-400">Sin datos para mostrar.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <DonutChart data={data} colors={colors} />
          <div className="w-full min-w-0 flex-1">
            <ChartLegend data={data} colors={colors} />
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, tone, alert }) {
  const tones = {
    neutral: { border: "border-slate-200", accent: "bg-slate-300", text: "text-slate-900" },
    positive: { border: "border-slate-200", accent: "bg-green-500", text: "text-slate-900" },
    negative: { border: "border-red-200", accent: "bg-red-500", text: "text-red-700" },
  };
  const style = tones[tone] || tones.neutral;
  return (
    <div className={`relative overflow-hidden rounded-xl border ${style.border} bg-white p-4 pl-5 shadow-sm`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase text-slate-400">{label}</span>
        {alert && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-extrabold text-red-700">
            <IconAlert className="h-2.5 w-2.5" />
            Atención
          </span>
        )}
      </div>
      <strong className={`mt-2 block text-3xl font-extrabold ${style.text}`}>{value.toLocaleString("es-PE")}</strong>
    </div>
  );
}

function useRelativeTime(date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);
  if (!date) return "";
  const diffMin = Math.max(0, Math.floor((now - date.getTime()) / 60000));
  if (diffMin < 1) return "Actualizado justo ahora";
  if (diffMin === 1) return "Actualizado hace 1 min";
  if (diffMin < 60) return `Actualizado hace ${diffMin} min`;
  const diffHoras = Math.floor(diffMin / 60);
  return `Actualizado hace ${diffHoras} h`;
}

const RANGOS_DASHBOARD = [
  { value: "hoy", label: "Hoy" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "total", label: "Total" },
];

function DashboardAdmin() {
  const [rango, setRango] = useState("total");
  const [dashboard, setDashboard] = useState({ metricas: {}, por_estado: [], por_especialidad: [], proximas_citas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const relativeTime = useRelativeTime(updatedAt);

  const cargar = async (r) => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest(`/dashboard/?rango=${r}`);
      setDashboard(data);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest(`/dashboard/?rango=${rango}`);
        setDashboard(data);
        setUpdatedAt(new Date());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [rango]);

  const metrics = dashboard.metricas || {};
  const cancelacionesPendientes = metrics.cancelaciones_pendientes || 0;
  const cards = [
    { label: "Total citas", value: metrics.total_citas || 0, tone: "neutral" },
    { label: "Programadas", value: metrics.programadas || 0, tone: "positive" },
    { label: "Asistidas", value: metrics.asistidas || 0, tone: "positive" },
    { label: "Canceladas", value: metrics.canceladas || 0, tone: "negative" },
    { label: "Cancelaciones pendientes", value: cancelacionesPendientes, tone: cancelacionesPendientes > 0 ? "negative" : "neutral", alert: cancelacionesPendientes > 0 },
    { label: "Horarios disponibles", value: metrics.agendas_disponibles || 0, tone: "neutral" },
  ];
  const proximasCitas = dashboard.proximas_citas || [];

  return (
    <section className="space-y-5">
      <Header
        title="Dashboard Administrativo"
        subtitle="Métricas principales calculadas desde la base local PostgreSQL."
        action={
          <div className="flex flex-col items-end gap-1.5">
            <button onClick={() => cargar(rango)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
              <IconRefresh className="h-4 w-4" />
              Actualizar
            </button>
            {updatedAt && <span className="text-[11px] font-semibold text-slate-400">{relativeTime}</span>}
          </div>
        }
      />

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        {RANGOS_DASHBOARD.map((r) => (
          <button
            key={r.value}
            onClick={() => setRango(r.value)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${rango === r.value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && <ErrorBanner text={error} onRetry={() => cargar(rango)} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card) => (
              <KpiCard key={card.label} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <DonutCard title="Citas por estado" data={dashboard.por_estado || []} colors={ESTADO_COLOR_HEX} />
            <DonutCard title="Citas por especialidad" data={dashboard.por_especialidad || []} colors={ESPECIALIDAD_COLORS} />
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-extrabold text-slate-900">Próximos 7 días</h3>
              {proximasCitas.length === 0 ? (
                <p className="mt-4 text-sm font-semibold text-slate-400">No hay citas programadas en los próximos 7 días.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {proximasCitas.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700">
                        <IconCalendar className="h-3.5 w-3.5 text-slate-400" />
                        {formatFecha(c.fecha)} · {c.hora_inicio}
                      </span>
                      <span className="truncate font-semibold text-slate-500">{c.especialidad}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Modal compartido para que un administrador apruebe o rechace una solicitud
// de disponibilidad: muestra el motivo del médico y el resumen de la
// solicitud antes del clic irreversible, con el mismo patrón que
// RevisarCancelacionModal (colores semáforo, motivo destacado, resumen).
function RevisarDisponibilidadModal({ solicitud, modo, onCancel, onConfirm }) {
  const [comentario, setComentario] = useState("");
  if (!solicitud) return null;
  const esAprobar = modo === "aprobar";
  const tipoMeta = TIPO_DISPONIBILIDAD_META[solicitud.tipo] || { label: solicitud.tipo };
  const rango = solicitud.fecha_inicio === solicitud.fecha_fin
    ? formatFecha(solicitud.fecha_inicio)
    : `${formatFecha(solicitud.fecha_inicio)} - ${formatFecha(solicitud.fecha_fin)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">
          {esAprobar ? "Aprobar solicitud de disponibilidad" : "Rechazar solicitud de disponibilidad"}
        </h3>

        <div className="mt-4 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Médico</span>
            <span className="font-bold text-slate-800">{solicitud.medico}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Tipo</span>
            <span className="font-bold text-slate-800">{tipoMeta.label}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-slate-400">Fechas</span>
            <span className="font-bold text-slate-800">{rango}</span>
          </div>
          {solicitud.hora_inicio && (
            <div className="flex justify-between gap-3">
              <span className="font-bold text-slate-400">Horario</span>
              <span className="font-bold text-slate-800">{solicitud.hora_inicio} - {solicitud.hora_fin}</span>
            </div>
          )}
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
          <span className="block text-[11px] font-bold uppercase tracking-wide text-amber-700">Motivo del médico</span>
          <p className="mt-1 text-sm text-amber-900">{solicitud.motivo || "No se registró un motivo."}</p>
        </div>

        {esAprobar ? (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            Esta acción aplica el cambio en la agenda del médico (bloquea u abre los horarios correspondientes) y no se puede deshacer.
          </p>
        ) : (
          <>
            <label className="mt-3 block text-xs font-bold text-slate-600">Motivo del rechazo (se comunicará al médico) *</label>
            <textarea
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
              placeholder="Explique por qué se rechaza la solicitud..."
              autoFocus
            />
            <p className="mt-2 text-xs font-semibold text-slate-500">No se aplicará ningún cambio en la agenda.</p>
          </>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(esAprobar ? undefined : comentario.trim())}
            disabled={!esAprobar && !comentario.trim()}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white disabled:cursor-not-allowed disabled:opacity-40 ${esAprobar ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {esAprobar ? "Confirmar aprobación" : "Rechazar solicitud"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisponibilidadAdmin() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("pendientes");
  const [revisarModal, setRevisarModal] = useState(null); // { solicitud, modo }
  const [message, setMessage] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/disponibilidad/");
      setSolicitudes(data.solicitudes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/disponibilidad/");
        setSolicitudes(data.solicitudes);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Más antigua primero en pendientes, para que no se acumulen sin atender.
  const pendientes = solicitudes
    .filter((s) => s.estado === "PENDIENTE")
    .sort((a, b) => a.fecha_solicitud.localeCompare(b.fecha_solicitud));
  const resueltas = solicitudes
    .filter((s) => s.estado !== "PENDIENTE")
    .sort((a, b) => (b.fecha_resolucion || "").localeCompare(a.fecha_resolucion || ""));
  const lista = tab === "pendientes" ? pendientes : resueltas;

  const confirmarRevision = async (comentario) => {
    const { solicitud, modo } = revisarModal;
    setRevisarModal(null);
    setMessage("");
    const path = modo === "aprobar" ? "aprobar" : "rechazar";
    const body = modo === "aprobar" ? {} : { comentario };
    try {
      await apiRequest(`/disponibilidad/${solicitud.id}/${path}/`, { method: "POST", body: JSON.stringify(body) });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <Header
        title="Solicitudes de Disponibilidad"
        subtitle="Bloqueos, aperturas, vacaciones y descansos solicitados por los médicos. Pendientes ordenadas de la más antigua a la más reciente."
        action={<button onClick={cargar} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>}
      />
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 border border-amber-200">{message}</p>}
      {error && <ErrorBanner text={error} onRetry={cargar} />}

      <div className="flex w-fit rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setTab("pendientes")}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${tab === "pendientes" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Pendientes ({pendientes.length})
        </button>
        <button
          onClick={() => setTab("resueltas")}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${tab === "resueltas" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Resueltas ({resueltas.length})
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">{[1, 2].map((i) => <CitaCardSkeleton key={i} />)}</div>
      ) : lista.length === 0 ? (
        <EmptyState
          title={tab === "pendientes" ? "No hay solicitudes pendientes" : "Sin solicitudes resueltas"}
          text={tab === "pendientes" ? "Todas las solicitudes de disponibilidad han sido atendidas. Vuelva a revisar más tarde." : "Aún no se ha aprobado ni rechazado ninguna solicitud."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {lista.map((s) => {
            const tipoMeta = TIPO_DISPONIBILIDAD_META[s.tipo] || { label: s.tipo, icon: IconAlert };
            const TipoIcon = tipoMeta.icon;
            return (
              <article key={s.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <TipoIcon className="h-3.5 w-3.5" />
                      {tipoMeta.label}
                    </span>
                    <h4 className="mt-2 text-sm font-extrabold text-slate-900">{s.medico}</h4>
                    <p className="mt-1 text-xs font-bold text-slate-600">
                      {s.fecha_inicio === s.fecha_fin ? formatFecha(s.fecha_inicio) : `${formatFecha(s.fecha_inicio)} - ${formatFecha(s.fecha_fin)}`}
                      {s.hora_inicio && ` · ${s.hora_inicio} - ${s.hora_fin}`}
                    </p>
                  </div>
                  <EstadoBadge estado={s.estado} />
                </div>
                <p className="mt-3 text-xs text-slate-500">{s.motivo}</p>
                {s.comentario_admin && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Nota: {s.comentario_admin}</p>
                )}
                {s.estado === "PENDIENTE" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setRevisarModal({ solicitud: s, modo: "aprobar" })} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Aprobar</button>
                    <button onClick={() => setRevisarModal({ solicitud: s, modo: "rechazar" })} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Rechazar</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <RevisarDisponibilidadModal
        key={revisarModal ? `${revisarModal.solicitud.id}-${revisarModal.modo}` : "revisar"}
        solicitud={revisarModal?.solicitud}
        modo={revisarModal?.modo}
        onCancel={() => setRevisarModal(null)}
        onConfirm={confirmarRevision}
      />
    </section>
  );
}

const ESTADOS_FILTRO_CITAS = ["PROGRAMADA", "SOLICITA_CANCELACION", "ATENDIDA", "ASISTIDA", "CANCELADA", "REPROGRAMADA", "ANULADA"];
const ESTADOS_CITA_EDITABLES = ["PROGRAMADA", "ATENDIDA", "CANCELADA", "REPROGRAMADA"];
const PAGE_SIZES_CITAS = [10, 25, 50, 100];

function DetalleAdminModal({ cita, onClose }) {
  if (!cita) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{cita.especialidad}</span>
            <h3 className="mt-2 text-lg font-extrabold text-slate-900">Cita #{cita.id}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">
          <EstadoBadge estado={cita.estado} />
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <Summary label="Paciente" value={`${cita.paciente} · ${cita.paciente_email}`} />
          <Summary label="Médico" value={`${cita.medico} · ${cita.medico_email}`} />
          <Summary label="Sede" value={cita.sede} />
          <Summary label="Modalidad" value={cita.modalidad === "VIRTUAL" ? "Virtual" : "Presencial"} />
          <Summary label="Fecha y hora" value={`${formatFecha(cita.fecha)} · ${cita.hora_inicio} - ${cita.hora_fin}`} />
          <Summary label="Motivo de consulta" value={cita.motivo_consulta || "No especificado"} />
          {cita.estado === "SOLICITA_CANCELACION" && (
            <Summary label="Contacto con paciente" value={cita.contactado ? "Ya contactado" : "Pendiente de contactar"} />
          )}
        </div>
      </div>
    </div>
  );
}

function CambiarEstadoModal({ cita, onCancel, onConfirm }) {
  const [estado, setEstado] = useState(() =>
    cita && ESTADOS_CITA_EDITABLES.includes(cita.estado) ? cita.estado : ESTADOS_CITA_EDITABLES[0]
  );
  if (!cita) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-extrabold text-slate-900">Cambiar estado manualmente</h3>
        <p className="mt-1 text-sm text-slate-500">Folio #{cita.id} · {cita.paciente}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {ESTADOS_CITA_EDITABLES.map((op) => {
            const meta = estadoMeta[op] || {};
            return (
              <button
                key={op}
                type="button"
                onClick={() => setEstado(op)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${estado === op ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                {meta.label || op}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] font-semibold text-amber-600">Corrección manual: no dispara las validaciones ni notificaciones del flujo normal.</p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={() => onConfirm(estado)} disabled={estado === cita.estado} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ReprogramarModal({ cita, catalogo, onCancel, onConfirm }) {
  const [calCursor, setCalCursor] = useState(() => {
    if (cita) {
      const medicoIds = new Set(catalogo.medicos.filter((m) => String(m.especialidad_id) === String(cita.especialidad_id)).map((m) => m.id));
      const fechas = catalogo.agendas.filter((a) => medicoIds.has(a.medico_id)).map((a) => a.fecha).sort();
      if (fechas.length > 0) {
        const [y, m] = fechas[0].split("-").map(Number);
        return { year: y, month: m - 1 };
      }
    }
    const hoy = new Date();
    return { year: hoy.getFullYear(), month: hoy.getMonth() };
  });
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [agendaId, setAgendaId] = useState("");

  if (!cita) return null;

  const medicoIds = new Set(catalogo.medicos.filter((m) => String(m.especialidad_id) === String(cita.especialidad_id)).map((m) => m.id));
  const agendasEsp = catalogo.agendas.filter((a) => medicoIds.has(a.medico_id));
  const horariosPorFecha = new Map();
  for (const a of agendasEsp) {
    if (!horariosPorFecha.has(a.fecha)) horariosPorFecha.set(a.fecha, new Map());
    horariosPorFecha.get(a.fecha).set(a.hora_inicio, a.hora_fin);
  }
  const fechasDisponibles = new Set(horariosPorFecha.keys());
  const medicosDisponibles =
    fecha && horaInicio
      ? agendasEsp
          .filter((a) => a.fecha === fecha && a.hora_inicio === horaInicio)
          .map((a) => ({ agendaId: a.id, medico: catalogo.medicos.find((m) => String(m.id) === String(a.medico_id)) }))
          .filter((item) => item.medico)
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Reprogramar cita #{cita.id}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {cita.especialidad} · Actualmente con {cita.medico}, {formatFecha(cita.fecha)} {cita.hora_inicio}
            </p>
          </div>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-800">{NOMBRE_MESES[calCursor.month]} {calCursor.year}</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCalCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                >
                  <IconChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                >
                  <IconChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {diasDelMes(calCursor.year, calCursor.month).map((day, idx) => {
                if (!day) return <div key={idx} />;
                const fechaStr = `${calCursor.year}-${String(calCursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const disponible = fechasDisponibles.has(fechaStr);
                const seleccionado = fecha === fechaStr;
                return (
                  <button
                    type="button"
                    key={idx}
                    disabled={!disponible}
                    onClick={() => { setFecha(fechaStr); setHoraInicio(""); setAgendaId(""); }}
                    className={`h-9 rounded-lg text-xs font-bold transition ${
                      seleccionado ? "bg-blue-600 text-white" : disponible ? "border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100" : "cursor-not-allowed text-slate-300"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-2 text-sm font-extrabold text-slate-800">Horario</h4>
              {!fecha ? (
                <p className="text-xs text-slate-400">Elija un día en el calendario.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {[...(horariosPorFecha.get(fecha) || new Map()).keys()].sort().map((hi) => (
                    <button
                      type="button"
                      key={hi}
                      onClick={() => { setHoraInicio(hi); setAgendaId(""); }}
                      className={`rounded-lg border py-2 text-xs font-extrabold ${horaInicio === hi ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                    >
                      {hi}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="mb-2 text-sm font-extrabold text-slate-800">Médico disponible</h4>
              {!horaInicio ? (
                <p className="text-xs text-slate-400">Elija primero un horario.</p>
              ) : medicosDisponibles.length === 0 ? (
                <p className="text-xs text-slate-400">Sin médicos disponibles en ese horario.</p>
              ) : (
                <div className="space-y-2">
                  {medicosDisponibles.map(({ agendaId: aId, medico }) => (
                    <button
                      type="button"
                      key={aId}
                      onClick={() => setAgendaId(aId)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-bold ${agendaId === aId ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    >
                      {medico.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(agendaId)}
            disabled={!agendaId}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirmar reprogramación
          </button>
        </div>
      </div>
    </div>
  );
}

function AnularModal({ cita, onCancel, onConfirm }) {
  const [texto, setTexto] = useState("");
  if (!cita) return null;
  const habilitado = texto.trim().toUpperCase() === "ELIMINAR";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600">
          <IconAlert className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-center text-lg font-extrabold text-slate-900">Anular cita permanentemente</h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Distinta de cancelar: la cita #{cita.id} quedará anulada de forma <strong>irreversible</strong> y no podrá revertirse desde el sistema.
        </p>
        <label className="mt-4 block text-xs font-bold text-slate-600">
          Escriba <strong>ELIMINAR</strong> para confirmar
        </label>
        <input
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-red-500"
          placeholder="ELIMINAR"
          autoFocus
        />
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={!habilitado} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            Anular definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}

function RowActionsMenu({ cita, isOpen, onToggle, onClose, onVerDetalle, onCambiarEstado, onReprogramar, onMarcarContactado, onAprobarCancelacion, onRechazarCancelacion, onAnular }) {
  return (
    <div className="relative inline-block text-left">
      <button onClick={onToggle} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Más acciones">
        <IconKebab className="h-4 w-4" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            <button onClick={() => { onClose(); onVerDetalle(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <IconInfo className="h-3.5 w-3.5" /> Ver detalle
            </button>
            <button onClick={() => { onClose(); onCambiarEstado(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <IconCheck className="h-3.5 w-3.5" /> Cambiar estado
            </button>
            {(cita.estado === "PROGRAMADA" || cita.estado === "SOLICITA_CANCELACION") && (
              <button onClick={() => { onClose(); onReprogramar(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <IconCalendar className="h-3.5 w-3.5" /> Reprogramar
              </button>
            )}
            <a href={`mailto:${cita.paciente_email}`} onClick={onClose} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <IconBell className="h-3.5 w-3.5" /> Contactar paciente
            </a>
            {cita.estado === "SOLICITA_CANCELACION" && (
              <button
                onClick={() => { onClose(); onMarcarContactado(); }}
                disabled={cita.contactado}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                <IconCheck className="h-3.5 w-3.5" /> {cita.contactado ? "Ya contactado" : "Marcar como contactado"}
              </button>
            )}
            {cita.estado === "SOLICITA_CANCELACION" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { onClose(); onAprobarCancelacion(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-green-700 hover:bg-green-50">
                  <IconCheck className="h-3.5 w-3.5" /> Aprobar cancelación
                </button>
                <button onClick={() => { onClose(); onRechazarCancelacion(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">
                  <IconAlert className="h-3.5 w-3.5" /> Rechazar cancelación
                </button>
              </>
            )}
            {cita.estado !== "ANULADA" && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <button onClick={() => { onClose(); onAnular(); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50">
                  <IconAlert className="h-3.5 w-3.5" /> Eliminar / Anular
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SortHeader({ field, ordering, onToggle, children }) {
  return (
    <th className="px-4 py-3">
      <button onClick={() => onToggle(field)} className="flex items-center gap-1 font-bold uppercase tracking-wide hover:text-slate-700">
        {children}
        <IconArrowsSort className={`h-3 w-3 ${ordering === field || ordering === `-${field}` ? "text-blue-600" : "text-slate-300"}`} />
      </button>
    </th>
  );
}

function GestionCitas() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estados, setEstados] = useState(new Set());
  const [especialidad, setEspecialidad] = useState("");
  const [fechaPreset, setFechaPreset] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [ordering, setOrdering] = useState("fecha");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageInput, setPageInput] = useState("1");

  const [citas, setCitas] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [catalogo, setCatalogo] = useState({ especialidades: [], medicos: [], agendas: [] });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detalleModal, setDetalleModal] = useState(null);
  const [estadoModal, setEstadoModal] = useState(null);
  const [reprogramarModal, setReprogramarModal] = useState(null);
  const [anularModal, setAnularModal] = useState(null);
  const [revisarModal, setRevisarModal] = useState(null); // { cita, modo }

  const cambiarPagina = (n) => {
    setPage(n);
    setPageInput(String(n));
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/catalogo/");
        setCatalogo(data);
      } catch {
        // El filtro de especialidad y "Reprogramar" quedan degradados si esto falla; el resto de la tabla sigue operando.
      }
    })();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      cambiarPagina(1);
    }, 400);
    return () => window.clearTimeout(id);
  }, [search]);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), ordering });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (estados.size > 0) params.set("estado", [...estados].join(","));
      if (especialidad) params.set("especialidad", especialidad);
      if (fechaDesde) params.set("fecha_desde", fechaDesde);
      if (fechaHasta) params.set("fecha_hasta", fechaHasta);
      const data = await apiRequest(`/citas/?${params.toString()}`);
      setCitas(data.citas);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), ordering });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (estados.size > 0) params.set("estado", [...estados].join(","));
        if (especialidad) params.set("especialidad", especialidad);
        if (fechaDesde) params.set("fecha_desde", fechaDesde);
        if (fechaHasta) params.set("fecha_hasta", fechaHasta);
        const data = await apiRequest(`/citas/?${params.toString()}`);
        setCitas(data.citas);
        setTotal(data.total);
        setTotalPages(data.total_pages);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedSearch, estados, especialidad, fechaDesde, fechaHasta, ordering, page, pageSize]);

  const toggleEstado = (value) => {
    setEstados((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
    cambiarPagina(1);
  };

  const aplicarPresetFecha = (preset) => {
    setFechaPreset(preset);
    cambiarPagina(1);
    if (preset === "todos") {
      setFechaDesde("");
      setFechaHasta("");
    } else if (preset === "hoy") {
      const hoy = new Date().toISOString().slice(0, 10);
      setFechaDesde(hoy);
      setFechaHasta(hoy);
    } else if (preset === "semana") {
      const hoy = new Date();
      const hace6 = new Date(hoy);
      hace6.setDate(hoy.getDate() - 6);
      setFechaDesde(hace6.toISOString().slice(0, 10));
      setFechaHasta(hoy.toISOString().slice(0, 10));
    }
  };

  const toggleOrdering = (field) => {
    setOrdering((prev) => (prev === field ? `-${field}` : field));
    cambiarPagina(1);
  };

  const irAPagina = (event) => {
    event.preventDefault();
    const n = Math.min(Math.max(1, Number(pageInput) || 1), totalPages);
    cambiarPagina(n);
  };

  const confirmarCambiarEstado = async (nuevoEstado) => {
    const cita = estadoModal;
    setEstadoModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/cambiar-estado/`, { method: "POST", body: JSON.stringify({ estado: nuevoEstado }) });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarReprogramar = async (agendaId) => {
    const cita = reprogramarModal;
    setReprogramarModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/reprogramar/`, { method: "POST", body: JSON.stringify({ agenda_id: agendaId }) });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const marcarContactado = async (cita) => {
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/marcar-contactado/`, { method: "POST" });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarAnular = async () => {
    const cita = anularModal;
    setAnularModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/anular/`, { method: "POST" });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarAprobarCancelacion = async ({ reembolso }) => {
    const cita = revisarModal.cita;
    setRevisarModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/aprobar-cancelacion/`, { method: "POST", body: JSON.stringify({ reembolso }) });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const confirmarRechazarCancelacion = async ({ comentario }) => {
    const cita = revisarModal.cita;
    setRevisarModal(null);
    setMessage("");
    try {
      await apiRequest(`/citas/${cita.id}/rechazar-cancelacion/`, { method: "POST", body: JSON.stringify({ comentario }) });
      await cargar();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <Header
        title="Gestión de Citas"
        subtitle={`${total.toLocaleString("es-PE")} citas en total${estados.size || especialidad || fechaDesde || debouncedSearch ? " (filtro aplicado)" : ""}. Página ${page} de ${totalPages}.`}
        action={<button onClick={cargar} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>}
      />

      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 border border-amber-200">{message}</p>}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por folio, paciente o médico..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {ESTADOS_FILTRO_CITAS.map((estado) => {
            const meta = estadoMeta[estado] || {};
            const activo = estados.has(estado);
            return (
              <button
                key={estado}
                onClick={() => toggleEstado(estado)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${activo ? `${meta.badge} ring-2 ring-blue-400 ring-offset-1` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {meta.label || estado}
              </button>
            );
          })}
          {estados.size > 0 && (
            <button onClick={() => { setEstados(new Set()); cambiarPagina(1); }} className="text-xs font-bold text-slate-400 underline hover:text-slate-600">
              Limpiar estados
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={especialidad}
            onChange={(event) => { setEspecialidad(event.target.value); cambiarPagina(1); }}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            <option value="">Todas las especialidades</option>
            {catalogo.especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>{esp.nombre}</option>
            ))}
          </select>

          <div className="flex rounded-xl bg-slate-100 p-1">
            {[["todos", "Todos"], ["hoy", "Hoy"], ["semana", "Esta semana"], ["personalizado", "Rango personalizado"]].map(([value, label]) => (
              <button
                key={value}
                onClick={() => aplicarPresetFecha(value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${fechaPreset === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {fechaPreset === "personalizado" && (
            <div className="flex items-center gap-2">
              <input type="date" value={fechaDesde} onChange={(event) => { setFechaDesde(event.target.value); cambiarPagina(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500" />
              <span className="text-xs text-slate-400">a</span>
              <input type="date" value={fechaHasta} onChange={(event) => { setFechaHasta(event.target.value); cambiarPagina(1); }} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500" />
            </div>
          )}

          <select
            value={pageSize}
            onChange={(event) => { setPageSize(Number(event.target.value)); cambiarPagina(1); }}
            className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
          >
            {PAGE_SIZES_CITAS.map((n) => (
              <option key={n} value={n}>{n} por página</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorBanner text={error} onRetry={cargar} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}
        </div>
      ) : citas.length === 0 ? (
        <EmptyState title="Sin registros" text="No hay citas que coincidan con los filtros aplicados." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Folio</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Paciente</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Médico</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Especialidad</th>
                  <SortHeader field="fecha" ordering={ordering} onToggle={toggleOrdering}>Fecha</SortHeader>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Hora</th>
                  <SortHeader field="estado" ordering={ordering} onToggle={toggleOrdering}>Estado</SortHeader>
                  <th className="px-4 py-3 font-bold uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {citas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">#{cita.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{cita.paciente}</span>
                      <span className="block text-xs text-slate-400">{cita.paciente_email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{cita.medico}</span>
                      <span className="block text-xs text-slate-400">{cita.medico_email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cita.especialidad}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{cita.fecha}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{cita.hora_inicio} - {cita.hora_fin}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={cita.estado} />
                    </td>
                    <td className="px-4 py-3">
                      <RowActionsMenu
                        cita={cita}
                        isOpen={openMenuId === cita.id}
                        onToggle={() => setOpenMenuId((prev) => (prev === cita.id ? null : cita.id))}
                        onClose={() => setOpenMenuId(null)}
                        onVerDetalle={() => setDetalleModal(cita)}
                        onCambiarEstado={() => setEstadoModal(cita)}
                        onReprogramar={() => setReprogramarModal(cita)}
                        onMarcarContactado={() => marcarContactado(cita)}
                        onAprobarCancelacion={() => setRevisarModal({ cita, modo: "aprobar" })}
                        onRechazarCancelacion={() => setRevisarModal({ cita, modo: "rechazar" })}
                        onAnular={() => setAnularModal(cita)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && citas.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Mostrando {citas.length} de {total.toLocaleString("es-PE")} citas
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => cambiarPagina(page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => cambiarPagina(page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
            <form onSubmit={irAPagina} className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                className="w-16 rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button type="submit" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                Ir
              </button>
            </form>
          </div>
        </div>
      )}

      <DetalleAdminModal cita={detalleModal} onClose={() => setDetalleModal(null)} />
      <CambiarEstadoModal key={estadoModal?.id || "cambiar-estado"} cita={estadoModal} onCancel={() => setEstadoModal(null)} onConfirm={confirmarCambiarEstado} />
      <ReprogramarModal key={reprogramarModal?.id || "reprogramar"} cita={reprogramarModal} catalogo={catalogo} onCancel={() => setReprogramarModal(null)} onConfirm={confirmarReprogramar} />
      <AnularModal cita={anularModal} onCancel={() => setAnularModal(null)} onConfirm={confirmarAnular} />
      <RevisarCancelacionModal
        key={revisarModal ? `${revisarModal.cita.id}-${revisarModal.modo}` : "revisar"}
        cita={revisarModal?.cita}
        modo={revisarModal?.modo}
        onCancel={() => setRevisarModal(null)}
        onConfirm={revisarModal?.modo === "aprobar" ? confirmarAprobarCancelacion : confirmarRechazarCancelacion}
      />
    </section>
  );
}

function GestionMedicos() {
  const [catalogo, setCatalogo] = useState({ especialidades: [], medicos: [], sedes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nombres: "", apellidos: "", cmp: "", correo: "", telefono: "", especialidadId: "", sedeId: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/catalogo/");
      setCatalogo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/catalogo/");
        setCatalogo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const submit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setMessage("");
    setSubmitting(true);
    try {
      await apiRequest("/medicos/crear/", {
        method: "POST",
        body: JSON.stringify({
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          cmp: form.cmp.trim(),
          correo: form.correo.trim(),
          telefono: form.telefono.trim(),
          especialidad_id: form.especialidadId,
          sede_id: form.sedeId,
          password: form.password,
        }),
      });
      setForm({ nombres: "", apellidos: "", cmp: "", correo: "", telefono: "", especialidadId: "", sedeId: "", password: "" });
      await cargar();
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      else setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-5">
      <Header title="Médicos" subtitle="Registre nuevos médicos y consulte el listado actual." />
      {message && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-800">Nuevo médico</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">Nombres *</label>
            <input value={form.nombres} onChange={(event) => actualizar("nombres", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.nombres && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.nombres}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Apellidos *</label>
            <input value={form.apellidos} onChange={(event) => actualizar("apellidos", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.apellidos && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.apellidos}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">CMP *</label>
            <input value={form.cmp} onChange={(event) => actualizar("cmp", event.target.value)} placeholder="CMP12345" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.cmp && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.cmp}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Correo *</label>
            <input type="email" value={form.correo} onChange={(event) => actualizar("correo", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.correo && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.correo}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Teléfono</label>
            <input value={form.telefono} onChange={(event) => actualizar("telefono", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Contraseña inicial *</label>
            <input type="password" value={form.password} onChange={(event) => actualizar("password", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" autoComplete="new-password" />
            {fieldErrors.password && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.password}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Especialidad *</label>
            <select value={form.especialidadId} onChange={(event) => actualizar("especialidadId", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="">Seleccione...</option>
              {catalogo.especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>{esp.nombre}</option>
              ))}
            </select>
            {fieldErrors.especialidad_id && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.especialidad_id}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Sede *</label>
            <select value={form.sedeId} onChange={(event) => actualizar("sedeId", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="">Seleccione...</option>
              {catalogo.sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            {fieldErrors.sede_id && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.sede_id}</p>}
          </div>
        </div>
        <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {submitting ? "Creando..." : "Crear médico"}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Médicos registrados ({catalogo.medicos.length})</h3>
        {error && <ErrorBanner text={error} onRetry={cargar} />}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{[1, 2].map((i) => <CitaCardSkeleton key={i} />)}</div>
        ) : catalogo.medicos.length === 0 ? (
          <EmptyState title="Sin médicos" text="Aún no hay médicos registrados." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {catalogo.medicos.map((m) => (
              <article key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-extrabold text-slate-900">{m.nombre}</h4>
                <p className="mt-1 text-xs font-semibold text-slate-500">{m.especialidad} · {m.sede}</p>
                <p className="mt-1 text-xs text-slate-400">CMP {m.cmp} · {m.correo}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const DIAS_SEMANA = [
  { value: 0, label: "Lun" },
  { value: 1, label: "Mar" },
  { value: 2, label: "Mié" },
  { value: 3, label: "Jue" },
  { value: 4, label: "Vie" },
  { value: 5, label: "Sáb" },
  { value: 6, label: "Dom" },
];

const HORARIO_ESTADO_META = {
  DISPONIBLE: { label: "Disponible", badge: "bg-green-50 text-green-700 border-green-200" },
  OCUPADA: { label: "Ocupada", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  BLOQUEADO: { label: "Bloqueado", badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

const HORARIO_FORM_INICIAL = () => {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    fechaInicio: hoy,
    fechaFin: hoy,
    horaInicio: "08:00",
    horaFin: "13:00",
    duracionMinutos: "30",
    tipoTurno: "REGULAR",
  };
};

function EliminarHorarioModal({ horario, onCancel, onConfirm }) {
  if (!horario) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600">
          <IconTrash className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-center text-lg font-extrabold text-slate-900">Eliminar horario</h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Se eliminará el horario del {horario.fecha} de {horario.hora_inicio} a {horario.hora_fin}. Esta acción no se puede deshacer.
        </p>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-600 hover:bg-red-700">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function GestionHorarios() {
  const [catalogo, setCatalogo] = useState({ medicos: [] });
  const [medicoId, setMedicoId] = useState("");
  const [form, setForm] = useState(HORARIO_FORM_INICIAL);
  const [diasSemana, setDiasSemana] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [horarios, setHorarios] = useState([]);
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [horariosError, setHorariosError] = useState("");
  const [eliminarModal, setEliminarModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await apiRequest("/catalogo/");
        setCatalogo(data);
      } catch {
        // El selector de médico simplemente quedará vacío; el error se ve al enviar.
      }
    })();
  }, []);

  const cargarHorarios = async (idMedico) => {
    if (!idMedico) {
      setHorarios([]);
      return;
    }
    setHorariosLoading(true);
    setHorariosError("");
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      const data = await apiRequest(`/horarios/?medico_id=${idMedico}&fecha_desde=${hoy}`);
      setHorarios(data.horarios);
    } catch (err) {
      setHorariosError(err.message);
    } finally {
      setHorariosLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!medicoId) {
        setHorarios([]);
        return;
      }
      setHorariosLoading(true);
      setHorariosError("");
      try {
        const hoy = new Date().toISOString().slice(0, 10);
        const data = await apiRequest(`/horarios/?medico_id=${medicoId}&fecha_desde=${hoy}`);
        setHorarios(data.horarios);
      } catch (err) {
        setHorariosError(err.message);
      } finally {
        setHorariosLoading(false);
      }
    })();
  }, [medicoId]);

  const actualizar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const alternarDia = (valor) => {
    setDiasSemana((prev) => (prev.includes(valor) ? prev.filter((d) => d !== valor) : [...prev, valor]));
  };

  const submit = async (event) => {
    event.preventDefault();
    setFieldErrors({});
    setMessage("");
    if (!medicoId) {
      setFieldErrors({ medico_id: "Seleccione un médico." });
      return;
    }
    setSubmitting(true);
    try {
      const data = await apiRequest("/horarios/crear/", {
        method: "POST",
        body: JSON.stringify({
          medico_id: medicoId,
          fecha_inicio: form.fechaInicio,
          fecha_fin: form.fechaFin || form.fechaInicio,
          hora_inicio: form.horaInicio,
          hora_fin: form.horaFin,
          duracion_minutos: Number(form.duracionMinutos),
          tipo_turno: form.tipoTurno,
          dias_semana: diasSemana.length ? diasSemana : undefined,
        }),
      });
      const detalleOmitidos = data.omitidos_duplicados ? ` (${data.omitidos_duplicados} ya existían y se omitieron)` : "";
      setMessage(`Se crearon ${data.creados} horario(s)${detalleOmitidos}.`);
      await cargarHorarios(medicoId);
    } catch (err) {
      if (err.fieldErrors) setFieldErrors(err.fieldErrors);
      else setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmarEliminar = async () => {
    const horario = eliminarModal;
    setEliminarModal(null);
    try {
      await apiRequest(`/horarios/${horario.id}/eliminar/`, { method: "POST" });
      await cargarHorarios(medicoId);
    } catch (err) {
      setHorariosError(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <Header title="Horarios" subtitle="Designe bloques de horario disponible para un médico y consulte lo ya programado." />

      <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-800">Designar horarios</h3>
        <div>
          <label className="text-sm font-bold text-slate-700">Médico *</label>
          <select value={medicoId} onChange={(event) => setMedicoId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 sm:max-w-sm">
            <option value="">Seleccione...</option>
            {catalogo.medicos.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} · {m.especialidad}</option>
            ))}
          </select>
          {fieldErrors.medico_id && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.medico_id}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-slate-700">Fecha inicio *</label>
            <input type="date" value={form.fechaInicio} onChange={(event) => actualizar("fechaInicio", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.fecha_inicio && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.fecha_inicio}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Fecha fin *</label>
            <input type="date" value={form.fechaFin} onChange={(event) => actualizar("fechaFin", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.fecha_fin && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.fecha_fin}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Hora inicio *</label>
            <input type="time" value={form.horaInicio} onChange={(event) => actualizar("horaInicio", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.hora_inicio && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.hora_inicio}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Hora fin *</label>
            <input type="time" value={form.horaFin} onChange={(event) => actualizar("horaFin", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
            {fieldErrors.hora_fin && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.hora_fin}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Duración por cita</label>
            <select value={form.duracionMinutos} onChange={(event) => actualizar("duracionMinutos", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="15">15 minutos</option>
              <option value="20">20 minutos</option>
              <option value="30">30 minutos</option>
              <option value="45">45 minutos</option>
              <option value="60">60 minutos</option>
            </select>
            {fieldErrors.duracion_minutos && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.duracion_minutos}</p>}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Tipo de turno</label>
            <select value={form.tipoTurno} onChange={(event) => actualizar("tipoTurno", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="REGULAR">Regular</option>
              <option value="AFTER_OFFICE">After office</option>
            </select>
            {fieldErrors.tipo_turno && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.tipo_turno}</p>}
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Días de la semana</label>
          <p className="mt-0.5 text-xs text-slate-400">Si no selecciona ninguno, se generan horarios todos los días del rango.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DIAS_SEMANA.map((dia) => {
              const activo = diasSemana.includes(dia.value);
              return (
                <button
                  type="button"
                  key={dia.value}
                  onClick={() => alternarDia(dia.value)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${activo ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                >
                  {dia.label}
                </button>
              );
            })}
          </div>
          {fieldErrors.dias_semana && <p className="mt-1 text-xs font-bold text-red-600">{fieldErrors.dias_semana}</p>}
        </div>

        {message && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700">{message}</p>}

        <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {submitting ? "Generando..." : "Generar horarios"}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Horarios programados {medicoId ? `(desde hoy)` : ""}
        </h3>
        {!medicoId ? (
          <EmptyState title="Seleccione un médico" text="Elija un médico en el formulario para ver sus horarios programados." />
        ) : horariosError ? (
          <ErrorBanner text={horariosError} onRetry={() => cargarHorarios(medicoId)} />
        ) : horariosLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <CitaCardSkeleton key={i} />)}</div>
        ) : horarios.length === 0 ? (
          <EmptyState title="Sin horarios" text="Este médico no tiene horarios programados desde hoy en adelante." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {horarios.map((h) => {
              const meta = HORARIO_ESTADO_META[h.estado] || HORARIO_ESTADO_META.DISPONIBLE;
              return (
                <article key={h.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{h.fecha}</p>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">{h.hora_inicio} - {h.hora_fin}</p>
                    <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>{meta.label}</span>
                  </div>
                  {h.estado !== "OCUPADA" && (
                    <button
                      onClick={() => setEliminarModal(h)}
                      aria-label="Eliminar horario"
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <EliminarHorarioModal horario={eliminarModal} onCancel={() => setEliminarModal(null)} onConfirm={confirmarEliminar} />
    </section>
  );
}

function PanelAdmin({ view, citas, refresh, pagination, setAdminPage }) {
  const [revisarModal, setRevisarModal] = useState(null); // { cita, modo }

  if (view === "Dashboard") {
    return <DashboardAdmin />;
  }

  if (view === "Disponibilidad") {
    return <DisponibilidadAdmin />;
  }

  if (view === "Gestión de Citas") {
    return <GestionCitas />;
  }

  if (view === "Médicos") {
    return <GestionMedicos />;
  }

  if (view === "Horarios") {
    return <GestionHorarios />;
  }

  // Más antigua primero: para que las solicitudes no atendidas no se acumulen sin verse.
  const lista = [...citas].sort((a, b) => (a.fecha_solicitud_cancelacion || "").localeCompare(b.fecha_solicitud_cancelacion || ""));

  const confirmarAprobar = async ({ reembolso }) => {
    const cita = revisarModal.cita;
    setRevisarModal(null);
    await apiRequest(`/citas/${cita.id}/aprobar-cancelacion/`, { method: "POST", body: JSON.stringify({ reembolso }) });
    await refresh();
  };

  const confirmarRechazar = async ({ comentario }) => {
    const cita = revisarModal.cita;
    setRevisarModal(null);
    await apiRequest(`/citas/${cita.id}/rechazar-cancelacion/`, { method: "POST", body: JSON.stringify({ comentario }) });
    await refresh();
  };

  return (
    <section className="space-y-5">
      <Header
        title="Cancelaciones Pendientes"
        subtitle="Solicitudes por aprobar o rechazar, ordenadas de la más antigua a la más reciente."
        action={<button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>}
      />
      {lista.length === 0 ? (
        <EmptyState title="No hay solicitudes pendientes" text="Todas las cancelaciones han sido atendidas. Vuelva a revisar más tarde." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Folio</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Médico</th>
                  <th className="px-4 py-3">Especialidad</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((cita) => (
                  <tr key={cita.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-extrabold text-slate-900">#{cita.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{cita.paciente}</span>
                      <span className="block text-xs text-slate-400">{cita.paciente_email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-800">{cita.medico}</span>
                      <span className="block text-xs text-slate-400">{cita.medico_email}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cita.especialidad}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{cita.fecha}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{cita.hora_inicio} - {cita.hora_fin}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={cita.estado} />
                    </td>
                    <td className="px-4 py-3">
                      {cita.estado === "SOLICITA_CANCELACION" ? (
                        <div className="flex gap-2">
                          <button onClick={() => setRevisarModal({ cita, modo: "aprobar" })} className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700">Aprobar</button>
                          <button onClick={() => setRevisarModal({ cita, modo: "rechazar" })} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Rechazar</button>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <RevisarCancelacionModal
        key={revisarModal ? `${revisarModal.cita.id}-${revisarModal.modo}` : "revisar"}
        cita={revisarModal?.cita}
        modo={revisarModal?.modo}
        onCancel={() => setRevisarModal(null)}
        onConfirm={revisarModal?.modo === "aprobar" ? confirmarAprobar : confirmarRechazar}
      />
      {pagination.total_pages > 1 && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Mostrando {lista.length} de {pagination.total} citas
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.has_previous}
              onClick={() => setAdminPage(pagination.page - 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-extrabold text-slate-700">
              {pagination.page} / {pagination.total_pages}
            </span>
            <button
              disabled={!pagination.has_next}
              onClick={() => setAdminPage(pagination.page + 1)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Header({ title, subtitle, action }) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="font-extrabold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-3">
      <span className="block text-[11px] font-bold uppercase text-slate-400">{label}</span>
      <strong className="text-slate-900">{value || "-"}</strong>
    </div>
  );
}

function BackButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
    >
      <IconChevronLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* Contenido compartido del sidebar (nav + próxima cita + usuario), usado
   tanto en el aside de escritorio como en el cajón móvil tipo hamburguesa. */
function SidebarContent({ nav, view, navigate, user, citas, logout }) {
  return (
    <>
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-blue-700">Clínica Int.</h1>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sistema de citas</p>
        </div>
        <nav className="space-y-2">
          {nav.map((item) => (
            <button key={item} onClick={() => navigate(item)} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-bold ${view === item ? "bg-blue-50 text-blue-700 border border-blue-200" : "text-slate-600 hover:bg-slate-50"}`}>
              {item}
            </button>
          ))}
        </nav>
      </div>
      <div className="border-t border-slate-100 pt-4">
        {user.role === "paciente" && (
          <div className="mb-4">
            <ProximaCitaWidget citas={citas} />
          </div>
        )}
        <div className="mb-4 rounded-xl bg-slate-50 p-3">
          <p className="truncate text-sm font-extrabold text-slate-900">{user.name}</p>
          <p className="text-xs font-bold capitalize text-slate-500">{user.role}</p>
        </div>
        <button onClick={logout} className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100">Cerrar sesión</button>
      </div>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("Login");
  const [citas, setCitas] = useState([]);
  const [catalogo, setCatalogo] = useState({ especialidades: [], medicos: [], agendas: [] });
  const [adminPage, setAdminPageState] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: 10, total_pages: 1, has_next: false, has_previous: false });
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const nav = useMemo(() => (user ? navByRole[user.role] : []), [user]);

  const buildCitasPath = useCallback((role, page, targetView) => {
    if (role !== "admin") return "/citas/";
    const params = new URLSearchParams({ page: String(page), page_size: "10" });
    if (targetView === "Cancelaciones") {
      params.set("estado", "SOLICITA_CANCELACION");
    }
    return `/citas/?${params.toString()}`;
  }, []);

  const loadData = useCallback(async (page = adminPage, targetView = view) => {
    const role = user?.role;
    setDataLoading(true);
    setDataError("");
    try {
      const citasPath = buildCitasPath(role, page, targetView);
      const [citasData, catalogoData] = await Promise.all([
        apiRequest(citasPath),
        apiRequest("/catalogo/"),
      ]);
      setCitas(citasData.citas);
      setPagination({
        total: citasData.total || citasData.citas.length,
        page: citasData.page || 1,
        page_size: citasData.page_size || citasData.citas.length || 10,
        total_pages: citasData.total_pages || 1,
        has_next: Boolean(citasData.has_next),
        has_previous: Boolean(citasData.has_previous),
      });
      setCatalogo(catalogoData);
    } catch (err) {
      setDataError(err.message || "No se pudieron cargar las citas.");
      throw err;
    } finally {
      setDataLoading(false);
    }
  }, [adminPage, buildCitasPath, user?.role, view]);

  const setAdminPage = async (page) => {
    setAdminPageState(page);
    await loadData(page, view);
  };

  const afterAuthSuccess = async (data) => {
    setToken(data.token);
    const home = roleHome[data.user.role];
    setUser(data.user);
    setView(home);
    setDataLoading(true);
    setDataError("");
    try {
      const [citasData, catalogoData] = await Promise.all([
        apiRequest(buildCitasPath(data.user.role, 1, home)),
        apiRequest("/catalogo/"),
      ]);
      setCitas(citasData.citas);
      setPagination({
        total: citasData.total || citasData.citas.length,
        page: citasData.page || 1,
        page_size: citasData.page_size || citasData.citas.length || 10,
        total_pages: citasData.total_pages || 1,
        has_next: Boolean(citasData.has_next),
        has_previous: Boolean(citasData.has_previous),
      });
      setCatalogo(catalogoData);
    } catch (loadError) {
      setDataError(loadError.message || "No se pudieron cargar las citas.");
      console.error("No se pudieron cargar datos iniciales", loadError);
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogin = async (creds) => {
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login/", { method: "POST", body: JSON.stringify(creds) });
      await afterAuthSuccess(data);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (datos) => {
    const data = await apiRequest("/auth/registro/", { method: "POST", body: JSON.stringify(datos) });
    await afterAuthSuccess(data);
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setCitas([]);
    setPagination({ total: 0, page: 1, page_size: 10, total_pages: 1, has_next: false, has_previous: false });
    setCatalogo({ especialidades: [], medicos: [], agendas: [] });
    setDataError("");
    setView("Login");
    setMobileNavOpen(false);
  };

  const navigate = async (nextView) => {
    setView(nextView);
    setAdminPageState(1);
    setMobileNavOpen(false);
    // Dashboard, Disponibilidad y Gestión de Citas se autoalimentan (fetch propio) y no
    // leen el estado compartido `citas`/`catalogo`. Pisarlo aquí solo introduce una
    // carrera: la respuesta de esta carga puede llegar después de que el admin vuelva a
    // "Cancelaciones" y sobrescribir la lista filtrada con una genérica sin filtro.
    if (user?.role === "admin" && nextView !== "Cancelaciones") {
      return;
    }
    try {
      await loadData(1, nextView);
    } catch (err) {
      if (err.message.includes("Token")) {
        logout();
      }
    }
  };

  useEffect(() => {
    const restore = async () => {
      if (!getToken()) return;
      try {
        const data = await apiRequest("/me/");
        const [citasData, catalogoData] = await Promise.all([
          apiRequest(buildCitasPath(data.user.role, 1, roleHome[data.user.role])),
          apiRequest("/catalogo/"),
        ]);
        setUser(data.user);
        setView(roleHome[data.user.role]);
        setCitas(citasData.citas);
        setPagination({
          total: citasData.total || citasData.citas.length,
          page: citasData.page || 1,
          page_size: citasData.page_size || citasData.citas.length || 10,
          total_pages: citasData.total_pages || 1,
          has_next: Boolean(citasData.has_next),
          has_previous: Boolean(citasData.has_previous),
        });
        setCatalogo(catalogoData);
      } catch {
        clearToken();
        setUser(null);
        setCitas([]);
        setPagination({ total: 0, page: 1, page_size: 10, total_pages: 1, has_next: false, has_previous: false });
        setCatalogo({ especialidades: [], medicos: [], agendas: [] });
      } finally {
        setBooting(false);
      }
    };
    restore();
  }, [buildCitasPath]);

  if (booting) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">Cargando sesión...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} loading={loading} />;
  }

  return (
    <div className="h-screen bg-slate-100 flex overflow-hidden">
      {/* Sidebar de escritorio */}
      <aside className="hidden md:flex w-72 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 p-5 flex-col justify-between overflow-y-auto">
        <SidebarContent nav={nav} view={view} navigate={navigate} user={user} citas={citas} logout={logout} />
      </aside>

      {/* Cajón móvil tipo hamburguesa */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileNavOpen(false)} />
          <div className="relative flex w-72 max-w-[85vw] flex-col justify-between bg-white p-5 shadow-2xl">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Cerrar menú"
            >
              <IconClose className="h-5 w-5" />
            </button>
            <SidebarContent nav={nav} view={view} navigate={navigate} user={user} citas={citas} logout={logout} />
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mb-4 flex md:hidden items-center justify-between rounded-xl bg-white p-3 border border-slate-200">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            aria-label="Abrir menú de navegación"
          >
            <IconMenu className="h-5 w-5" />
            {view}
          </button>
          <button onClick={logout} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Salir</button>
        </div>
        {user.role === "paciente" && <PanelPaciente view={view} setView={setView} user={user} citas={citas} catalogo={catalogo} refresh={loadData} loading={dataLoading} error={dataError} />}
        {user.role === "medico" && <PanelMedico view={view} setView={setView} citas={citas} refresh={loadData} user={user} />}
        {user.role === "admin" && <PanelAdmin view={view} citas={citas} refresh={() => loadData(pagination.page, view)} pagination={pagination} setAdminPage={setAdminPage} />}
      </main>
    </div>
  );
}
