import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession, isRectorOrCoordinador } from "@/hooks/useSession";

const SeleccionarSalonRector = () => {
  const navigate = useNavigate();
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salones, setSalones] = useState<string[]>([]);
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
    if (!storedGrado) {
      navigate("/rector/seleccionar-grado");
      return;
    }

    setGradoSeleccionado(storedGrado);
    fetchSalones(storedGrado);
  }, [navigate]);

  const fetchSalones = async (grado: string) => {
    try {
      // Obtener salones únicos de la tabla Estudiantes para el grado seleccionado
      const { data, error } = await supabase
        .from('Estudiantes')
        .select('salon_estudiante')
        .eq('grado_estudiante', grado);

      if (error) {
        console.error('Error fetching salones:', error);
        setLoading(false);
        return;
      }

      // Obtener salones únicos
      const salonesUnicos = [...new Set(data?.map(e => e.salon_estudiante) || [])].sort();
      setSalones(salonesUnicos);
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

  const handleSelectSalon = (salon: string) => {
    localStorage.setItem("salonSeleccionado", salon);
    navigate("/rector/modo-visualizacion");
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
            <span className="text-foreground font-medium">Seleccionar Salón</span>
          </div>
        </div>

        {/* Selector de Salón */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Selecciona el salón:
          </h3>
          
          {loading ? (
            <div className="text-center text-muted-foreground">
              Cargando salones...
            </div>
          ) : salones.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No hay salones disponibles para este grado
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {salones.map((salon) => (
                <button
                  key={salon}
                  onClick={() => handleSelectSalon(salon)}
                  className="p-4 rounded-lg border-2 text-center transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10 border-border bg-background"
                >
                  <span className="font-medium text-foreground">{salon}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SeleccionarSalonRector;
