import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import normyExaminadoraImg from "@/assets/normy-examinadora.webp";
import { getSession } from "@/hooks/useSession";
import { BarChart3, Megaphone, FileUp } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";

const Dashboard = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [asignaturas, setAsignaturas] = useState<string[]>([]);
  const [selectedAsignatura, setSelectedAsignatura] = useState<string | null>(null);
  const [loadingAsignaturas, setLoadingAsignaturas] = useState(true);

  useEffect(() => {
    const session = getSession();
    
    if (!session.codigo) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");

    // Fetch asignaturas del profesor
    const fetchAsignaturas = async () => {
      try {
        // Primero obtener el id del profesor desde Internos
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          setLoadingAsignaturas(false);
          return;
        }

        // Luego buscar las asignaturas en Asignación Profesores (puede tener múltiples registros)
        const { data: asignaciones, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Asignatura(s)", "Grado(s)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignaciones) {
          setLoadingAsignaturas(false);
          return;
        }

        // Combinar todas las asignaturas de todos los registros sin duplicados
        console.log("Asignaturas antes de aplanar:", asignaciones?.map(a => a['Asignatura(s)']));
        
        const todasAsignaturas = asignaciones
          ?.flatMap(a => a['Asignatura(s)'] || [])
          .flat() || [];
        const asignaturasUnicas = [...new Set(todasAsignaturas)].sort((a, b) => a.localeCompare(b, 'es'));
        setAsignaturas(asignaturasUnicas);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingAsignaturas(false);
      }
    };

    fetchAsignaturas();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-8">
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Bienvenido(a)
          </h2>
          <p className="text-xl text-primary font-semibold">
            {nombres} {apellidos}
          </p>
          <p className="text-muted-foreground mt-2">
            Sistema de gestión de calificaciones
          </p>
        </div>

        {/* Sección de Asignaturas */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Elige tu asignatura:
          </h3>
          
          {loadingAsignaturas ? (
            <div className="text-center text-muted-foreground">
              Cargando asignaturas...
            </div>
          ) : asignaturas.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No tienes asignaturas asignadas
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {asignaturas.map((asignatura, index) => {
                const isSelected = selectedAsignatura === asignatura;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedAsignatura(asignatura);
                      localStorage.setItem("asignaturaSeleccionada", asignatura);
                      navigate("/seleccionar-grado");
                    }}
                    className={`
                      p-6 rounded-lg border-2 text-center transition-all duration-200
                      hover:shadow-md hover:border-primary hover:bg-primary/10
                      ${isSelected 
                        ? 'border-primary bg-primary/20 shadow-md ring-2 ring-primary/30' 
                        : 'border-border bg-background'
                      }
                    `}
                  >
                    <span className="font-medium text-foreground">{asignatura}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones de acciones */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-8 max-w-[1120px] mx-auto">
          <button
            onClick={() => navigate("/enviar-comunicado")}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-purple-600 hover:to-purple-500 text-center"
          >
            <Megaphone className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
            <span>Enviar Comunicado</span>
          </button>
          <button
            onClick={() => navigate("/enviar-documento")}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-orange-600 hover:to-orange-500 text-center"
          >
            <FileUp className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
            <span>Enviar Documento</span>
          </button>
          <button
            onClick={() => navigate("/normy-examinadora")}
            className="relative overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-green-400 to-green-500 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-green-500 hover:to-green-400 text-center"
          >
            <span className="relative z-10">Normy Examinadora</span>
            <img
              src={normyExaminadoraImg}
              alt="Normy Examinadora"
              className="absolute right-0 bottom-0 h-full w-auto object-contain opacity-40"
            />
          </button>
          <button
            onClick={() => navigate("/profesor/estadisticas")}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-blue-600 hover:to-blue-500 text-center"
          >
            <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
            <span>Estadísticas</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
