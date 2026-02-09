import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import escudoImg from "@/assets/escudo.webp";
import { getSession, clearSession, isRectorOrCoordinador } from "@/hooks/useSession";
import { BookOpen, Users } from "lucide-react";

const ModoVisualizacion = () => {
  const navigate = useNavigate();
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
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
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const handleSelectModo = (modo: "materia" | "estudiante") => {
    localStorage.setItem("modoVisualizacion", modo);
    if (modo === "materia") {
      navigate("/rector/lista-materias");
    } else {
      navigate("/rector/lista-estudiantes");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

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
              Notas
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/rector/seleccionar-salon")}
              className="text-primary hover:underline"
            >
              {gradoSeleccionado}
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{salonSeleccionado}</span>
          </div>
        </div>

        {/* Selector de Modo */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            ¿Cómo deseas ver las notas?
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto">
            <button
              onClick={() => handleSelectModo("materia")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <BookOpen className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Por Materia</span>
              <span className="text-sm text-muted-foreground text-center">
                Ver todas las materias y seleccionar una
              </span>
            </button>
            
            <button
              onClick={() => handleSelectModo("estudiante")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <Users className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Por Estudiante</span>
              <span className="text-sm text-muted-foreground text-center">
                Ver la situación académica de cada estudiante
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModoVisualizacion;
