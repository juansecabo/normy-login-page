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
  materia: string;
}

type NotasEstudiante = {
  [materia: string]: {
    [periodo: number]: {
      [actividadId: string]: number;
    };
  };
};

type ActividadesPorMateria = {
  [materia: string]: Actividad[];
};

// Estado de periodo activo por materia
type PeriodosActivos = {
  [materia: string]: number;
};

const EstudianteConsolidado = () => {
  const navigate = useNavigate();
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [estudiante, setEstudiante] = useState<Estudiante | null>(null);
  const [materias, setMaterias] = useState<string[]>([]);
  const [actividadesPorMateria, setActividadesPorMateria] = useState<ActividadesPorMateria>({});
  const [notas, setNotas] = useState<NotasEstudiante>({});
  const [periodosActivos, setPeriodosActivos] = useState<PeriodosActivos>({});
  const [loading, setLoading] = useState(true);

  const periodos = [
    { numero: 1, nombre: "1°" },
    { numero: 2, nombre: "2°" },
    { numero: 3, nombre: "3°" },
    { numero: 4, nombre: "4°" },
  ];

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

      const storedGrado = localStorage.getItem("gradoSeleccionado");
      const storedSalon = localStorage.getItem("salonSeleccionado");
      const storedEstudiante = localStorage.getItem("estudianteSeleccionado");

      if (!storedGrado || !storedSalon) {
        navigate("/rector/seleccionar-grado");
        return;
      }

      if (!storedEstudiante) {
        navigate("/rector/lista-estudiantes");
        return;
      }

      const estudianteData = JSON.parse(storedEstudiante) as Estudiante;
      setGradoSeleccionado(storedGrado);
      setSalonSeleccionado(storedSalon);
      setEstudiante(estudianteData);

      try {
        // Obtener materias del grado/salón
        const { data: asignaciones, error: asignacionesError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)", "Salon(es)"');

        if (asignacionesError) {
          console.error('Error fetching asignaciones:', asignacionesError);
          setLoading(false);
          return;
        }

        // Filtrar materias para este grado y salón
        const materiasDelGrado: string[] = [];
        asignaciones?.forEach((asignacion) => {
          const grados = asignacion['Grado(s)'] || [];
          const salones = asignacion['Salon(es)'] || [];
          const materiasAsig = asignacion['Materia(s)'] || [];

          if (grados.includes(storedGrado) && salones.includes(storedSalon)) {
            materiasAsig.forEach((materia: string) => {
              if (!materiasDelGrado.includes(materia)) {
                materiasDelGrado.push(materia);
              }
            });
          }
        });

        materiasDelGrado.sort((a, b) => a.localeCompare(b, 'es'));
        setMaterias(materiasDelGrado);

        // Inicializar periodos activos (todos en periodo 1)
        const periodosIniciales: PeriodosActivos = {};
        materiasDelGrado.forEach(materia => {
          periodosIniciales[materia] = 1;
        });
        setPeriodosActivos(periodosIniciales);

        // Obtener actividades de todas las materias
        const { data: actividadesData, error: actividadesError } = await supabase
          .from('Nombre de Actividades')
          .select('*')
          .eq('grado', storedGrado)
          .eq('salon', storedSalon)
          .in('materia', materiasDelGrado)
          .order('fecha_creacion', { ascending: true });

        if (!actividadesError && actividadesData) {
          const actividadesPorMat: ActividadesPorMateria = {};
          
          actividadesData.forEach((act) => {
            if (!actividadesPorMat[act.materia]) {
              actividadesPorMat[act.materia] = [];
            }
            actividadesPorMat[act.materia].push({
              id: `${act.periodo}-${act.nombre_actividad}`,
              periodo: act.periodo,
              nombre: act.nombre_actividad,
              porcentaje: act.porcentaje,
              materia: act.materia,
            });
          });

          setActividadesPorMateria(actividadesPorMat);
        }

        // Obtener notas del estudiante
        const { data: notasData, error: notasError } = await supabase
          .from('Notas')
          .select('*')
          .eq('codigo_estudiantil', estudianteData.codigo_estudiantil)
          .eq('grado', storedGrado)
          .eq('salon', storedSalon)
          .in('materia', materiasDelGrado);

        if (!notasError && notasData) {
          const notasFormateadas: NotasEstudiante = {};

          notasData.forEach((nota) => {
            const { materia, periodo, nombre_actividad, nota: valorNota } = nota;

            if (nombre_actividad === "Final Definitiva" || nombre_actividad === "Final Periodo") {
              return;
            }

            const actividadId = `${periodo}-${nombre_actividad}`;

            if (!notasFormateadas[materia]) {
              notasFormateadas[materia] = {};
            }
            if (!notasFormateadas[materia][periodo]) {
              notasFormateadas[materia][periodo] = {};
            }
            notasFormateadas[materia][periodo][actividadId] = valorNota;
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

  const getActividadesPorPeriodo = (materia: string, periodo: number) => {
    return (actividadesPorMateria[materia] || []).filter(a => a.periodo === periodo);
  };

  const getPorcentajeUsado = (materia: string, periodo: number) => {
    return (actividadesPorMateria[materia] || [])
      .filter(a => a.periodo === periodo && a.porcentaje !== null)
      .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
  };

  const calcularFinalPeriodo = (materia: string, periodo: number): number | null => {
    const actividadesDelPeriodo = getActividadesPorPeriodo(materia, periodo);
    const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
    
    if (actividadesConPorcentaje.length === 0) return null;
    
    let suma = 0;
    let tieneAlgunaNota = false;
    
    actividadesConPorcentaje.forEach((actividad) => {
      const nota = notas[materia]?.[periodo]?.[actividad.id];
      if (nota !== undefined) {
        suma += nota * ((actividad.porcentaje || 0) / 100);
        tieneAlgunaNota = true;
      }
    });
    
    if (!tieneAlgunaNota) return null;
    
    return Math.round(suma * 100) / 100;
  };

  const calcularFinalDefinitiva = (materia: string): number | null => {
    let suma = 0;
    let tieneAlgunaNota = false;

    for (let periodo = 1; periodo <= 4; periodo++) {
      const finalPeriodo = calcularFinalPeriodo(materia, periodo);
      if (finalPeriodo !== null) {
        suma += finalPeriodo;
        tieneAlgunaNota = true;
      }
    }

    if (!tieneAlgunaNota) return null;

    return Math.round((suma / 4) * 100) / 100;
  };

  const handleChangePeriodo = (materia: string, periodo: number) => {
    setPeriodosActivos(prev => ({
      ...prev,
      [materia]: periodo,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

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
              onClick={() => navigate("/rector/lista-estudiantes")}
              className="text-primary hover:underline"
            >
              Por Estudiante
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">
              {estudiante?.apellidos_estudiante} {estudiante?.nombre_estudiante}
            </span>
          </div>
        </div>

        {/* Información del estudiante */}
        <div className="bg-card rounded-lg shadow-soft p-6 mb-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">
              {estudiante?.apellidos_estudiante} {estudiante?.nombre_estudiante}
            </h2>
            <p className="text-muted-foreground">
              Código: {estudiante?.codigo_estudiantil} | {gradoSeleccionado} - {salonSeleccionado}
            </p>
          </div>
        </div>

        {/* Indicador de solo lectura */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
          <span className="text-amber-800 text-sm font-medium">
            👁️ Modo solo lectura - Situación académica consolidada
          </span>
        </div>

        {/* Tabla por cada materia */}
        <div className="space-y-6">
          {materias.map((materia) => {
            const periodoActivo = periodosActivos[materia] || 1;
            const actividadesDelPeriodo = getActividadesPorPeriodo(materia, periodoActivo);
            const finalDefinitiva = calcularFinalDefinitiva(materia);

            return (
              <div key={materia} className="bg-card rounded-lg shadow-soft overflow-hidden">
                {/* Header de la materia */}
                <div className="bg-primary/10 p-4 border-b border-border flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-foreground">{materia}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Final Definitiva:</span>
                    <span className={`font-bold ${finalDefinitiva !== null && finalDefinitiva >= 3 ? 'text-green-600' : finalDefinitiva !== null ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {finalDefinitiva !== null ? finalDefinitiva.toFixed(2) : '—'}
                    </span>
                  </div>
                </div>

                {/* Tabs de períodos */}
                <div className="flex border-b border-border">
                  {periodos.map((periodo) => {
                    const isActive = periodoActivo === periodo.numero;
                    const porcentaje = getPorcentajeUsado(materia, periodo.numero);
                    return (
                      <button
                        key={periodo.numero}
                        onClick={() => handleChangePeriodo(materia, periodo.numero)}
                        className={`flex-1 px-2 py-2 text-xs font-medium transition-colors relative
                          ${isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        {periodo.nombre} ({porcentaje}%)
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contenido del período */}
                <div className="overflow-x-auto">
                  {actividadesDelPeriodo.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No hay actividades registradas en este período
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          {actividadesDelPeriodo.map((actividad) => (
                            <th 
                              key={actividad.id}
                              className="p-2 text-center text-xs font-medium border-r border-b border-border min-w-[100px]"
                            >
                              <div className="truncate" title={actividad.nombre}>
                                {actividad.nombre}
                              </div>
                              {actividad.porcentaje !== null && (
                                <div className="text-muted-foreground text-xs">
                                  ({actividad.porcentaje}%)
                                </div>
                              )}
                            </th>
                          ))}
                          <th className="p-2 text-center text-xs font-semibold border-b border-border min-w-[100px] bg-primary/10">
                            Final Periodo
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {actividadesDelPeriodo.map((actividad) => {
                            const nota = notas[materia]?.[periodoActivo]?.[actividad.id];
                            return (
                              <td 
                                key={actividad.id}
                                className="p-2 text-center text-sm border-r border-b border-border"
                              >
                                {nota !== undefined ? nota.toFixed(2) : '—'}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center text-sm font-semibold border-b border-border bg-primary/5">
                            {calcularFinalPeriodo(materia, periodoActivo)?.toFixed(2) || '—'}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}

          {materias.length === 0 && (
            <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
              No hay materias asignadas para este grado y salón
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default EstudianteConsolidado;
