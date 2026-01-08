import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession } from "@/hooks/useSession";

const SeleccionarGrado = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [grados, setGrados] = useState<string[]>([]);
  const [selectedGrado, setSelectedGrado] = useState<string | null>(null);
  const [loadingGrados, setLoadingGrados] = useState(true);

  useEffect(() => {
    const session = getSession();
    const storedMateria = localStorage.getItem("materiaSeleccionada");

    if (!session.codigo) {
      navigate("/");
      return;
    }

    if (!storedMateria) {
      navigate("/dashboard");
      return;
    }

    setMateriaSeleccionada(storedMateria);

    const fetchGrados = async () => {
      try {
        // Obtener el id del profesor desde Internos
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          setLoadingGrados(false);
          return;
        }

        // Buscar asignaciones que contengan la materia seleccionada
        const { data: asignaciones, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignaciones) {
          setLoadingGrados(false);
          return;
        }

        // Filtrar solo las asignaciones que contienen la materia seleccionada
        const asignacionesFiltradas = asignaciones.filter(a => {
          const materias = (a['Materia(s)'] || []).flat();
          return materias.includes(storedMateria);
        });

        console.log("Grados antes de aplanar:", asignacionesFiltradas?.map(a => a['Grado(s)']));

        // Extraer todos los grados y eliminar duplicados
        const todosGrados = asignacionesFiltradas
          ?.flatMap(a => a['Grado(s)'] || [])
          .flat() || [];
        const gradosUnicos = [...new Set(todosGrados)];
        setGrados(gradosUnicos);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingGrados(false);
      }
    };

    fetchGrados();
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
        {/* Breadcrumb / Materia seleccionada */}
        <div className="bg-card rounded-lg shadow-soft p-4 max-w-4xl mx-auto mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => navigate("/dashboard")}
              className="text-primary hover:underline"
            >
              Materias
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{materiaSeleccionada}</span>
          </div>
        </div>

        {/* Sección de Grados */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Elige tu grado:
          </h3>
          
          {loadingGrados ? (
            <div className="text-center text-muted-foreground">
              Cargando grados...
            </div>
          ) : grados.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No hay grados asignados para esta materia
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grados.map((grado, index) => {
                const isSelected = selectedGrado === grado;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedGrado(grado);
                      localStorage.setItem("gradoSeleccionado", grado);
                      navigate("/seleccionar-salon");
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
                    <span className="font-medium text-foreground">{grado}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeleccionarGrado;
