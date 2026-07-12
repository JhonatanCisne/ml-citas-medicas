import { useState } from "react";

const quickUsers = {
  paciente: { label: "Paciente", email: "paciente@clinica.com", password: "Paciente123" },
  medico: { label: "Médico", email: "medico@clinica.com", password: "Medico123" },
  admin: { label: "Administrador", email: "admin@clinica.com", password: "Admin123" },
};

export default function Login({ onLogin, loading }) {
  const [email, setEmail] = useState("paciente@clinica.com");
  const [password, setPassword] = useState("Paciente123");
  const [error, setError] = useState("");

  const submit = async (creds) => {
    const payload = creds || { email, password };
    if (!payload.email || !payload.password) {
      setError("Complete el correo y la contraseña.");
      return;
    }
    setError("");
    try {
      await onLogin(payload);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    submit();
  };

  const handleQuickAccess = (role) => {
    const creds = quickUsers[role];
    setEmail(creds.email);
    setPassword(creds.password);
    submit(creds);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="bg-blue-700 text-white p-8 lg:p-10 flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center mb-8">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" d="M19 10.5V20a2 2 0 01-2 2H7a2 2 0 01-2-2v-9.5M12 4v4m-3-2h6M4 10h16" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">Clínica Internacional</h1>
            <p className="text-blue-100 mt-4 max-w-md leading-relaxed">
              Gestión local de citas médicas con acceso separado para pacientes, médicos y administración.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl bg-white/10 border border-white/15 p-3">
              <span className="block text-blue-100">Paciente</span>
              <strong>Reserva y pago visual</strong>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 p-3">
              <span className="block text-blue-100">Médico</span>
              <strong>Agenda asignada</strong>
            </div>
            <div className="rounded-xl bg-white/10 border border-white/15 p-3">
              <span className="block text-blue-100">Admin</span>
              <strong>Cancelaciones</strong>
            </div>
          </div>
        </section>

        <section className="p-8 lg:p-10">
          <h2 className="text-2xl font-extrabold text-slate-900">Inicio de sesión</h2>
          <p className="text-sm text-slate-500 mt-1">Use un usuario demo o ingrese las credenciales del archivo `usuarios_demo.txt`.</p>

          {error && (
            <div className="mt-5 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="correo@clinica.com"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Contraseña"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Validando..." : "Entrar al panel"}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Acceso rápido</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(quickUsers).map(([role, user]) => (
              <button
                key={role}
                type="button"
                onClick={() => handleQuickAccess(role)}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60"
              >
                <span className="block text-sm font-extrabold text-blue-700">{user.label}</span>
                <span className="block truncate text-[11px] font-semibold text-slate-500">{user.email}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
