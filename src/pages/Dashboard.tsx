import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.webp";
import normyExaminadoraImg from "@/assets/normy-examinadora.webp";
import { getSession, clearSession } from "@/hooks/useSession";

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

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity cursor-pointer">
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

        {/* Botón Normy Examinadora */}
        <div className="flex justify-center mt-8">
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
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
