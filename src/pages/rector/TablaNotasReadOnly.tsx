import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession, isRectorOrCoordinador } from "@/hooks/useSession";

interface Estudiante {
  codigo_estudiantil: string;
  apellidos_estudiante: string;
  nombre_estudiante: string;
}

interface Actividad {
  id: string;
  periodo: number;
  nombre: string;
  porcentaje: number | null;
}

type NotasEstudiantes = {
  [codigoEstudiantil: string]: {
    [periodo: number]: {
      [actividadId: string]: number;
    };
  };
};

const TablaNotasReadOnly = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [notas, setNotas] = useState<NotasEstudiantes>({});
  const [periodoActivo, setPeriodoActivo] = useState<number>(1);

  useEffect(() => {
    const inicializar = async () => {
      const session = getSession();
      
      if (!session.codigo) {
        navigate('/');
        return;
      }

      if (!isRectorOrCoordinador()) {
        navigate('/dashboard');
        return;
      }

      const storedMateria = localStorage.getItem("materiaSeleccionada");
      const storedGrado = localStorage.getItem("gradoSeleccionado");
      const storedSalon = localStorage.getItem("salonSeleccionado");

      if (!storedMateria || !storedGrado || !storedSalon) {
        navigate("/rector/seleccionar-grado");
        return;
      }

      setMateriaSeleccionada(storedMateria);
      setGradoSeleccionado(storedGrado);
      setSalonSeleccionado(storedSalon);

      try {
        // Fetch estudiantes
        const { data: estudiantesData, error: estudiantesError } = await supabase
          .from('Estudiantes')
          .select('codigo_estudiantil, apellidos_estudiante, nombre_estudiante')
          .eq('grado_estudiante', storedGrado)
          .eq('salon_estudiante', storedSalon)
          .order('apellidos_estudiante', { ascending: true })
          .order('nombre_estudiante', { ascending: true });

        if (estudiantesError) {
          console.error('Error fetching estudiantes:', estudiantesError);
          setLoading(false);
          return;
        }

        setEstudiantes(estudiantesData || []);

        // Cargar actividades desde "Nombre de Actividades"
        const { data: actividadesData, error: actividadesError } = await supabase
          .from('Nombre de Actividades')
          .select('*')
          .eq('materia', storedMateria)
          .eq('grado', storedGrado)
          .eq('salon', storedSalon)
          .order('fecha_creacion', { ascending: true });

        if (!actividadesError && actividadesData) {
          const actividadesCargadas: Actividad[] = actividadesData.map(act => ({
            id: `${act.periodo}-${act.nombre_actividad}`,
            periodo: act.periodo,
            nombre: act.nombre_actividad,
            porcentaje: act.porcentaje,
          }));
          setActividades(actividadesCargadas);
        }

        // Fetch notas existentes
        const { data: notasData, error: notasError } = await supabase
          .from('Notas')
          .select('*')
          .eq('materia', storedMateria)
          .eq('grado', storedGrado)
          .eq('salon', storedSalon);

        if (!notasError && notasData) {
          const notasFormateadas: NotasEstudiantes = {};
          
          notasData.forEach((nota) => {
            const { codigo_estudiantil, periodo, nombre_actividad, nota: valorNota } = nota;
            
            if (nombre_actividad === "Final Definitiva" || nombre_actividad === "Final Periodo") {
              return;
            }
            
            const actividadId = `${periodo}-${nombre_actividad}`;
            
            if (!notasFormateadas[codigo_estudiantil]) {
              notasFormateadas[codigo_estudiantil] = {};
            }
            if (!notasFormateadas[codigo_estudiantil][periodo]) {
              notasFormateadas[codigo_estudiantil][periodo] = {};
            }
            notasFormateadas[codigo_estudiantil][periodo][actividadId] = valorNota;
          });
          
          setNotas(notasFormateadas);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const periodos = [
    { numero: 1, nombre: "1er Periodo" },
    { numero: 2, nombre: "2do Periodo" },
    { numero: 3, nombre: "3er Periodo" },
    { numero: 4, nombre: "4to Periodo" },
  ];

  const esFinalDefinitiva = periodoActivo === 0;

  const getActividadesPorPeriodo = (periodo: number) => {
    return actividades.filter(a => a.periodo === periodo);
  };

  const getPorcentajeUsado = (periodo: number) => {
    return actividades
      .filter(a => a.periodo === periodo && a.porcentaje !== null)
      .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
  };

  const getPorcentajePromedioAnual = () => {
    const porcentajes = [1, 2, 3, 4].map(p => getPorcentajeUsado(p));
    const suma = porcentajes.reduce((acc, val) => acc + val, 0);
    const promedio = suma / 4;
    return Math.round(promedio * 100) / 100;
  };

  const calcularFinalPeriodo = (codigoEstudiantil: string, periodo: number): number | null => {
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
    
    if (actividadesConPorcentaje.length === 0) return null;
    
    let suma = 0;
    let tieneAlgunaNota = false;
    
    actividadesConPorcentaje.forEach((actividad) => {
      const nota = notas[codigoEstudiantil]?.[periodo]?.[actividad.id];
      if (nota !== undefined) {
        suma += nota * ((actividad.porcentaje || 0) / 100);
        tieneAlgunaNota = true;
      }
    });
    
    if (!tieneAlgunaNota) return null;
    
    return Math.round(suma * 100) / 100;
  };

  const calcularFinalDefinitiva = (codigoEstudiantil: string): number | null => {
    let suma = 0;
    let tieneAlgunaNota = false;

    for (let periodo = 1; periodo <= 4; periodo++) {
      const finalPeriodo = calcularFinalPeriodo(codigoEstudiantil, periodo);
      if (finalPeriodo !== null) {
        suma += finalPeriodo;
        tieneAlgunaNota = true;
      }
    }

    if (!tieneAlgunaNota) return null;

    return Math.round((suma / 4) * 100) / 100;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/dashboard-rector" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 md:w-16 md:h-16 object-contain -my-1 md:-my-2"
            />
            <h1 className="text-base md:text-xl font-bold">Notas Normy</h1>
          </Link>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button 
              onClick={() => navigate("/dashboard-rector")}
              className="text-primary hover:underline"
            >
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/rector/seleccionar-grado")}
              className="text-primary hover:underline"
            >
              {gradoSeleccionado}
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/rector/seleccionar-salon")}
              className="text-primary hover:underline"
            >
              {salonSeleccionado}
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/rector/lista-materias")}
              className="text-primary hover:underline"
            >
              Por Materia
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{materiaSeleccionada}</span>
          </div>
        </div>

        {/* Indicador de solo lectura */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
          <span className="text-amber-800 text-sm font-medium">
            👁️ Modo solo lectura - Las notas no pueden ser editadas desde esta vista
          </span>
        </div>

        {/* Pestañas de Períodos */}
        <div className="bg-card rounded-lg shadow-soft overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-border">
            {periodos.map((periodo) => {
              const porcentajeUsado = getPorcentajeUsado(periodo.numero);
              const isActive = periodoActivo === periodo.numero;
              return (
                <button
                  key={periodo.numero}
                  onClick={() => setPeriodoActivo(periodo.numero)}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors relative
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="md:hidden">
                    {periodo.numero}° ({porcentajeUsado}%)
                  </span>
                  <span className="hidden md:inline">
                    {periodo.nombre}
                    <span className={`ml-2 text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      ({porcentajeUsado}%)
                    </span>
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                  )}
                </button>
              );
            })}
            {/* Pestaña Final Definitiva */}
            {(() => {
              const porcentajePromedio = getPorcentajePromedioAnual();
              const estaCompleto = porcentajePromedio === 100;
              return (
                <button
                  onClick={() => setPeriodoActivo(0)}
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors relative
                    ${esFinalDefinitiva 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="md:hidden flex items-center justify-center gap-1">
                    Final ({porcentajePromedio}%)
                    {estaCompleto && <span>✓</span>}
                  </span>
                  <span className="hidden md:flex items-center justify-center gap-1">
                    Final Definitiva 
                    <span className={estaCompleto ? 'text-green-300' : ''}>
                      ({porcentajePromedio}/100%)
                    </span>
                    {estaCompleto && <span>✓</span>}
                  </span>
                  {esFinalDefinitiva && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                  )}
                </button>
              );
            })()}
          </div>

          {/* Tabla de Notas */}
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando estudiantes...
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay estudiantes en este salón
            </div>
          ) : (
            <div className="overflow-x-auto border-l border-t border-border">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="md:sticky md:left-0 z-20 bg-primary border-r border-b border-border/30 w-[80px] md:w-[100px] min-w-[80px] md:min-w-[100px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Código
                    </th>
                    <th className="md:sticky md:left-[100px] z-20 bg-primary border-r border-b border-border/30 w-[120px] md:w-[180px] min-w-[120px] md:min-w-[180px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Apellidos
                    </th>
                    <th className="md:sticky md:left-[280px] z-20 bg-primary border-r border-b border-border/30 w-[100px] md:w-[150px] min-w-[100px] md:min-w-[150px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Nombre
                    </th>
                    
                    {esFinalDefinitiva ? (
                      <>
                        {periodos.map((periodo) => (
                          <th 
                            key={periodo.numero}
                            className="border-r border-b border-border/30 p-2 text-center text-xs font-medium min-w-[120px] bg-primary/80"
                          >
                            {periodo.nombre}
                          </th>
                        ))}
                        <th className="border-r border-b border-border/30 p-2 text-center text-xs font-semibold min-w-[130px] bg-primary">
                          Final Definitiva
                        </th>
                      </>
                    ) : (
                      <>
                        {getActividadesPorPeriodo(periodoActivo).map((actividad) => (
                          <th 
                            key={actividad.id}
                            className="border-r border-b border-border/30 p-2 text-center text-xs font-medium min-w-[120px] bg-primary/90"
                          >
                            <div className="flex flex-col items-center">
                              <div className="truncate" title={actividad.nombre}>
                                {actividad.nombre}
                              </div>
                              {actividad.porcentaje !== null && (
                                <div className="text-primary-foreground/70 text-xs">
                                  ({actividad.porcentaje}%)
                                </div>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="border-r border-b border-border/30 p-2 text-center text-xs font-medium min-w-[130px] bg-primary">
                          <div className="flex flex-col items-center">
                            <span>Final Periodo</span>
                            <span className="text-xs text-primary-foreground/70">
                              ({getPorcentajeUsado(periodoActivo)}/100%)
                            </span>
                          </div>
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((estudiante, studentIndex) => {
                    const rowBg = studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    
                    return (
                      <tr key={estudiante.codigo_estudiantil} className={rowBg}>
                        <td className={`md:sticky md:left-0 z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.codigo_estudiantil}
                        </td>
                        <td className={`md:sticky md:left-[100px] z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm font-medium ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.apellidos_estudiante}
                        </td>
                        <td className={`md:sticky md:left-[280px] z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.nombre_estudiante}
                        </td>
                        
                        {esFinalDefinitiva ? (
                          <>
                            {periodos.map((periodo) => {
                              const finalPeriodo = calcularFinalPeriodo(estudiante.codigo_estudiantil, periodo.numero);
                              return (
                                <td 
                                  key={periodo.numero}
                                  className="border-r border-b border-border p-2 text-center text-sm"
                                >
                                  {finalPeriodo !== null ? finalPeriodo.toFixed(2) : '—'}
                                </td>
                              );
                            })}
                            <td className="border-r border-b border-border p-2 text-center text-sm font-semibold bg-primary/5">
                              {calcularFinalDefinitiva(estudiante.codigo_estudiantil)?.toFixed(2) || '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            {getActividadesPorPeriodo(periodoActivo).map((actividad) => {
                              const nota = notas[estudiante.codigo_estudiantil]?.[periodoActivo]?.[actividad.id];
                              return (
                                <td 
                                  key={actividad.id}
                                  className="border-r border-b border-border p-2 text-center text-sm"
                                >
                                  {nota !== undefined ? nota.toFixed(2) : '—'}
                                </td>
                              );
                            })}
                            <td className="border-r border-b border-border p-2 text-center text-sm font-semibold bg-primary/5">
                              {calcularFinalPeriodo(estudiante.codigo_estudiantil, periodoActivo)?.toFixed(2) || '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TablaNotasReadOnly;
