import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isProfesor } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import { FiltrosEstadisticas } from "@/components/estadisticas/FiltrosEstadisticas";
import { AnalisisSalon } from "@/components/estadisticas/AnalisisSalon";
import { AnalisisEstudiante } from "@/components/estadisticas/AnalisisEstudiante";
import { AnalisisMateria } from "@/components/estadisticas/AnalisisMateria";
import { Loader2 } from "lucide-react";
import { ordenGrados } from "@/hooks/useEstadisticas";

interface Asignacion {
  materias: string[];
  grados: string[];
  salones: string[];
}

const NIVELES_PROFESOR = [
  { value: "salon", label: "Por Salón" },
  { value: "estudiante", label: "Por Estudiante" },
  { value: "materia", label: "Por Materia" },
];

const EstadisticasProfesor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, salones: todosLosSalones, getMateriasFiltradas, getPromediosEstudiantes } = useEstadisticas();

  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);

  const [nivelAnalisis, setNivelAnalisis] = useState(() => searchParams.get("nivel") || "salon");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(() => searchParams.get("periodo") || "1");
  const [gradoSeleccionado, setGradoSeleccionado] = useState(() => searchParams.get("grado") || "");
  const [salonSeleccionado, setSalonSeleccionado] = useState(() => searchParams.get("salon") || "");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(() => searchParams.get("materia") || "");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(() => searchParams.get("estudiante") || "");

  useEffect(() => {
    const session = getSession();
    if (!session.codigo) {
      navigate("/");
      return;
    }
    if (!isProfesor()) {
      navigate("/dashboard");
      return;
    }

    const fetchAsignaciones = async () => {
      try {
        const { data: profesor } = await supabase
          .from("Internos")
          .select("id")
          .eq("codigo", parseInt(session.codigo!))
          .single();

        if (!profesor) return;

        const { data: rows } = await supabase
          .from("Asignación Profesores")
          .select('"Materia(s)", "Grado(s)", "Salon(es)"')
          .eq("id", profesor.id);

        if (rows) {
          setAsignaciones(
            rows.map((r: any) => ({
              materias: Array.isArray(r["Materia(s)"]) ? r["Materia(s)"] : [],
              grados: Array.isArray(r["Grado(s)"]) ? r["Grado(s)"] : [],
              salones: Array.isArray(r["Salon(es)"]) ? r["Salon(es)"] : [],
            }))
          );
        }
      } catch (err) {
        console.error("Error cargando asignaciones:", err);
      } finally {
        setLoadingAsignaciones(false);
      }
    };

    fetchAsignaciones();
  }, [navigate]);

  // Extraer grados, salones y materias únicos del profesor
  const gradosProfesor = useMemo(() => {
    const set = new Set<string>();
    asignaciones.forEach(a => a.grados.forEach(g => set.add(g)));
    return [...set].sort((a, b) => ordenGrados.indexOf(a) - ordenGrados.indexOf(b));
  }, [asignaciones]);

  const salonesProfesor = useMemo(() => {
    const pares: { grado: string; salon: string }[] = [];
    asignaciones.forEach(a => {
      // ZIP si misma longitud, cartesiano si no
      if (a.grados.length === a.salones.length) {
        a.grados.forEach((g, i) => {
          if (!pares.find(p => p.grado === g && p.salon === a.salones[i])) {
            pares.push({ grado: g, salon: a.salones[i] });
          }
        });
      } else {
        a.grados.forEach(g => {
          a.salones.forEach(s => {
            if (!pares.find(p => p.grado === g && p.salon === s)) {
              pares.push({ grado: g, salon: s });
            }
          });
        });
      }
    });
    // Solo incluir salones que realmente existen en la base de datos
    return pares.filter(p =>
      todosLosSalones.some(ts => ts.grado === p.grado && ts.salon === p.salon)
    );
  }, [asignaciones, todosLosSalones]);

  const materiasProfesor = useMemo(() => {
    const set = new Set<string>();
    asignaciones.forEach(a => a.materias.forEach(m => set.add(m)));
    return [...set].sort();
  }, [asignaciones]);

  // Materias filtradas por grado/salón seleccionado (intersectadas con las del profesor)
  const materiasFiltradas = useMemo(() => {
    if (!gradoSeleccionado || gradoSeleccionado === "all") return materiasProfesor;
    if (!salonSeleccionado || salonSeleccionado === "all") {
      const fromHook = getMateriasFiltradas(gradoSeleccionado);
      return fromHook.filter(m => materiasProfesor.includes(m));
    }
    const fromHook = getMateriasFiltradas(gradoSeleccionado, salonSeleccionado);
    return fromHook.filter(m => materiasProfesor.includes(m));
  }, [gradoSeleccionado, salonSeleccionado, materiasProfesor, getMateriasFiltradas]);

  // Lista de estudiantes del salón seleccionado
  const estudiantesDelSalon = useMemo(() => {
    if (!gradoSeleccionado || !salonSeleccionado) return [];
    const estudiantes = getPromediosEstudiantes("anual", gradoSeleccionado, salonSeleccionado);
    return estudiantes
      .map(e => ({ codigo: e.codigo_estudiantil, nombre: e.nombre_completo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [gradoSeleccionado, salonSeleccionado, getPromediosEstudiantes]);

  const periodoNumerico = periodoSeleccionado === "anual"
    ? ("anual" as const)
    : parseInt(periodoSeleccionado);

  // Título dinámico
  const getTituloDinamico = () => {
    const periodoTexto = periodoSeleccionado === "anual"
      ? "Acumulado Anual"
      : `Período ${periodoSeleccionado}`;

    if (nivelAnalisis === "salon") {
      const nombreGrado = gradoSeleccionado || "";
      const nombreSalon = salonSeleccionado && salonSeleccionado !== "all" ? salonSeleccionado : "";
      const salonCompleto = nombreSalon ? `${nombreGrado} ${nombreSalon}` : nombreGrado;
      return `${salonCompleto} - ${periodoTexto}`;
    }

    if (nivelAnalisis === "estudiante") {
      const estudiante = estudiantesDelSalon.find(e => e.codigo === estudianteSeleccionado);
      const nombreEstudiante = estudiante?.nombre || "Estudiante";
      return `${nombreEstudiante} - ${periodoTexto}`;
    }

    if (nivelAnalisis === "materia") {
      const nombreMateria = materiaSeleccionada || "Materia";
      const partes = [nombreMateria];
      if (gradoSeleccionado && gradoSeleccionado !== "all") {
        if (salonSeleccionado && salonSeleccionado !== "all") {
          partes.push(`${gradoSeleccionado} ${salonSeleccionado}`);
        } else {
          partes.push(gradoSeleccionado);
        }
      }
      partes.push(periodoTexto);
      return partes.join(" - ");
    }

    return periodoTexto;
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
            <FiltrosEstadisticas
              nivelAnalisis={nivelAnalisis}
              setNivelAnalisis={setNivelAnalisis}
              periodoSeleccionado={periodoSeleccionado}
              setPeriodoSeleccionado={setPeriodoSeleccionado}
              gradoSeleccionado={gradoSeleccionado}
              setGradoSeleccionado={setGradoSeleccionado}
              salonSeleccionado={salonSeleccionado}
              setSalonSeleccionado={setSalonSeleccionado}
              materiaSeleccionada={materiaSeleccionada}
              setMateriaSeleccionada={setMateriaSeleccionada}
              estudianteSeleccionado={estudianteSeleccionado}
              setEstudianteSeleccionado={setEstudianteSeleccionado}
              grados={gradosProfesor}
              salones={salonesProfesor}
              materias={materiasFiltradas}
              estudiantes={estudiantesDelSalon}
              nivelesDisponibles={NIVELES_PROFESOR}
            />

            {nivelAnalisis === "salon" && gradoSeleccionado && salonSeleccionado && (
              <AnalisisSalon grado={gradoSeleccionado} salon={salonSeleccionado} periodo={periodoNumerico} titulo={getTituloDinamico()} />
            )}
            {nivelAnalisis === "estudiante" && estudianteSeleccionado && (
              <AnalisisEstudiante
                codigoEstudiante={estudianteSeleccionado}
                periodo={periodoNumerico}
                titulo={getTituloDinamico()}
              />
            )}
            {nivelAnalisis === "materia" && materiaSeleccionada && (
              <AnalisisMateria
                materia={materiaSeleccionada}
                periodo={periodoNumerico}
                grado={gradoSeleccionado}
                salon={salonSeleccionado}
                titulo={getTituloDinamico()}
              />
            )}

            {nivelAnalisis === "salon" && (!gradoSeleccionado || !salonSeleccionado) && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un grado y salón para ver el análisis
              </div>
            )}
            {nivelAnalisis === "estudiante" && !estudianteSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un estudiante para ver el análisis
              </div>
            )}
            {nivelAnalisis === "materia" && !materiaSeleccionada && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona una materia para ver su análisis
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EstadisticasProfesor;
