import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Login from "./Login";
import { apiRequest, clearToken, getToken, setToken } from "./api";

const roleHome = { paciente: "Mis Citas", medico: "Agenda Médica", admin: "Dashboard" };

const navByRole = {
  paciente: ["Mis Citas", "Reservar Cita", "Canales de Atención"],
  medico: ["Agenda Médica"],
  admin: ["Dashboard", "Gestión de Citas", "Cancelaciones"],
};

const estadoStyle = {
  PROGRAMADA: "bg-green-50 text-green-700 border-green-200",
  SOLICITA_CANCELACION: "bg-amber-50 text-amber-700 border-amber-200",
  CANCELADA: "bg-red-50 text-red-700 border-red-200",
  ASISTIDA: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function money(value) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

function CitaCard({ cita, actions }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
            {cita.especialidad}
          </span>
          <h3 className="mt-3 text-base font-extrabold text-slate-900">{cita.medico}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{cita.paciente}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${estadoStyle[cita.estado] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
          {cita.estado.replace("_", " ")}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block font-bold text-slate-400">Fecha</span>
          <strong className="text-slate-800">{cita.fecha}</strong>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <span className="block font-bold text-slate-400">Hora</span>
          <strong className="text-slate-800">{cita.hora_inicio} - {cita.hora_fin}</strong>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
        Folio #{cita.id} · {cita.sede} · {cita.modalidad}
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </article>
  );
}

function PanelPaciente({ view, setView, user, citas, catalogo, refresh }) {
  const [step, setStep] = useState(1);
  const [reserva, setReserva] = useState({ especialidadId: "", medicoId: "", agendaId: "", modalidad: "PRESENCIAL", motivo: "" });
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState("");
  const paymentTimer = useRef(null);

  const medicos = catalogo.medicos
    .filter((m) => String(m.especialidad_id) === String(reserva.especialidadId))
    .sort((a, b) => Number(b.correo === "medico@clinica.com") - Number(a.correo === "medico@clinica.com"));
  const agendas = catalogo.agendas.filter((a) => String(a.medico_id) === String(reserva.medicoId));
  const selectedAgenda = catalogo.agendas.find((a) => String(a.id) === String(reserva.agendaId));
  const selectedDoctor = catalogo.medicos.find((m) => String(m.id) === String(reserva.medicoId));
  const selectedEsp = catalogo.especialidades.find((e) => String(e.id) === String(reserva.especialidadId));

  const reset = () => {
    setStep(1);
    setReserva({ especialidadId: "", medicoId: "", agendaId: "", modalidad: "PRESENCIAL", motivo: "" });
    setMessage("");
  };

  const solicitarCancelacion = async (id) => {
    await apiRequest(`/citas/${id}/solicitar-cancelacion/`, { method: "POST" });
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
            motivo_consulta: reserva.motivo || "Consulta programada desde prototipo",
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
    return (
      <section className="space-y-5">
        <Header title="Mis Citas Médicas" subtitle="Citas visibles solo para el paciente autenticado." action={<button onClick={() => { reset(); setView("Reservar Cita"); }} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Nueva cita</button>} />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {citas.length === 0 ? (
            <EmptyState title="No tiene citas registradas" text="Reserve una cita seleccionando especialidad, médico y horario disponible." />
          ) : (
            citas.map((cita) => (
              <CitaCard
                key={cita.id}
                cita={cita}
                actions={cita.estado === "PROGRAMADA" && (
                  <button onClick={() => solicitarCancelacion(cita.id)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">
                    Solicitar cancelación
                  </button>
                )}
              />
            ))
          )}
        </div>
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

  return (
    <section className="space-y-5">
      <Header title="Reservar Cita" subtitle="Seleccione disponibilidad real del backend. El pago es una simulación visual del prototipo." />
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {step < 5 && (
          <div className="mb-6 grid grid-cols-4 gap-2">
            {["Especialidad", "Médico", "Horario", "Pago"].map((label, index) => (
              <div key={label} className={`rounded-lg px-3 py-2 text-center text-xs font-extrabold ${step === index + 1 ? "bg-blue-600 text-white" : step > index + 1 ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                {label}
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {catalogo.especialidades.map((esp) => (
              <button key={esp.id} onClick={() => { setReserva({ ...reserva, especialidadId: esp.id, medicoId: "", agendaId: "" }); setStep(2); }} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                <strong className="text-slate-900">{esp.nombre}</strong>
                <span className="mt-2 block text-sm text-slate-500">{esp.descripcion}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <BackButton onClick={() => setStep(1)} label="Cambiar especialidad" />
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Para probar el panel médico, reserve con <strong>Dr. Alejandro Mendoza</strong>. Su usuario de acceso es <strong>medico@clinica.com</strong>.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medicos.map((medico) => (
                <button key={medico.id} onClick={() => { setReserva({ ...reserva, medicoId: medico.id, agendaId: "" }); setStep(3); }} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-slate-900">{medico.nombre}</strong>
                    {medico.correo === "medico@clinica.com" && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-extrabold text-green-700 border border-green-200">
                        Acceso demo médico
                      </span>
                    )}
                  </div>
                  <span className="mt-1 block text-sm text-slate-500">CMP {medico.cmp} · {medico.sede}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-400">{medico.correo}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <BackButton onClick={() => setStep(2)} label="Cambiar médico" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {agendas.length === 0 ? (
                <EmptyState title="Sin horarios disponibles" text="Seleccione otro médico o cargue agendas demo desde Django." />
              ) : agendas.map((agenda) => (
                <button key={agenda.id} onClick={() => { setReserva({ ...reserva, agendaId: agenda.id }); setStep(4); }} className="rounded-xl border border-slate-200 p-4 text-left hover:border-blue-300 hover:bg-blue-50">
                  <strong className="block text-slate-900">{agenda.fecha}</strong>
                  <span className="text-sm font-bold text-blue-700">{agenda.hora_inicio} - {agenda.hora_fin}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <BackButton onClick={() => setStep(3)} label="Cambiar horario" />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-extrabold text-slate-900">Resumen de cita</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Summary label="Paciente" value={user.name} />
                <Summary label="Especialidad" value={selectedEsp?.nombre} />
                <Summary label="Médico" value={selectedDoctor?.nombre} />
                <Summary label="Fecha y hora" value={`${selectedAgenda?.fecha} ${selectedAgenda?.hora_inicio}`} />
                <Summary label="Modalidad" value={reserva.modalidad} />
                <Summary label="Monto a pagar" value={money(80)} />
              </div>
              <textarea value={reserva.motivo} onChange={(event) => setReserva({ ...reserva, motivo: event.target.value })} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500" placeholder="Motivo de consulta opcional" />
            </div>
            {message && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p>}
            <button onClick={confirmarPago} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700">
              Confirmar pago y programar cita
            </button>
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

      {paying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            <h3 className="mt-5 text-lg font-extrabold text-slate-900">Procesando pago</h3>
            <p className="mt-2 text-sm text-slate-500">Monto: {money(80)}. Confirmando operación del prototipo.</p>
          </div>
        </div>
      )}
    </section>
  );
}

function PanelMedico({ citas, refresh }) {
  const [message, setMessage] = useState("");

  const runAction = async (path) => {
    setMessage("");
    try {
      await apiRequest(path, { method: "POST" });
      await refresh();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="space-y-5">
      <Header title="Agenda Médica" subtitle="Citas asignadas al médico autenticado. La asistencia solo se permite desde la hora de la cita." />
      {message && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800 border border-amber-200">{message}</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {citas.length === 0 ? <EmptyState title="Sin citas asignadas" text="No hay citas para este médico." /> : citas.map((cita) => (
          <CitaCard
            key={cita.id}
            cita={cita}
            actions={cita.estado === "PROGRAMADA" && (
              <>
                <button onClick={() => runAction(`/citas/${cita.id}/asistir/`)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">Marcar asistido</button>
                <button onClick={() => runAction(`/citas/${cita.id}/solicitar-cancelacion/`)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100">Solicitar cancelación</button>
              </>
            )}
          />
        ))}
      </div>
    </section>
  );
}

function BarChart({ title, data }) {
  const max = Math.max(1, ...data.map((item) => item.total));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-extrabold text-slate-900">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="text-sm font-semibold text-slate-400">Sin datos para mostrar.</p>
        ) : data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex justify-between gap-3 text-xs font-bold text-slate-500">
              <span className="truncate">{item.label}</span>
              <span>{item.total}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${(item.total / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardAdmin({ dashboard, refresh }) {
  const metrics = dashboard.metricas || {};
  const cards = [
    ["Total citas", metrics.total_citas || 0],
    ["Programadas", metrics.programadas || 0],
    ["Asistidas", metrics.asistidas || 0],
    ["Canceladas", metrics.canceladas || 0],
    ["Cancelaciones pendientes", metrics.cancelaciones_pendientes || 0],
    ["Horarios disponibles", metrics.agendas_disponibles || 0],
  ];

  return (
    <section className="space-y-5">
      <Header
        title="Dashboard Administrativo"
        subtitle="Métricas principales calculadas desde la base local PostgreSQL."
        action={<button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold uppercase text-slate-400">{label}</span>
            <strong className="mt-2 block text-3xl font-extrabold text-slate-900">{value}</strong>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <BarChart title="Citas por estado" data={dashboard.por_estado || []} />
        <BarChart title="Citas por especialidad" data={dashboard.por_especialidad || []} />
        <BarChart title="Próximos 7 días" data={dashboard.proximos_dias || []} />
      </div>
    </section>
  );
}

function PanelAdmin({ view, citas, refresh, pagination, setAdminPage, dashboard }) {
  if (view === "Dashboard") {
    return <DashboardAdmin dashboard={dashboard} refresh={refresh} />;
  }

  const lista = citas;

  const action = async (path) => {
    await apiRequest(path, { method: "POST" });
    await refresh();
  };

  return (
    <section className="space-y-5">
      <Header
        title={view === "Cancelaciones" ? "Cancelaciones Pendientes" : "Gestión de Citas"}
        subtitle={view === "Cancelaciones" ? "Solicitudes por aprobar o rechazar." : `Vista administrativa paginada. Total en base: ${pagination.total}. Página ${pagination.page} de ${pagination.total_pages}.`}
        action={<button onClick={refresh} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Actualizar</button>}
      />
      {lista.length === 0 ? (
        <EmptyState title="Sin registros" text="No hay citas para mostrar en esta vista. Use Actualizar después de registrar una cita." />
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
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${estadoStyle[cita.estado] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {cita.estado.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cita.estado === "SOLICITA_CANCELACION" ? (
                        <div className="flex gap-2">
                          <button onClick={() => action(`/citas/${cita.id}/aprobar-cancelacion/`)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700">Aprobar</button>
                          <button onClick={() => action(`/citas/${cita.id}/rechazar-cancelacion/`)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Rechazar</button>
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
    <button onClick={onClick} className="text-sm font-bold text-slate-500 hover:text-blue-700">
      Volver: {label}
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("Login");
  const [citas, setCitas] = useState([]);
  const [catalogo, setCatalogo] = useState({ especialidades: [], medicos: [], agendas: [] });
  const [dashboard, setDashboard] = useState({ metricas: {}, por_estado: [], por_especialidad: [], proximos_dias: [] });
  const [adminPage, setAdminPageState] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: 10, total_pages: 1, has_next: false, has_previous: false });
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(Boolean(getToken()));

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
    if (role === "admin") {
      try {
        setDashboard(await apiRequest("/dashboard/"));
      } catch (dashboardError) {
        console.error("No se pudo cargar dashboard", dashboardError);
      }
    }
  }, [adminPage, buildCitasPath, user?.role, view]);

  const setAdminPage = async (page) => {
    setAdminPageState(page);
    await loadData(page, view);
  };

  const handleLogin = async (creds) => {
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login/", { method: "POST", body: JSON.stringify(creds) });
      setToken(data.token);
      const home = roleHome[data.user.role];
      setUser(data.user);
      setView(home);
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
        if (data.user.role === "admin") {
          try {
            setDashboard(await apiRequest("/dashboard/"));
          } catch (dashboardError) {
            console.error("No se pudo cargar dashboard", dashboardError);
          }
        }
      } catch (loadError) {
        console.error("No se pudieron cargar datos iniciales", loadError);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setCitas([]);
    setDashboard({ metricas: {}, por_estado: [], por_especialidad: [], proximos_dias: [] });
    setPagination({ total: 0, page: 1, page_size: 10, total_pages: 1, has_next: false, has_previous: false });
    setCatalogo({ especialidades: [], medicos: [], agendas: [] });
    setView("Login");
  };

  const navigate = async (nextView) => {
    setView(nextView);
    setAdminPageState(1);
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
        if (data.user.role === "admin") {
          try {
            setDashboard(await apiRequest("/dashboard/"));
          } catch (dashboardError) {
            console.error("No se pudo cargar dashboard", dashboardError);
          }
        }
      } catch {
        clearToken();
        setUser(null);
        setCitas([]);
        setDashboard({ metricas: {}, por_estado: [], por_especialidad: [], proximos_dias: [] });
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
    return <Login onLogin={handleLogin} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 p-5 flex-col justify-between">
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
          <div className="mb-4 rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-extrabold text-slate-900">{user.name}</p>
            <p className="text-xs font-bold capitalize text-slate-500">{user.role}</p>
          </div>
          <button onClick={logout} className="w-full rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100">Cerrar sesión</button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="mb-4 flex md:hidden items-center justify-between rounded-xl bg-white p-3 border border-slate-200">
          <select value={view} onChange={(event) => navigate(event.target.value)} className="rounded-lg border border-slate-200 p-2 text-sm font-bold">
            {nav.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button onClick={logout} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">Salir</button>
        </div>
        {user.role === "paciente" && <PanelPaciente view={view} setView={setView} user={user} citas={citas} catalogo={catalogo} refresh={loadData} />}
        {user.role === "medico" && <PanelMedico citas={citas} refresh={loadData} />}
        {user.role === "admin" && <PanelAdmin view={view} citas={citas} refresh={() => loadData(pagination.page, view)} pagination={pagination} setAdminPage={setAdminPage} dashboard={dashboard} />}
      </main>
    </div>
  );
}
