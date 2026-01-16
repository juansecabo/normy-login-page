import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  const { loading, grados, salones, materias, getPromediosEstudiantes } = useEstadisticas();
  
  const [nivelAnalisis, setNivelAnalisis] = useState("institucion");
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("anual");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");

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
              materias={materias}
              estudiantes={estudiantesDelSalon}
            />

            {nivelAnalisis === "institucion" && (
              <AnalisisInstitucional periodo={periodoNumerico} />
            )}
            {nivelAnalisis === "grado" && (
              <AnalisisGrado grado={gradoSeleccionado} periodo={periodoNumerico} />
            )}
            {nivelAnalisis === "salon" && (
              <AnalisisSalon grado={gradoSeleccionado} salon={salonSeleccionado} periodo={periodoNumerico} />
            )}
            {nivelAnalisis === "estudiante" && (
              <AnalisisEstudiante 
                codigoEstudiante={estudianteSeleccionado} 
                periodo={periodoNumerico} 
              />
            )}
            {nivelAnalisis === "materia" && (
              <AnalisisMateria 
                materia={materiaSeleccionada} 
                periodo={periodoNumerico}
                grado={gradoSeleccionado}
                salon={salonSeleccionado}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default EstadisticasDashboard;
