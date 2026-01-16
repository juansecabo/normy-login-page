import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession, isRectorOrCoordinador } from "@/hooks/useSession";

const ListaMaterias = () => {
  const navigate = useNavigate();
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [materias, setMaterias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

    const storedGrado = localStorage.getItem("gradoSeleccionado");
    const storedSalon = localStorage.getItem("salonSeleccionado");

    if (!storedGrado) {
      navigate("/rector/seleccionar-grado");
      return;
    }

    if (!storedSalon) {
      navigate("/rector/seleccionar-salon");
      return;
    }

    setGradoSeleccionado(storedGrado);
    setSalonSeleccionado(storedSalon);
    fetchMaterias(storedGrado, storedSalon);
  }, [navigate]);

  const fetchMaterias = async (grado: string, salon: string) => {
    try {
      // Obtener todas las asignaciones para este grado y salón
      const { data, error } = await supabase
        .from('Asignación Profesores')
        .select('"Materia(s)", "Grado(s)", "Salon(es)"');

      if (error) {
        console.error('Error fetching materias:', error);
        setLoading(false);
        return;
      }

      // Filtrar por grado y salón
      const materiasDelGrado: string[] = [];
      
      data?.forEach((asignacion) => {
        const grados = asignacion['Grado(s)'] || [];
        const salones = asignacion['Salon(es)'] || [];
        const materiasAsig = asignacion['Materia(s)'] || [];

        // Verificar si el grado y salón están en esta asignación
        if (grados.includes(grado) && salones.includes(salon)) {
          materiasAsig.forEach((materia: string) => {
            if (!materiasDelGrado.includes(materia)) {
              materiasDelGrado.push(materia);
            }
          });
        }
      });

      // Ordenar alfabéticamente
      materiasDelGrado.sort((a, b) => a.localeCompare(b, 'es'));
      setMaterias(materiasDelGrado);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const handleSelectMateria = (materia: string) => {
    localStorage.setItem("materiaSeleccionada", materia);
    navigate("/rector/tabla-notas");
  };

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
      <main className="flex-1 container mx-auto p-8">
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
              onClick={() => navigate("/rector/modo-visualizacion")}
              className="text-primary hover:underline"
            >
              Por Materia
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Seleccionar Materia</span>
          </div>
        </div>

        {/* Lista de Materias */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Selecciona la materia:
          </h3>
          
          {loading ? (
            <div className="text-center text-muted-foreground">
              Cargando materias...
            </div>
          ) : materias.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No hay materias asignadas para este grado y salón
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materias.map((materia) => (
                <button
                  key={materia}
                  onClick={() => handleSelectMateria(materia)}
                  className="p-6 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10 border-border bg-background"
                >
                  <span className="font-medium text-foreground">{materia}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ListaMaterias;
