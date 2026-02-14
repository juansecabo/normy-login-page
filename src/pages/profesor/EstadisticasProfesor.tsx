import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isProfesor } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { AnalisisMateria } from "@/components/estadisticas/AnalisisMateria";
import { AnalisisEstudiante } from "@/components/estadisticas/AnalisisEstudiante";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Asignacion {
  materias: string[];
  grados: string[];
  salones: string[];
}

const EstadisticasProfesor = () => {
  const navigate = useNavigate();
  const { loading, salones: todosLosSalones, getPromediosEstudiantes } = useEstadisticas();

  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("1");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [nivelAnalisis, setNivelAnalisis] = useState("salon");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session.codigo) { navigate("/"); return; }
    if (!isProfesor()) { navigate("/dashboard"); return; }

    const fetchAsignaciones = async () => {
      try {
        const { data: profesor } = await supabase
          .from("Internos").select("id")
          .eq("codigo", parseInt(session.codigo!)).single();
        if (!profesor) return;

        const { data: rows } = await supabase
          .from("Asignación Profesores")
          .select('"Materia(s)", "Grado(s)", "Salon(es)"')
          .eq("id", profesor.id);

        if (rows) {
          setAsignaciones(rows.map((r: any) => ({
            materias: Array.isArray(r["Materia(s)"]) ? r["Materia(s)"] : [],
            grados: Array.isArray(r["Grado(s)"]) ? r["Grado(s)"] : [],
            salones: Array.isArray(r["Salon(es)"]) ? r["Salon(es)"] : [],
          })));
        }
      } catch (err) {
        console.error("Error cargando asignaciones:", err);
      } finally {
        setLoadingAsignaciones(false);
      }
    };
    fetchAsignaciones();
  }, [navigate]);

  // Expandir asignaciones a tríos (materia, grado, salon)
  const trios = useMemo(() => {
    const result: { materia: string; grado: string; salon: string }[] = [];
    asignaciones.forEach(a => {
      if (a.grados.length === a.salones.length && a.grados.length === a.materias.length) {
        // ZIP
        for (let i = 0; i < a.materias.length; i++) {
          result.push({ materia: a.materias[i], grado: a.grados[i], salon: a.salones[i] });
        }
      } else {
        // Producto cartesiano
        for (const mat of a.materias)
          for (const grad of a.grados)
            for (const sal of a.salones)
              result.push({ materia: mat, grado: grad, salon: sal });
      }
    });
    // Filtrar solo los que existen en la BD
    return result.filter(t =>
      todosLosSalones.some(ts => ts.grado === t.grado && ts.salon === t.salon)
    );
  }, [asignaciones, todosLosSalones]);

  // 1. Materias del profesor
  const materiasProfesor = useMemo(() => {
    return [...new Set(trios.map(t => t.materia))].sort((a, b) => a.localeCompare(b, "es"));
  }, [trios]);

  // 2. Grados para la materia seleccionada
  const gradosParaMateria = useMemo(() => {
    if (!materiaSeleccionada) return [];
    const gs = [...new Set(trios.filter(t => t.materia === materiaSeleccionada).map(t => t.grado))];
    return gs.sort((a, b) => ordenGrados.indexOf(a) - ordenGrados.indexOf(b));
  }, [trios, materiaSeleccionada]);

  // 3. Salones para materia + grado
  const salonesParaGrado = useMemo(() => {
    if (!materiaSeleccionada || !gradoSeleccionado) return [];
    const ss = [...new Set(
      trios.filter(t => t.materia === materiaSeleccionada && t.grado === gradoSeleccionado).map(t => t.salon)
    )];
    return ss.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [trios, materiaSeleccionada, gradoSeleccionado]);

  // 4. Estudiantes del salón
  const estudiantesDelSalon = useMemo(() => {
    if (!gradoSeleccionado || !salonSeleccionado) return [];
    return getPromediosEstudiantes("anual", gradoSeleccionado, salonSeleccionado)
      .map(e => ({ codigo: e.codigo_estudiantil, nombre: e.nombre_completo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [gradoSeleccionado, salonSeleccionado, getPromediosEstudiantes]);

  const periodoNumerico = periodoSeleccionado === "anual"
    ? ("anual" as const)
    : parseInt(periodoSeleccionado);

  // Título dinámico
  const getTitulo = () => {
    const periodoTexto = periodoSeleccionado === "anual" ? "Acumulado Anual" : `Período ${periodoSeleccionado}`;
    if (nivelAnalisis === "estudiante" && estudianteSeleccionado) {
      const est = estudiantesDelSalon.find(e => e.codigo === estudianteSeleccionado);
      return `${est?.nombre || "Estudiante"} - ${periodoTexto}`;
    }
    const partes = [materiaSeleccionada || "Materia"];
    if (gradoSeleccionado) {
      partes.push(salonSeleccionado ? `${gradoSeleccionado} ${salonSeleccionado}` : gradoSeleccionado);
    }
    partes.push(periodoTexto);
    return partes.join(" - ");
  };

  const isLoading = loading || loadingAsignaciones;
  const filtrosCompletos = materiaSeleccionada && gradoSeleccionado && salonSeleccionado;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard")} className="text-primary hover:underline">Inicio</button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Estadísticas</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando datos...</span>
          </div>
        ) : (
          <>
            {/* Filtros propios del profesor */}
            <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Filtros de análisis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Período */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Período</label>
                  <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                    <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Período 1</SelectItem>
                      <SelectItem value="2">Período 2</SelectItem>
                      <SelectItem value="3">Período 3</SelectItem>
                      <SelectItem value="4">Período 4</SelectItem>
                      <SelectItem value="anual">Acumulado Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Materia */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Materia</label>
                  <Select value={materiaSeleccionada} onValueChange={(val) => {
                    setMateriaSeleccionada(val);
                    setGradoSeleccionado("");
                    setSalonSeleccionado("");
                    setEstudianteSeleccionado("");
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar materia" /></SelectTrigger>
                    <SelectContent>
                      {materiasProfesor.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Grado - visible tras elegir materia */}
                {materiaSeleccionada && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Grado</label>
                    <Select value={gradoSeleccionado} onValueChange={(val) => {
                      setGradoSeleccionado(val);
                      setSalonSeleccionado("");
                      setEstudianteSeleccionado("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                      <SelectContent>
                        {gradosParaMateria.map(g => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Salón - visible tras elegir grado */}
                {materiaSeleccionada && gradoSeleccionado && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Salón</label>
                    <Select value={salonSeleccionado} onValueChange={(val) => {
                      setSalonSeleccionado(val);
                      setEstudianteSeleccionado("");
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar salón" /></SelectTrigger>
                      <SelectContent>
                        {salonesParaGrado.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Nivel - visible tras elegir salón */}
                {filtrosCompletos && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Ver por</label>
                    <Select value={nivelAnalisis} onValueChange={(val) => {
                      setNivelAnalisis(val);
                      setEstudianteSeleccionado("");
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salon">Por Salón</SelectItem>
                        <SelectItem value="estudiante">Por Estudiante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Estudiante - visible si nivel = estudiante */}
                {filtrosCompletos && nivelAnalisis === "estudiante" && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Estudiante</label>
                    <Select value={estudianteSeleccionado} onValueChange={setEstudianteSeleccionado}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar estudiante" /></SelectTrigger>
                      <SelectContent>
                        {estudiantesDelSalon.map(e => (
                          <SelectItem key={e.codigo} value={e.codigo}>{e.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Resultados */}
            {filtrosCompletos && nivelAnalisis === "salon" && (
              <AnalisisMateria
                materia={materiaSeleccionada}
                periodo={periodoNumerico}
                grado={gradoSeleccionado}
                salon={salonSeleccionado}
                titulo={getTitulo()}
              />
            )}
            {filtrosCompletos && nivelAnalisis === "estudiante" && estudianteSeleccionado && (
              <AnalisisEstudiante
                codigoEstudiante={estudianteSeleccionado}
                periodo={periodoNumerico}
                titulo={getTitulo()}
              />
            )}

            {/* Mensajes guía */}
            {!materiaSeleccionada && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona una materia para comenzar
              </div>
            )}
            {materiaSeleccionada && !gradoSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un grado
              </div>
            )}
            {materiaSeleccionada && gradoSeleccionado && !salonSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un salón
              </div>
            )}
            {filtrosCompletos && nivelAnalisis === "estudiante" && !estudianteSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un estudiante para ver su análisis
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EstadisticasProfesor;
