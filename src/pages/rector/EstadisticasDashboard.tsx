import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession, isRectorOrCoordinador } from "@/hooks/useSession";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import { FiltrosEstadisticas } from "@/components/estadisticas/FiltrosEstadisticas";
import { AnalisisInstitucional } from "@/components/estadisticas/AnalisisInstitucional";
import { AnalisisGrado } from "@/components/estadisticas/AnalisisGrado";
import { AnalisisSalon } from "@/components/estadisticas/AnalisisSalon";
import { AnalisisEstudiante } from "@/components/estadisticas/AnalisisEstudiante";
import { AnalisisMateria } from "@/components/estadisticas/AnalisisMateria";
import { Loader2 } from "lucide-react";

const EstadisticasDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, grados, salones, materias, getMateriasFiltradas, getPromediosEstudiantes } = useEstadisticas();
  
  // Leer filtros desde URL params (para restaurar estado al volver)
  const [nivelAnalisis, setNivelAnalisis] = useState(() => searchParams.get("nivel") || "institucion");
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
    if (!isRectorOrCoordinador()) {
      navigate("/dashboard");
      return;
    }
  }, [navigate]);

  // Obtener materias filtradas según grado y salón seleccionados
  const materiasFiltradas = useMemo(() => {
    // Si no hay grado seleccionado o es "all", mostrar todas las materias
    if (!gradoSeleccionado || gradoSeleccionado === "all") {
      return materias;
    }
    // Si hay grado pero no salón o es "all", filtrar solo por grado
    if (!salonSeleccionado || salonSeleccionado === "all") {
      return getMateriasFiltradas(gradoSeleccionado);
    }
    // Si hay grado y salón, filtrar por ambos
    return getMateriasFiltradas(gradoSeleccionado, salonSeleccionado);
  }, [gradoSeleccionado, salonSeleccionado, materias, getMateriasFiltradas]);

  // Obtener lista de estudiantes del salón seleccionado
  const estudiantesDelSalon = useMemo(() => {
    if (!gradoSeleccionado || !salonSeleccionado) return [];
    const estudiantes = getPromediosEstudiantes("anual", gradoSeleccionado, salonSeleccionado);
    return estudiantes.map(e => ({
      codigo: e.codigo_estudiantil,
      nombre: e.nombre_completo
    })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [gradoSeleccionado, salonSeleccionado, getPromediosEstudiantes]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const periodoNumerico = periodoSeleccionado === "anual" 
    ? "anual" as const
    : parseInt(periodoSeleccionado);

  // Verificar si todos los filtros necesarios están seleccionados
  const filtrosCompletos = () => {
    if (nivelAnalisis === "institucion") return true;
    if (nivelAnalisis === "grado") return gradoSeleccionado && gradoSeleccionado !== "";
    if (nivelAnalisis === "salon") return gradoSeleccionado && salonSeleccionado && salonSeleccionado !== "";
    if (nivelAnalisis === "estudiante") return gradoSeleccionado && salonSeleccionado && estudianteSeleccionado;
    if (nivelAnalisis === "materia") return materiaSeleccionada && materiaSeleccionada !== "";
    return false;
  };

  // Generar título dinámico basado en filtros
  const getTituloDinamico = () => {
    const periodoTexto = periodoSeleccionado === "anual" 
      ? "Acumulado Anual" 
      : `Período ${periodoSeleccionado}`;
    
    if (nivelAnalisis === "institucion") {
      return `Institución - ${periodoTexto}`;
    }
    
    if (nivelAnalisis === "grado") {
      const nombreGrado = gradoSeleccionado && gradoSeleccionado !== "all" 
        ? gradoSeleccionado 
        : "Todos los Grados";
      return `${nombreGrado} - ${periodoTexto}`;
    }
    
    if (nivelAnalisis === "salon") {
      const nombreGrado = gradoSeleccionado || "";
      const nombreSalon = salonSeleccionado && salonSeleccionado !== "all" 
        ? salonSeleccionado 
        : "";
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/dashboard-rector" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
            <img src={escudoImg} alt="Escudo" className="w-10 h-10 md:w-16 md:h-16 object-contain -my-1 md:-my-2" />
            <h1 className="text-base md:text-xl font-bold">Notas Normy</h1>
          </Link>
          <Button variant="secondary" onClick={handleLogout} className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2">
            Cerrar sesión
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-rector")} className="text-primary hover:underline">Inicio</button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Estadísticas</span>
          </div>
        </div>

        {loading ? (
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
              grados={grados}
              salones={salones}
              materias={materiasFiltradas}
              estudiantes={estudiantesDelSalon}
            />

            {nivelAnalisis === "institucion" && (
              <AnalisisInstitucional periodo={periodoNumerico} titulo={getTituloDinamico()} />
            )}
            {nivelAnalisis === "grado" && gradoSeleccionado && (
              <AnalisisGrado grado={gradoSeleccionado} periodo={periodoNumerico} titulo={getTituloDinamico()} />
            )}
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
            {nivelAnalisis === "grado" && !gradoSeleccionado && (
              <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
                Selecciona un grado para ver el análisis
              </div>
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

export default EstadisticasDashboard;
