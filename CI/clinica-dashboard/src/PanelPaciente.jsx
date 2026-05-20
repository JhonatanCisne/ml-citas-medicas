import React, { useState } from "react";

// Lista de Especialidades con iconos, colores y descripción
const especialidades = [
  {
    id: "cardio",
    nombre: "Cardiología",
    descripcion: "Prevención, diagnóstico y tratamiento de enfermedades cardiovasculares.",
    color: "rose",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    id: "neuro",
    nombre: "Neurología",
    descripcion: "Tratamiento de trastornos del sistema nervioso, cerebro y médula espinal.",
    color: "indigo",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: "gastro",
    nombre: "Gastroenterología",
    descripcion: "Especialistas del aparato digestivo y órganos asociados.",
    color: "emerald",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: "pedia",
    nombre: "Pediatría",
    descripcion: "Cuidado médico integral de bebés, niños y adolescentes.",
    color: "amber",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "general",
    nombre: "Medicina General",
    descripcion: "Atención primaria, diagnóstico inicial y control de salud general.",
    color: "sky",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

// Médicos agrupados por especialidad
const medicos = {
  Cardiología: [
    { nombre: "Dr. Alejandro Mendoza", consultorio: "Cons. 04", rating: "4.9", reviews: 124, exp: "15 años exp." },
    { nombre: "Dra. Sofía Valdivia", consultorio: "Cons. 08", rating: "4.8", reviews: 92, exp: "10 años exp." },
  ],
  Neurología: [
    { nombre: "Dra. Beatriz Silva", consultorio: "Cons. 02", rating: "4.9", reviews: 145, exp: "12 años exp." },
    { nombre: "Dr. Tomás Ortega", consultorio: "Cons. 06", rating: "4.7", reviews: 88, exp: "9 años exp." },
  ],
  Gastroenterología: [
    { nombre: "Dr. Roberto Paz", consultorio: "Cons. 01", rating: "4.8", reviews: 110, exp: "14 años exp." },
    { nombre: "Dra. Elena Torres", consultorio: "Cons. 05", rating: "4.9", reviews: 130, exp: "11 años exp." },
  ],
  Pediatría: [
    { nombre: "Dra. Liliana Castro", consultorio: "Cons. 03", rating: "4.9", reviews: 210, exp: "18 años exp." },
    { nombre: "Dr. Daniel Rojas", consultorio: "Cons. 07", rating: "4.8", reviews: 105, exp: "8 años exp." },
  ],
  "Medicina General": [
    { nombre: "Dr. Mateo Salazar", consultorio: "Cons. 09", rating: "4.6", reviews: 180, exp: "6 años exp." },
    { nombre: "Dra. Camila Fuentes", consultorio: "Cons. 10", rating: "4.7", reviews: 140, exp: "7 años exp." },
  ],
};

const turnosDisponibles = ["09:00 AM", "10:00 AM", "11:30 AM", "03:00 PM", "04:30 PM", "06:00 PM"];

export default function PanelPaciente({ usuario, citas, setCitas, vistaPaciente, setVistaPaciente, onLogout }) {
  const [vistaCitasSub, setVistaCitasSub] = useState("lista"); // "lista" | "calendario"
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(4); // 4 = Mayo
  const [selectedDayInfo, setSelectedDayInfo] = useState(null); // Para mostrar citas de un día
  
  // Estados para reserva
  const [reservaStep, setReservaStep] = useState(1); // 1: Especialidad, 2: Médico, 3: Fecha/Hora, 4: Confirmación, 5: Éxito
  const [reservaData, setReservaData] = useState({
    especialidad: "",
    medico: "",
    consultorio: "",
    fecha: "",
    hora: "",
  });

  // Citas exclusivas del paciente logueado
  const citasPaciente = citas.filter((cita) => cita.pacienteEmail === usuario.email);

  const handleCancelar = (id) => {
    setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estado: "Cancelado" } : c)));
  };

  const handleConfirmarReserva = () => {
    const nuevaCita = {
      id: Math.floor(Math.random() * 9000) + 1000,
      paciente: usuario.nombre,
      pacienteEmail: usuario.email,
      especialidad: reservaData.especialidad,
      medico: reservaData.medico,
      consultorio: reservaData.consultorio,
      fecha: reservaData.fecha,
      hora: reservaData.hora,
      estado: "Confirmado",
      riesgo: "Riesgo Bajo",
      riesgoColor: "green",
    };

    setCitas((prev) => [...prev, nuevaCita]);
    setReservaStep(5); // Ir a pantalla de éxito
  };

  const resetFormReserva = () => {
    setReservaStep(1);
    setReservaData({ especialidad: "", medico: "", consultorio: "", fecha: "", hora: "" });
  };

  // Helper para generar días del mes
  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    let firstDay = date.getDay();
    // Convertir para que Lunes = 0 y Domingo = 6
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(i);
    }
    return days;
  };

  const daysGrid = getDaysInMonth(currentYear, currentMonth);
  const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handleMonthPrev = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDayInfo(null);
  };

  const handleMonthNext = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDayInfo(null);
  };

  // Retorna citas para un día específico
  const getCitasPorDia = (dia) => {
    if (!dia) return [];
    const mesStr = (currentMonth + 1).toString().padStart(2, "0");
    const diaStr = dia.toString().padStart(2, "0");
    const fechaBuscada = `${currentYear}-${mesStr}-${diaStr}`;
    return citasPaciente.filter((c) => c.fecha === fechaBuscada && c.estado !== "Cancelado");
  };

  const renderFiltroEspecialidadColor = (esp) => {
    const cardColors = {
      rose: "border-rose-200 bg-rose-50/30 text-rose-700",
      indigo: "border-indigo-200 bg-indigo-50/30 text-indigo-700",
      emerald: "border-emerald-200 bg-emerald-50/30 text-emerald-700",
      amber: "border-amber-200 bg-amber-50/30 text-amber-700",
      sky: "border-sky-200 bg-sky-50/30 text-sky-700",
    };
    const spec = especialidades.find(e => e.nombre === esp);
    return cardColors[spec?.color || "sky"];
  };

  return (
    <div className="space-y-6 animate-fade-in h-full">
      {/* Cabecera del Panel */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800">
            {vistaPaciente === "Mis Citas" ? "Mis Citas Médicas" : 
             vistaPaciente === "Reservar Cita" ? "Nueva Reserva de Cita" : 
             "Canales de Atención"}
          </h2>
          <p className="text-slate-500 mt-1">
            {vistaPaciente === "Mis Citas" ? "Visualice y administre sus programaciones de consulta." : 
             vistaPaciente === "Reservar Cita" ? "Seleccione especialidad, médico y horario para su consulta médica." : 
             "Medios de comunicación directa, telemedicina e información de contacto."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 text-sm font-semibold text-slate-600">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <button
            onClick={onLogout}
            className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 border border-red-100 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* --- VISTA: MIS CITAS --- */}
      {vistaPaciente === "Mis Citas" && (
        <div className="space-y-6">
          {/* Selector de tipo de vista */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setVistaCitasSub("lista")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  vistaCitasSub === "lista"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Vista de Lista
              </button>
              <button
                onClick={() => setVistaCitasSub("calendario")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  vistaCitasSub === "calendario"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Vista de Calendario
              </button>
            </div>
            <button
              onClick={() => {
                resetFormReserva();
                setVistaPaciente("Reservar Cita");
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              Nueva Cita
            </button>
          </div>

          {/* VISTA CITAS SUB: LISTA */}
          {vistaCitasSub === "lista" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {citasPaciente.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-100 rounded-2xl p-10 text-center shadow-sm">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No tienes citas médicas activas</h3>
                  <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">Programa una nueva cita desde el asistente para agendar una hora de consulta con el especialista correspondiente.</p>
                  <button
                    onClick={() => {
                      resetFormReserva();
                      setVistaPaciente("Reservar Cita");
                    }}
                    className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
                  >
                    Agendar Cita Ahora
                  </button>
                </div>
              ) : (
                citasPaciente.map((cita) => (
                  <div
                    key={cita.id}
                    className={`bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 flex flex-col justify-between ${
                      cita.estado === "Confirmado" ? "border-l-green-500" :
                      cita.estado === "Cancelado" ? "border-l-red-500" : "border-l-yellow-500"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${renderFiltroEspecialidadColor(cita.especialidad)}`}>
                          {cita.especialidad}
                        </span>
                        <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                          cita.estado === "Confirmado" ? "bg-green-50 text-green-700" :
                          cita.estado === "Cancelado" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {cita.estado}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-base leading-tight">{cita.medico}</h4>
                      <p className="text-slate-500 text-xs mt-1 font-semibold flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Ubicación: <span className="text-slate-700 font-bold">{cita.consultorio}</span>
                      </p>
                      
                      {/* Línea divisoria */}
                      <hr className="my-4 border-slate-100" />
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="block text-slate-400 font-semibold mb-0.5">Fecha</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(cita.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl">
                          <span className="block text-slate-400 font-semibold mb-0.5">Horario</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {cita.hora}
                          </span>
                        </div>
                      </div>
                    </div>

                    {cita.estado !== "Cancelado" && (
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleCancelar(cita.id)}
                          className="w-full py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 font-bold text-xs transition duration-150 cursor-pointer"
                        >
                          Cancelar Cita
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* VISTA CITAS SUB: CALENDARIO */}
          {vistaCitasSub === "calendario" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Calendario Grid */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                {/* Cabecera del Mes */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-slate-800 text-lg">
                    {nombreMeses[currentMonth]} {currentYear}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMonthPrev}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleMonthNext}
                      className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Días de la Semana */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
                  <span>Lun</span>
                  <span>Mar</span>
                  <span>Mié</span>
                  <span>Jue</span>
                  <span>Vie</span>
                  <span>Sáb</span>
                  <span>Dom</span>
                </div>

                {/* Rejilla de días */}
                <div className="grid grid-cols-7 gap-2">
                  {daysGrid.map((day, idx) => {
                    const diaCitas = getCitasPorDia(day);
                    const isSelected = selectedDayInfo?.day === day;
                    
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (day) {
                            setSelectedDayInfo({ day, citas: diaCitas });
                          }
                        }}
                        className={`min-h-[75px] border rounded-xl p-1.5 flex flex-col justify-between transition-all duration-150 ${
                          day 
                            ? "border-slate-100 hover:border-blue-400 hover:bg-blue-50/20 cursor-pointer" 
                            : "border-transparent bg-transparent"
                        } ${
                          isSelected ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20" : ""
                        }`}
                      >
                        {day && (
                          <>
                            <span className={`text-xs font-bold self-start ${
                              isSelected ? "text-blue-700" : "text-slate-700"
                            }`}>{day}</span>
                            
                            {diaCitas.length > 0 && (
                              <div className="space-y-1">
                                {diaCitas.slice(0, 2).map((c, i) => (
                                  <div
                                    key={i}
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded truncate bg-blue-50 border border-blue-100 text-blue-700"
                                    title={`${c.hora} - ${c.especialidad}`}
                                  >
                                    {c.especialidad}
                                  </div>
                                ))}
                                {diaCitas.length > 2 && (
                                  <div className="text-[8px] text-slate-400 font-semibold pl-1">
                                    + {diaCitas.length - 2} más
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel de Detalle del Día */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Detalles del Día
                  </h3>
                  
                  {selectedDayInfo ? (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500">
                        Citas para el {selectedDayInfo.day} de {nombreMeses[currentMonth]} de {currentYear}:
                      </p>
                      
                      {selectedDayInfo.citas.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-medium">
                          No hay citas agendadas para esta fecha.
                        </div>
                      ) : (
                        selectedDayInfo.citas.map((cita) => (
                          <div key={cita.id} className="p-3.5 border border-slate-100 rounded-xl bg-slate-50/50">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${renderFiltroEspecialidadColor(cita.especialidad)}`}>
                                {cita.especialidad}
                              </span>
                              <span className="text-xs font-bold text-slate-800">{cita.hora}</span>
                            </div>
                            <h4 className="text-xs font-extrabold text-slate-800">{cita.medico}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Ubicación: {cita.consultorio}</p>
                            <button
                              onClick={() => {
                                handleCancelar(cita.id);
                                // Actualizar panel de detalles localmente
                                setSelectedDayInfo((prev) => ({
                                  ...prev,
                                  citas: prev.citas.filter((c) => c.id !== cita.id),
                                }));
                              }}
                              className="mt-3 text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              Cancelar Cita
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-10 font-semibold leading-relaxed">
                      Haga clic en un día del calendario para visualizar la agenda detallada de esa fecha.
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="bg-blue-50/50 border border-blue-100 p-3.5 rounded-xl">
                    <h4 className="text-xs font-bold text-blue-800 flex items-center gap-1.5 mb-1">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Acerca del Calendario
                    </h4>
                    <p className="text-[10px] text-blue-700/85 font-medium leading-relaxed">
                      El calendario muestra sus citas activas de forma visual. Para reprogramar una consulta, cancele la actual y solicite una nueva reserva.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- VISTA: RESERVAR CITA --- */}
      {vistaPaciente === "Reservar Cita" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm max-w-4xl mx-auto">
          {/* Stepper Header */}
          {reservaStep < 5 && (
            <div className="mb-8 border-b border-slate-100 pb-5">
              <div className="flex items-center justify-between max-w-xl mx-auto">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm transition-all duration-150 ${
                      reservaStep === step
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-4 ring-blue-500/10"
                        : reservaStep > step
                        ? "bg-green-100 text-green-700 border border-green-200"
                        : "bg-slate-50 text-slate-400 border border-slate-200"
                    }`}>
                      {reservaStep > step ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : step}
                    </div>
                    {step < 4 && (
                      <div className={`w-12 md:w-20 h-0.5 mx-2 rounded ${
                        reservaStep > step ? "bg-green-300" : "bg-slate-100"
                      }`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-center font-bold text-sm text-slate-800 mt-4 uppercase tracking-wider">
                {reservaStep === 1 && "Paso 1: Especialidad Médica"}
                {reservaStep === 2 && "Paso 2: Selección de Médico"}
                {reservaStep === 3 && "Paso 3: Fecha y Horario"}
                {reservaStep === 4 && "Paso 4: Resumen y Confirmación"}
              </p>
            </div>
          )}

          {/* STEP 1: ESPECIALIDAD */}
          {reservaStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-800">Seleccione una especialidad:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {especialidades.map((esp) => (
                  <div
                    key={esp.id}
                    onClick={() => {
                      setReservaData({ ...reservaData, especialidad: esp.nombre });
                      setReservaStep(2);
                    }}
                    className="border border-slate-150 hover:border-blue-400 p-5 rounded-2xl hover:bg-blue-50/10 transition-all duration-200 cursor-pointer flex items-start gap-4 group"
                  >
                    <div className={`p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm group-hover:scale-105 transition-transform duration-150`}>
                      {esp.icon}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 group-hover:text-blue-700 transition">{esp.nombre}</h4>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed">{esp.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: MÉDICO */}
          {reservaStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-extrabold text-slate-800">
                  Médicos para <span className="text-blue-700">{reservaData.especialidad}</span>:
                </h3>
                <button
                  onClick={() => setReservaStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a Especialidades
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(medicos[reservaData.especialidad] || []).map((med, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setReservaData({
                        ...reservaData,
                        medico: med.nombre,
                        consultorio: med.consultorio,
                      });
                      setReservaStep(3);
                    }}
                    className="border border-slate-150 hover:border-blue-400 p-5 rounded-2xl hover:bg-blue-50/10 transition-all duration-200 cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center font-extrabold text-blue-700 text-lg shadow-sm">
                        {med.nombre.replace("Dr. ", "").replace("Dra. ", "").substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 group-hover:text-blue-700 transition">{med.nombre}</h4>
                        <div className="flex items-center gap-1 text-xs text-amber-500 mt-1 font-semibold">
                          <span>⭐ {med.rating}</span>
                          <span className="text-slate-400 font-medium">({med.reviews} opiniones)</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{med.exp} • {med.consultorio}</p>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: FECHA Y HORA */}
          {reservaStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">Fecha y Horario de Consulta</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Médico: <span className="font-bold text-slate-700">{reservaData.medico}</span> ({reservaData.especialidad})</p>
                </div>
                <button
                  onClick={() => setReservaStep(2)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a Médicos
                </button>
              </div>

              {/* Selector de Fecha */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">Seleccione la Fecha:</label>
                <input
                  type="date"
                  min="2026-05-20"
                  max="2026-06-20"
                  value={reservaData.fecha}
                  onChange={(e) => setReservaData({ ...reservaData, fecha: e.target.value })}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-800"
                />
              </div>

              {/* Grid de Horarios */}
              {reservaData.fecha && (
                <div className="space-y-3 animate-fade-in">
                  <label className="block text-sm font-bold text-slate-700">Seleccione un horario disponible:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {turnosDisponibles.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setReservaData({ ...reservaData, hora: h });
                          setReservaStep(4);
                        }}
                        className={`py-3 rounded-xl border text-center text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                          reservaData.hora === h
                            ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700"
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMACIÓN */}
          {reservaStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-extrabold text-slate-800">Verifique los Datos de la Cita</h3>
                <button
                  onClick={() => setReservaStep(3)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a Fecha
                </button>
              </div>

              {/* Resumen Card */}
              <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Especialidad</span>
                    <span className="block font-extrabold text-slate-800 text-sm mt-0.5">{reservaData.especialidad}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Médico Asignado</span>
                    <span className="block font-extrabold text-slate-800 text-sm mt-0.5">{reservaData.medico}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Consultorio y Ubicación</span>
                    <span className="block font-extrabold text-slate-800 text-sm mt-0.5">{reservaData.consultorio} (Sede Central)</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paciente Titular</span>
                    <span className="block font-extrabold text-slate-800 text-sm mt-0.5">{usuario.nombre}</span>
                  </div>
                </div>

                <hr className="border-slate-200/60" />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200/60 p-3 rounded-xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fecha Seleccionada</span>
                    <span className="font-extrabold text-slate-800 text-xs mt-1 block">
                      {new Date(reservaData.fecha + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200/60 p-3 rounded-xl">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hora Reservada</span>
                    <span className="font-extrabold text-slate-800 text-xs mt-1 block">{reservaData.hora}</span>
                  </div>
                </div>
              </div>

              {/* Botón de Confirmación final */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setVistaPaciente("Mis Citas")}
                  className="flex-1 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold text-xs transition duration-150 cursor-pointer"
                >
                  Cancelar Proceso
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarReserva}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-150 cursor-pointer"
                >
                  Confirmar y Agendar Cita
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: ÉXITO */}
          {reservaStep === 5 && (
            <div className="text-center py-10 space-y-6 max-w-md mx-auto animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-50 text-green-500 border border-green-200 shadow-md shadow-green-500/5">
                <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-extrabold text-slate-800">¡Reserva de Cita Exitosa!</h3>
                <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                  Su cita ha sido registrada correctamente en nuestro sistema. Hemos enviado una confirmación a su correo electrónico <span className="font-semibold text-slate-700">{usuario.email}</span>.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left text-xs font-semibold text-slate-600 leading-normal space-y-1">
                <p>👩‍⚕️ <span className="text-slate-800 font-bold">Médico:</span> {reservaData.medico}</p>
                <p>📍 <span className="text-slate-800 font-bold">Ubicación:</span> {reservaData.consultorio} (Sede Central)</p>
                <p>📅 <span className="text-slate-800 font-bold">Horario:</span> {reservaData.hora} - {new Date(reservaData.fecha + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
              </div>

              <button
                type="button"
                onClick={() => setVistaPaciente("Mis Citas")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                Volver a Mis Citas
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- VISTA: CANALES DE ATENCIÓN --- */}
      {vistaPaciente === "Canales de Atención" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Card: Telemedicina */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 mb-4 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Consultas Online (Telemedicina)</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">Acceda a sus citas por videollamada desde la comodidad de su hogar con nuestros especialistas virtuales.</p>
            <a href="#" className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-4">
              Ingresar a Sala Virtual
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5h7m0 0v7m0-7l-10 10" />
              </svg>
            </a>
          </div>

          {/* Card: Central Telefónica */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border border-green-100 mb-4 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Central Telefónica y Emergencias</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">Contáctenos telefónicamente para citas complejas, reprogramación urgente o ayuda en emergencias médicas.</p>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-slate-700 font-bold">Citas: <span className="text-slate-800">(01) 511-6000</span></p>
              <p className="text-xs text-slate-700 font-bold">Urgencias 24/7: <span className="text-red-600 font-bold">(01) 511-6111</span></p>
            </div>
          </div>

          {/* Card: Chatbot Soporte */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 mb-4 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="font-extrabold text-slate-800 text-sm">Chat Virtual de Atención</h3>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">Resuelva dudas administrativas sobre coberturas, prepagos, facturas y guías de preparación médica.</p>
            <button className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-md transition duration-150 cursor-pointer">
              Iniciar Conversación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
