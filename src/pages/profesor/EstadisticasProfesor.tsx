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

  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("1");
  const [nivelAnalisis, setNivelAnalisis] = useState("grado");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
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
        for (let i = 0; i < a.materias.length; i++) {
          result.push({ materia: a.materias[i], grado: a.grados[i], salon: a.salones[i] });
        }
      } else {
        for (const mat of a.materias)
          for (const grad of a.grados)
            for (const sal of a.salones)
              result.push({ materia: mat, grado: grad, salon: sal });
      }
    });
    return result.filter(t =>
      todosLosSalones.some(ts => ts.grado === t.grado && ts.salon === t.salon)
    );
  }, [asignaciones, todosLosSalones]);

  // Materias del profesor
  const materiasProfesor = useMemo(() => {
    return [...new Set(trios.map(t => t.materia))].sort((a, b) => a.localeCompare(b, "es"));
  }, [trios]);

  // Default: primera materia
  useEffect(() => {
    if (materiasProfesor.length > 0 && !materiaSeleccionada) {
      setMateriaSeleccionada(materiasProfesor[0]);
    }
  }, [materiasProfesor, materiaSeleccionada]);

  // Grados donde el profesor da la materia seleccionada
  const gradosParaMateria = useMemo(() => {
    if (!materiaSeleccionada) return [];
    const gs = [...new Set(trios.filter(t => t.materia === materiaSeleccionada).map(t => t.grado))];
    return gs.sort((a, b) => ordenGrados.indexOf(a) - ordenGrados.indexOf(b));
  }, [trios, materiaSeleccionada]);

  // Salones para materia + grado
  const salonesParaGrado = useMemo(() => {
    if (!materiaSeleccionada || !gradoSeleccionado) return [];
    const ss = [...new Set(
      trios.filter(t => t.materia === materiaSeleccionada && t.grado === gradoSeleccionado).map(t => t.salon)
    )];
    return ss.sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [trios, materiaSeleccionada, gradoSeleccionado]);

  // Estudiantes del salón
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
            <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
              <h3 className="font-semibold text-foreground mb-4">Filtros de análisis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* 1. Materia */}
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

                {/* 2. Período */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Período</label>
                  <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Período 1</SelectItem>
                      <SelectItem value="2">Período 2</SelectItem>
                      <SelectItem value="3">Período 3</SelectItem>
                      <SelectItem value="4">Período 4</SelectItem>
                      <SelectItem value="anual">Acumulado Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Nivel de Análisis */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Nivel de Análisis</label>
                  <Select value={nivelAnalisis} onValueChange={(val) => {
                    setNivelAnalisis(val);
                    setGradoSeleccionado("");
                    setSalonSeleccionado("");
                    setEstudianteSeleccionado("");
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grado">Por Grado</SelectItem>
                      <SelectItem value="salon">Por Salón</SelectItem>
                      <SelectItem value="estudiante">Por Estudiante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Grado - visible para grado, salon, estudiante */}
                {(nivelAnalisis === "grado" || nivelAnalisis === "salon" || nivelAnalisis === "estudiante") && (
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

                {/* 5. Salón - visible para salon, estudiante */}
                {(nivelAnalisis === "salon" || nivelAnalisis === "estudiante") && gradoSeleccionado && (
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

                {/* 6. Estudiante - visible para estudiante */}
                {nivelAnalisis === "estudiante" && gradoSeleccionado && salonSeleccionado && (
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
            {nivelAnalisis === "grado" && gradoSeleccionado && (
              <AnalisisMateria
                materia={materiaSeleccionada}
                periodo={periodoNumerico}
                grado={gradoSeleccionado}
                salon=""
                titulo={getTitulo()}
              />
            )}
            {nivelAnalisis === "salon" && gradoSeleccionado && salonSeleccionado && (
              <AnalisisMateria
                materia={materiaSeleccionada}
                periodo={periodoNumerico}
                grado={gradoSeleccionado}
                salon={salonSeleccionado}
                titulo={getTitulo()}
              />
            )}
            {nivelAnalisis === "estudiante" && estudianteSeleccionado && (
              <AnalisisEstudiante
                codigoEstudiante={estudianteSeleccionado}
                periodo={periodoNumerico}
                titulo={getTitulo()}
              />
            )}

            {/* Mensajes guía */}
            {(nivelAnalisis === "grado" || nivelAnalisis === "salon" || nivelAnalisis === "estudiante") && !gradoSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un grado para ver el análisis
              </div>
            )}
            {(nivelAnalisis === "salon" || nivelAnalisis === "estudiante") && gradoSeleccionado && !salonSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un salón para ver el análisis
              </div>
            )}
            {nivelAnalisis === "estudiante" && gradoSeleccionado && salonSeleccionado && !estudianteSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un estudiante para ver el análisis
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EstadisticasProfesor;
