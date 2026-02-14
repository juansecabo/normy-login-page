import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import normyExaminadoraImg from "@/assets/normy-examinadora.webp";
import { getSession } from "@/hooks/useSession";
import { BarChart3 } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";

const Dashboard = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [materias, setMaterias] = useState<string[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const [loadingMaterias, setLoadingMaterias] = useState(true);

  useEffect(() => {
    const session = getSession();
    
    if (!session.codigo) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");

    // Fetch materias del profesor
    const fetchMaterias = async () => {
      try {
        // Primero obtener el id del profesor desde Internos
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          setLoadingMaterias(false);
          return;
        }

        // Luego buscar las materias en Asignación Profesores (puede tener múltiples registros)
        const { data: asignaciones, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignaciones) {
          setLoadingMaterias(false);
          return;
        }

        // Combinar todas las materias de todos los registros sin duplicados
        console.log("Materias antes de aplanar:", asignaciones?.map(a => a['Materia(s)']));
        
        const todasMaterias = asignaciones
          ?.flatMap(a => a['Materia(s)'] || [])
          .flat() || [];
        const materiasUnicas = [...new Set(todasMaterias)].sort((a, b) => a.localeCompare(b, 'es'));
        setMaterias(materiasUnicas);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingMaterias(false);
      }
    };

    fetchMaterias();
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

        {/* Sección de Materias */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Elige tu materia:
          </h3>
          
          {loadingMaterias ? (
            <div className="text-center text-muted-foreground">
              Cargando materias...
            </div>
          ) : materias.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No tienes materias asignadas
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materias.map((materia, index) => {
                const isSelected = selectedMateria === materia;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedMateria(materia);
                      localStorage.setItem("materiaSeleccionada", materia);
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
                    <span className="font-medium text-foreground">{materia}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones Normy Examinadora y Estadísticas */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button
            onClick={() => navigate("/normy-examinadora")}
            className="relative overflow-hidden p-6 rounded-lg bg-gradient-to-r from-green-400 to-green-500 text-white font-bold text-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-green-500 hover:to-green-400 min-w-[240px]"
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
            className="flex items-center gap-3 p-6 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-lg transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-blue-600 hover:to-blue-500 min-w-[240px] justify-center"
          >
            <BarChart3 className="w-6 h-6" />
            <span>Estadísticas</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
