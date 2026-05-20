import React, { useState } from 'react';
import Login from './Login';
import PanelPaciente from './PanelPaciente';

export default function ClinicaDashboardWireframe() {
  const [vistaActual, setVistaActual] = useState('Login');
  const [usuario, setUsuario] = useState(null);

  const [citas, setCitas] = useState([
    {
      id: 1042,
      paciente: "Roberto Sánchez",
      pacienteEmail: "roberto@clinica.com",
      especialidad: "Cardiología",
      medico: "Dr. Mendoza",
      consultorio: "Cons. 04",
      fecha: "2026-05-20",
      hora: "09:15 AM",
      estado: "Confirmado",
      riesgo: "Riesgo Medio",
      riesgoColor: "yellow"
    },
    {
      id: 1043,
      paciente: "María Fernández",
      pacienteEmail: "maria@clinica.com",
      especialidad: "Neurología",
      medico: "Dra. Silva",
      consultorio: "Cons. 02",
      fecha: "2026-05-20",
      hora: "09:30 AM",
      estado: "Confirmado",
      riesgo: "Riesgo Bajo",
      riesgoColor: "green"
    },
    {
      id: 1044,
      paciente: "Carlos Ruiz",
      pacienteEmail: "carlos@clinica.com",
      especialidad: "Medicina General",
      medico: "Dr. Paz",
      consultorio: "Cons. 01",
      fecha: "2026-05-20",
      hora: "09:45 AM",
      estado: "Por Confirmar",
      riesgo: "Riesgo Alto",
      riesgoColor: "red"
    },
    {
      id: 1045,
      paciente: "Juan Pérez",
      pacienteEmail: "paciente@clinica.com",
      especialidad: "Cardiología",
      medico: "Dr. Mendoza",
      consultorio: "Cons. 04",
      fecha: "2026-05-22",
      hora: "10:00 AM",
      estado: "Confirmado",
      riesgo: "Riesgo Bajo",
      riesgoColor: "green"
    },
    {
      id: 1046,
      paciente: "Juan Pérez",
      pacienteEmail: "paciente@clinica.com",
      especialidad: "Neurología",
      medico: "Dra. Silva",
      consultorio: "Cons. 02",
      fecha: "2026-05-25",
      hora: "12:30 PM",
      estado: "Confirmado",
      riesgo: "Riesgo Bajo",
      riesgoColor: "green"
    }
  ]);

  const [selectedCitaId, setSelectedCitaId] = useState(1042);

  const cards = [
    { title: 'Total Citas Activas', value: citas.filter(c => c.estado !== 'Cancelado').length.toString() },
    { title: 'Ocupación Promedio', value: '82%' },
    { title: 'Predicción de Demanda', value: 'Alta' },
  ];

  const sidebarItems = [
    'Dashboard',
    'Gestión de Citas',
    'Predicción de Demanda',
    'Horarios Médicos',
  ];

  const sidebarItemsPaciente = [
    'Mis Citas',
    'Reservar Cita',
    'Canales de Atención'
  ];

  const renderIconoSidebar = (item) => {
    switch (item) {
      case 'Dashboard':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        );
      case 'Gestión de Citas':
      case 'Mis Citas':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'Reservar Cita':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Predicción de Demanda':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
          </svg>
        );
      case 'Horarios Médicos':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'Canales de Atención':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        );
    }
  };

  const atenderCita = (id) => {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: 'Atendido' } : c));
  };

  const cancelarCita = (id) => {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, estado: 'Cancelado' } : c));
  };

  const reprogramarCita = (id, nuevaFecha, nuevaHora) => {
    setCitas(prev => prev.map(c => c.id === id ? { ...c, fecha: nuevaFecha, hora: nuevaHora } : c));
  };

  const renderizarVista = () => {
    switch (vistaActual) {
      case 'Login':
        return (
          <Login
            onLogin={(creds) => {
              const isAdmin = creds.email.toLowerCase().includes('admin');
              const name = isAdmin ? 'Administrador' : 'Juan Pérez';
              setUsuario({
                email: creds.email,
                rol: isAdmin ? 'admin' : 'paciente',
                nombre: name,
              });
              setVistaActual(isAdmin ? 'Dashboard' : 'Mis Citas');
            }}
          />
        );
      case 'Mis Citas':
      case 'Reservar Cita':
      case 'Canales de Atención':
        return (
          <PanelPaciente
            usuario={usuario}
            citas={citas}
            setCitas={setCitas}
            vistaPaciente={vistaActual}
            setVistaPaciente={setVistaActual}
            onLogout={() => {
              setUsuario(null);
              setVistaActual('Login');
            }}
          />
        );
      case 'Dashboard':

        return (
          <div className="animate-fade-in">
            <header className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">
                  Dashboard Operativo
                </h2>
                <p className="text-gray-500 mt-1">
                  Monitoreo inteligente de demanda y ocupación médica
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border text-sm text-gray-600 font-semibold">
                  20 Mayo 2026
                </div>
                <button
                  onClick={() => {
                    setUsuario(null);
                    setVistaActual('Login');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 border border-red-100 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </header>
            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
              {cards.map((card) => (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200"
                >
                  <p className="text-gray-500 text-sm mb-2">{card.title}</p>
                  <h3 className="text-3xl font-bold text-gray-800">{card.value}</h3>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Predicción de Demanda
                  </h3>
                  <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
                    Ver Detalles
                  </button>
                </div>

                <div className="h-72 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-lg">
                  Gráfico Predictivo IA
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Alertas Inteligentes
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                    <p className="font-medium text-red-700">
                      Alta demanda en Cardiología
                    </p>
                    <p className="text-sm text-red-500 mt-1">
                      Recomendación: habilitar 2 horarios adicionales.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="font-medium text-blue-700">
                      Baja ocupación detectada
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Consultorios libres entre 3:00 PM y 5:00 PM.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Gestión de Citas
                  </h3>
                  <button className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
                    Nueva Cita
                  </button>
                </div>

                <div className="space-y-3">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-200"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          Paciente #{item} - Cardiología
                        </p>
                        <p className="text-sm text-gray-500">
                          10:00 AM - Consultorio 04
                        </p>
                      </div>

                      <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-700">
                        Riesgo Medio
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">
                    Heatmap de Ocupación
                  </h3>
                </div>

                <div className="grid grid-cols-6 gap-2 mt-4">
                  {Array.from({ length: 30 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-14 rounded-lg bg-blue-100 border border-blue-200"
                    ></div>
                  ))}
                </div>
              </div>
            </section>


            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    Reportes y Analítica
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Indicadores históricos y rendimiento del sistema predictivo
                  </p>
                </div>

                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">
                  Exportar Reporte
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="h-52 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  Reporte de Ausencias
                </div>

                <div className="h-52 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  Rendimiento ML
                </div>

                <div className="h-52 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  Tendencias Históricas
                </div>
              </div>
            </section>
          </div>
        );
      
      case 'Gestión de Citas': {
        const selectedCita = citas.find(c => c.id === selectedCitaId) || citas[0] || {};
        return (
          <div className="space-y-6 animate-fade-in h-full flex flex-col">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Gestión Operativa de Citas</h2>
                <p className="text-gray-500 mt-1">
                  Programación, reasignación y control de asistencia en tiempo real.
                </p>
              </div>
              <button
                onClick={() => {
                  setUsuario(null);
                  setVistaActual('Login');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 border border-red-100 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>


            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">

              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Agenda General</h3>
                  <span className="text-sm font-medium text-gray-500">20 Mayo 2026</span>
                </div>
                
                <div className="space-y-3 overflow-y-auto pr-2 max-h-[500px]">
                  {citas.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 font-medium">No hay citas registradas en el sistema.</div>
                  ) : (
                    citas.map((cita) => (
                      <div
                        key={cita.id}
                        onClick={() => setSelectedCitaId(cita.id)}
                        className={`flex justify-between items-center p-4 border border-l-4 rounded-xl bg-white hover:border-blue-300 hover:bg-slate-50/30 transition shadow-sm cursor-pointer ${
                          selectedCitaId === cita.id ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200'
                        } ${
                          cita.estado === 'Confirmado' ? 'border-l-green-500' :
                          cita.estado === 'Cancelado' ? 'border-l-red-500' :
                          cita.estado === 'Atendido' ? 'border-l-purple-500' : 'border-l-yellow-500'
                        }`}
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{cita.paciente}</h4>
                          <p className="text-sm text-gray-500">{cita.especialidad} - {cita.medico} ({cita.consultorio})</p>
                          <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${
                            cita.estado === 'Confirmado' ? 'bg-green-100 text-green-700' :
                            cita.estado === 'Cancelado' ? 'bg-red-100 text-red-700' :
                            cita.estado === 'Atendido' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {cita.estado}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block font-bold text-gray-800">{cita.hora}</span>
                          <span className="text-xs text-gray-400 mt-1 block">{cita.fecha}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5 block">Folio: #{cita.id}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 flex flex-col h-fit">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Detalle Rápido</h3>
                
                {selectedCita.id ? (
                  <>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Paciente Seleccionado</label>
                        <input type="text" readOnly value={selectedCita.paciente} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-semibold" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Especialidad y Médico</label>
                        <input type="text" readOnly value={`${selectedCita.especialidad} - ${selectedCita.medico}`} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 font-semibold" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
                          <input
                            type="date"
                            value={selectedCita.fecha}
                            onChange={(e) => reprogramarCita(selectedCita.id, e.target.value, selectedCita.hora)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                          <input
                            type="text"
                            value={selectedCita.hora}
                            onChange={(e) => reprogramarCita(selectedCita.id, selectedCita.fecha, e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Estado Actual</label>
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          selectedCita.estado === 'Confirmado' ? 'bg-green-100 text-green-700' :
                          selectedCita.estado === 'Cancelado' ? 'bg-red-100 text-red-700' :
                          selectedCita.estado === 'Atendido' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {selectedCita.estado}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      {selectedCita.estado !== 'Atendido' && selectedCita.estado !== 'Cancelado' && (
                        <button
                          onClick={() => atenderCita(selectedCita.id)}
                          className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm cursor-pointer"
                        >
                          Atender Paciente
                        </button>
                      )}
                      {selectedCita.estado !== 'Cancelado' && (
                        <button
                          onClick={() => cancelarCita(selectedCita.id)}
                          className="w-full py-2 bg-red-50 text-red-600 border border-red-200 font-medium rounded-lg hover:bg-red-100 transition cursor-pointer"
                        >
                          Cancelar Cita
                        </button>
                      )}
                      {selectedCita.estado === 'Cancelado' && (
                        <button
                          onClick={() => setCitas(prev => prev.map(c => c.id === selectedCita.id ? { ...c, estado: 'Por Confirmar' } : c))}
                          className="w-full py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 font-medium rounded-lg hover:bg-yellow-100 transition cursor-pointer"
                        >
                          Reestablecer Cita
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Seleccione una cita para ver los detalles.</p>
                )}
              </div>

            </div>
          </div>
        );
      }

      case 'Predicción de Demanda':
        return (
          <div className="space-y-6 animate-fade-in h-full flex flex-col">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Proyección de Demanda Médica</h2>
                <p className="text-gray-500 mt-1">
                  Análisis predictivo de flujo de pacientes para optimización de horarios.
                </p>
              </div>
              <button
                onClick={() => {
                  setUsuario(null);
                  setVistaActual('Login');
                }}
                className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 border border-red-100 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                <p className="text-gray-500 text-sm font-medium">Volumen Estimado (Próx. 7 días)</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">1,752</h3>
                <p className="text-xs text-green-600 mt-2 font-medium">↑ +12% vs. semana anterior</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-purple-500">
                <p className="text-gray-500 text-sm font-medium">Precisión del Modelo (ARIMA/LSTM)</p>
                <h3 className="text-3xl font-bold text-gray-800 mt-1">94.2%</h3>
                <p className="text-xs text-gray-400 mt-2">Última calibración: Hoy 08:00 AM</p>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 border-l-4 border-l-orange-500">
                <p className="text-gray-500 text-sm font-medium">Especialidad de Mayor Demanda</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">Cardiología</h3>
                <p className="text-xs text-orange-600 mt-2 font-medium">Déficit proyectado de 15 turnos/día</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
              
              <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Curva Predictiva de Demanda
                    </h3>
                    <p className="text-sm text-gray-500">Volumen esperado de citas por franja horaria</p>
                  </div>
                  <div className="flex gap-2">
                    <select className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500">
                      <option>Próximos 7 días</option>
                      <option>Próximos 14 días</option>
                      <option>Mes actual</option>
                    </select>
                  </div>
                </div>
                
                
                <div className="flex-1 min-h-[250px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                  <span className="font-medium text-gray-600">[Gráfico de Serie Temporal]</span>
                  <span className="text-sm mt-1 text-center px-4 max-w-sm">
                    Visualización de picos de demanda comparando la capacidad instalada vs. demanda proyectada por los modelos.
                  </span>
                </div>
              </div>

              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Sugerencias de IA
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                    Accionables
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 pb-4 border-b border-gray-100">
                  Ajustes recomendados para alinear la disponibilidad médica con la demanda proyectada.
                </p>

                <div className="space-y-4 overflow-y-auto pr-2">
                  
                  <div className="p-4 border border-blue-100 bg-blue-50/50 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-blue-900 text-sm">Habilitar Turno Vespertino</h4>
                      <span className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded font-medium">Alta Prioridad</span>
                    </div>
                    <p className="text-xs text-blue-800 mb-3">
                      <strong>Cardiología:</strong> Demanda supera la oferta en un 40% entre las 17:00 y 20:00 hrs.
                    </p>
                    <button className="w-full py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition">
                      Proponer Nuevo Horario
                    </button>
                  </div>

                  
                  <div className="p-4 border border-orange-100 bg-orange-50/50 rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-orange-900 text-sm">Reducir Capacidad</h4>
                    </div>
                    <p className="text-xs text-orange-800 mb-3">
                      <strong>Pediatría:</strong> Sobreoferta detectada. Ocupación proyectada del 35% en las mañanas.
                    </p>
                    <button className="w-full py-1.5 bg-white border border-orange-200 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-50 transition">
                      Ajustar Disponibilidad
                    </button>
                  </div>
                  
                  
                  <div className="p-4 border border-gray-200 rounded-xl">
                    <h4 className="font-semibold text-gray-800 text-sm mb-1">Redistribución de Consultorios</h4>
                    <p className="text-xs text-gray-600">
                      Asignar consultorios 3 y 4 a Gastroenterología los días Jueves por aumento cíclico de demanda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );


      case 'Horarios Médicos':
        return (
          <div className="space-y-6 animate-fade-in">
    
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Gestión Dinámica de Horarios</h2>
                <p className="text-gray-500 mt-1">
                  Optimización de turnos y mitigación de horarios espejo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition font-medium cursor-pointer text-sm">
                  + Nuevo Turno Especial
                </button>
                <button
                  onClick={() => {
                    setUsuario(null);
                    setVistaActual('Login');
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 border border-red-100 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
              <div className="bg-blue-600 text-white p-3 rounded-xl shadow-sm">
                <span className="font-bold">IA</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 text-lg">Sugerencia Estratégica: Pico de Demanda Nocturna</h3>
                <p className="text-blue-800 mt-1">
                  Se detectó un <strong>45% de intención de reserva fallida</strong> entre las 6:00 PM y 8:00 PM para Cardiología (fuera de horario de oficina).
                </p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-white text-blue-700 font-medium rounded-lg border border-blue-200 hover:bg-blue-100 transition shadow-sm">
                    Asignar 2 Médicos (18:00 - 20:00)
                  </button>
                  <button className="px-4 py-2 text-blue-700 hover:underline text-sm font-medium">
                    Ver análisis detallado
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Mapa de Cobertura vs. Demanda</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="text-gray-500 text-sm border-b-2 border-gray-100">
                      <th className="pb-3 font-medium w-1/4">Especialidad</th>
                      <th className="pb-3 font-medium text-center w-1/4">Mañana (8a - 1p)</th>
                      <th className="pb-3 font-medium text-center w-1/4">Tarde (2p - 6p)</th>
                      <th className="pb-3 font-medium text-center w-1/4 bg-green-50 rounded-t-lg text-green-800">
                        Noche (6p - 9p) 🌙
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      { area: 'Cardiología', m: 'Sobresaturado (98%)', t: 'Ocupado (85%)', n: 'Sin turnos', n_alert: true },
                      { area: 'Neurología', m: 'Ocupado (90%)', t: 'Libre (40%)', n: '1 Médico', n_alert: false },
                      { area: 'Gastroenterología', m: 'Sobresaturado (100%)', t: 'Ocupado (95%)', n: 'Sin turnos', n_alert: true },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                        <td className="py-4 font-medium text-gray-800">{row.area}</td>
                        <td className="py-4 text-center text-red-600 font-medium">{row.m}</td>
                        <td className="py-4 text-center text-yellow-600">{row.t}</td>
                        <td className={`py-4 text-center font-medium bg-green-50/50 ${row.n_alert ? 'text-red-500' : 'text-green-700'}`}>
                          {row.n}
                          {row.n_alert && (
                            <button className="block mx-auto mt-2 text-xs text-blue-600 font-semibold bg-white border border-blue-200 px-2 py-1 rounded hover:bg-blue-50 transition">
                              + Habilitar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

 
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-400 mb-2">Vista de {vistaActual}</h2>
              <p className="text-gray-500">En proceso - YO SI CREO</p>
            </div>
          </div>
        );
    }
  };

  if (vistaActual === 'Login') {
    return renderizarVista();
  }
  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-64 bg-white shadow-md border-r border-slate-200 p-5 flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 10.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9.5M12 4v4m-3-2h6M4 10h16" />
              </svg>
              Clínica Int.
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">Sistema Inteligente</p>
          </div>
          <nav className="space-y-2">
            {(usuario.rol === 'admin' ? sidebarItems : sidebarItemsPaciente).map((item) => (
              <div
                key={item}
                onClick={() => setVistaActual(item)}
                className={`px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-150 flex items-center gap-3 border ${
                  vistaActual === item
                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold shadow-sm shadow-blue-500/5'
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <span className={vistaActual === item ? 'text-blue-600' : 'text-slate-400'}>
                  {renderIconoSidebar(item)}
                </span>
                <span className="text-sm">
                  {item}
                </span>
              </div>
            ))}
          </nav>
        </div>
        
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 p-1">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-700 border border-blue-200 shadow-sm flex-shrink-0">
              {usuario.nombre.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{usuario.nombre}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{usuario.rol === 'admin' ? 'Administrador' : 'Paciente'}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setUsuario(null);
              setVistaActual('Login');
            }}
            className="w-full px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-150 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
            </svg>
            Cerrar Sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {renderizarVista()}
      </main>
    </div>
  );
}
