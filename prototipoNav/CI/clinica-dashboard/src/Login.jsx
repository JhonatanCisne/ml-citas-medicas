import { useState } from "react";

const REGISTRO_INICIAL = {
  nombres: "",
  apellidos: "",
  dni: "",
  correo: "",
  telefono: "",
  direccion: "",
  fecha_nacimiento: "",
  password: "",
  confirmar: "",
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

function IconEye({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconEyeOff({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

const CAMPO_BASE =
  "mt-1 w-full rounded-xl border bg-slate-50 px-4 py-3 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const CAMPO_BASE_SM =
  "mt-1 w-full rounded-xl border bg-slate-50 px-4 py-2.5 pr-11 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function ToggleMostrarPassword({ mostrar, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
      tabIndex={-1}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded-r-xl"
    >
      {mostrar ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
    </button>
  );
}

export default function Login({ onLogin, onRegister, loading }) {
  const [modo, setModo] = useState("login"); // "login" | "registro"
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState("");
  const [mostrarAyudaPassword, setMostrarAyudaPassword] = useState(false);

  const [registro, setRegistro] = useState(REGISTRO_INICIAL);
  const [erroresRegistro, setErroresRegistro] = useState({});
  const [registrando, setRegistrando] = useState(false);
  const [mostrarPasswordRegistro, setMostrarPasswordRegistro] = useState(false);
  const [mostrarConfirmarRegistro, setMostrarConfirmarRegistro] = useState(false);

  const emailError = emailTouched && email && !EMAIL_REGEX.test(email.trim()) ? "Formato de correo inválido." : "";

  const submit = async (event) => {
    event.preventDefault();
    setEmailTouched(true);
    if (!email || !password) {
      setError("Complete el correo y la contraseña.");
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Ingrese un correo con un formato válido.");
      return;
    }
    setError("");
    try {
      await onLogin({ email: email.trim(), password });
    } catch (err) {
      setError(err.message || "Credenciales inválidas.");
    }
  };

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setError("");
    setErroresRegistro({});
  };

  const actualizarRegistro = (campo, valor) => {
    setRegistro((prev) => ({ ...prev, [campo]: valor }));
  };

  const submitRegistro = async (event) => {
    event.preventDefault();
    const errores = {};
    if (!registro.nombres.trim()) errores.nombres = "Campo obligatorio.";
    if (!registro.apellidos.trim()) errores.apellidos = "Campo obligatorio.";
    if (!/^\d{8}$/.test(registro.dni.trim())) errores.dni = "El DNI debe tener 8 dígitos.";
    if (!EMAIL_REGEX.test(registro.correo.trim())) errores.correo = "Correo inválido.";
    if (registro.password.length < 6) errores.password = "Debe tener al menos 6 caracteres.";
    else if (registro.password !== registro.confirmar) errores.confirmar = "Las contraseñas no coinciden.";

    if (Object.keys(errores).length > 0) {
      setErroresRegistro(errores);
      return;
    }

    setErroresRegistro({});
    setRegistrando(true);
    try {
      await onRegister({
        nombres: registro.nombres.trim(),
        apellidos: registro.apellidos.trim(),
        dni: registro.dni.trim(),
        correo: registro.correo.trim(),
        telefono: registro.telefono.trim(),
        direccion: registro.direccion.trim(),
        fecha_nacimiento: registro.fecha_nacimiento,
        password: registro.password,
      });
    } catch (err) {
      if (err.fieldErrors) {
        setErroresRegistro(err.fieldErrors);
      } else {
        setErroresRegistro({ general: err.message });
      }
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-blue-700">Clínica Internacional</h1>
          <p className="text-sm text-slate-500 mt-2">Acceso unificado para pacientes, médicos y administración.</p>
        </div>

        {modo === "login" ? (
          <>
            {error && (
              <div role="alert" aria-live="polite" className="mb-5 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="login-email" className="text-sm font-bold text-slate-700">Correo</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={emailError ? "login-email-error" : undefined}
                  className={`mt-1 w-full rounded-xl border ${emailError ? "border-red-300" : "border-slate-200"} bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100`}
                  placeholder="correo@clinica.com"
                  autoComplete="username"
                />
                {emailError && (
                  <p id="login-email-error" className="mt-1 text-xs font-bold text-red-600">{emailError}</p>
                )}
              </div>
              <div>
                <label htmlFor="login-password" className="text-sm font-bold text-slate-700">Contraseña</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={mostrarPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={CAMPO_BASE}
                    placeholder="Contraseña"
                    autoComplete="current-password"
                  />
                  <ToggleMostrarPassword mostrar={mostrarPassword} onClick={() => setMostrarPassword((v) => !v)} />
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setMostrarAyudaPassword((v) => !v)}
                    className="text-xs font-bold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                {mostrarAyudaPassword && (
                  <p className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2">
                    Por seguridad, el restablecimiento de contraseña lo gestiona el administrador del sistema. Contáctalo para continuar.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
              >
                {loading ? "Validando..." : "Entrar al panel"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿Eres paciente y no tienes cuenta?{" "}
              <button type="button" onClick={() => cambiarModo("registro")} className="font-bold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded">
                Regístrate
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-lg font-extrabold text-slate-900 text-center -mt-2 mb-6">Crear cuenta de paciente</h2>

            {erroresRegistro.general && (
              <div role="alert" aria-live="polite" className="mb-5 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold">
                {erroresRegistro.general}
              </div>
            )}

            <form onSubmit={submitRegistro} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-nombres" className="text-sm font-bold text-slate-700">Nombres *</label>
                  <input
                    id="reg-nombres"
                    value={registro.nombres}
                    onChange={(event) => actualizarRegistro("nombres", event.target.value)}
                    aria-invalid={Boolean(erroresRegistro.nombres)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  {erroresRegistro.nombres && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.nombres}</p>}
                </div>
                <div>
                  <label htmlFor="reg-apellidos" className="text-sm font-bold text-slate-700">Apellidos *</label>
                  <input
                    id="reg-apellidos"
                    value={registro.apellidos}
                    onChange={(event) => actualizarRegistro("apellidos", event.target.value)}
                    aria-invalid={Boolean(erroresRegistro.apellidos)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  {erroresRegistro.apellidos && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.apellidos}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-dni" className="text-sm font-bold text-slate-700">DNI *</label>
                  <input
                    id="reg-dni"
                    value={registro.dni}
                    onChange={(event) => actualizarRegistro("dni", event.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="8 dígitos"
                    aria-invalid={Boolean(erroresRegistro.dni)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  {erroresRegistro.dni && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.dni}</p>}
                </div>
                <div>
                  <label htmlFor="reg-correo" className="text-sm font-bold text-slate-700">Correo *</label>
                  <input
                    id="reg-correo"
                    type="email"
                    value={registro.correo}
                    onChange={(event) => actualizarRegistro("correo", event.target.value)}
                    aria-invalid={Boolean(erroresRegistro.correo)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                  {erroresRegistro.correo && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.correo}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-telefono" className="text-sm font-bold text-slate-700">Teléfono</label>
                  <input
                    id="reg-telefono"
                    value={registro.telefono}
                    onChange={(event) => actualizarRegistro("telefono", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label htmlFor="reg-fecha-nacimiento" className="text-sm font-bold text-slate-700">Fecha de nacimiento</label>
                  <input
                    id="reg-fecha-nacimiento"
                    type="date"
                    value={registro.fecha_nacimiento}
                    onChange={(event) => actualizarRegistro("fecha_nacimiento", event.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-direccion" className="text-sm font-bold text-slate-700">Dirección</label>
                <input
                  id="reg-direccion"
                  value={registro.direccion}
                  onChange={(event) => actualizarRegistro("direccion", event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-password" className="text-sm font-bold text-slate-700">Contraseña *</label>
                  <div className="relative">
                    <input
                      id="reg-password"
                      type={mostrarPasswordRegistro ? "text" : "password"}
                      value={registro.password}
                      onChange={(event) => actualizarRegistro("password", event.target.value)}
                      aria-invalid={Boolean(erroresRegistro.password)}
                      className={CAMPO_BASE_SM}
                      autoComplete="new-password"
                    />
                    <ToggleMostrarPassword mostrar={mostrarPasswordRegistro} onClick={() => setMostrarPasswordRegistro((v) => !v)} />
                  </div>
                  {erroresRegistro.password && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.password}</p>}
                </div>
                <div>
                  <label htmlFor="reg-confirmar" className="text-sm font-bold text-slate-700">Confirmar contraseña *</label>
                  <div className="relative">
                    <input
                      id="reg-confirmar"
                      type={mostrarConfirmarRegistro ? "text" : "password"}
                      value={registro.confirmar}
                      onChange={(event) => actualizarRegistro("confirmar", event.target.value)}
                      aria-invalid={Boolean(erroresRegistro.confirmar)}
                      className={CAMPO_BASE_SM}
                      autoComplete="new-password"
                    />
                    <ToggleMostrarPassword mostrar={mostrarConfirmarRegistro} onClick={() => setMostrarConfirmarRegistro((v) => !v)} />
                  </div>
                  {erroresRegistro.confirmar && <p className="mt-1 text-xs font-bold text-red-600">{erroresRegistro.confirmar}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={registrando}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/15 hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2"
              >
                {registrando ? "Creando cuenta..." : "Crear cuenta"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <button type="button" onClick={() => cambiarModo("login")} className="font-bold text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 rounded">
                Inicia sesión
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
