import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("paciente@clinica.com");
  const [password, setPassword] = useState("12345678");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Por favor complete todos los campos.");
      return;
    }
    
    // Normal login check
    if (onLogin) {
      onLogin({ email, password });
    }
  };

  const handleQuickAccess = (selectedRole) => {
    const creds = {
      admin: { email: "admin@clinica.com", password: "12345678" },
      paciente: { email: "paciente@clinica.com", password: "12345678" }
    }[selectedRole];
    
    setEmail(creds.email);
    setPassword(creds.password);
    setError("");
    if (onLogin) {
      onLogin(creds);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100 transition-all duration-300 hover:shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-3 border border-blue-100 shadow-sm">
            <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9.5M12 4v4m-3-2h6M4 10h16" />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Clínica Internacional</h2>
          <p className="text-slate-500 text-sm mt-1">Sistema Inteligente de Citas Médicas</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Correo institucional / Paciente</label>
            <div className="relative">
              <input
                type="email"
                className="w-full pl-4 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="correo@clinica.com"
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Contraseña</label>
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium">¿Olvidó su contraseña?</a>
            </div>
            <input
              type="password"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-800 bg-slate-50/50 hover:bg-slate-50 transition"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              placeholder="********"
              autoComplete="current-password"
            />
          </div>
          <div className="flex items-center justify-between text-xs py-1">
            <label className="flex items-center text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mr-2"
              />
              Recordarme en este dispositivo
            </label>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-150 text-sm"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="my-6 flex items-center justify-center">
          <span className="h-px bg-slate-200 flex-grow"></span>
          <span className="mx-3 text-slate-400 text-xs font-semibold uppercase tracking-wider">Demostración</span>
          <span className="h-px bg-slate-200 flex-grow"></span>
        </div>

        <div className="space-y-2.5">
          <p className="text-center text-xs text-slate-500 font-medium mb-1">Haga clic para acceder rápidamente al prototipo:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAccess("paciente")}
              type="button"
              className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition text-center group cursor-pointer"
            >
              <span className="text-xs font-bold text-blue-700">Paciente Demo</span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium group-hover:text-blue-600">paciente@clinica.com</span>
            </button>
            <button
              onClick={() => handleQuickAccess("admin")}
              type="button"
              className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition text-center group cursor-pointer"
            >
              <span className="text-xs font-bold text-blue-700">Administrador</span>
              <span className="text-[10px] text-slate-500 mt-0.5 font-medium group-hover:text-blue-600">admin@clinica.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
