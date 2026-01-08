import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { getSession, clearSession } from "@/hooks/useSession";

const SeleccionarSalon = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salones, setSalones] = useState<string[]>([]);
  const [selectedSalon, setSelectedSalon] = useState<string | null>(null);
  const [loadingSalones, setLoadingSalones] = useState(true);

  useEffect(() => {
    const session = getSession();
    const storedMateria = localStorage.getItem("materiaSeleccionada");
    const storedGrado = localStorage.getItem("gradoSeleccionado");

    if (!session.codigo) {
      navigate("/");
      return;
    }

    if (!storedMateria) {
      navigate("/dashboard");
      return;
    }

    if (!storedGrado) {
      navigate("/seleccionar-grado");
      return;
    }

    setMateriaSeleccionada(storedMateria);
    setGradoSeleccionado(storedGrado);

    const fetchSalones = async () => {
      try {
        // Obtener el id del profesor desde Internos
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .maybeSingle();

        if (profesorError || !profesor) {
          setLoadingSalones(false);
          return;
        }

        // Buscar asignaciones que contengan la materia y grado seleccionados
        const { data: asignaciones, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)", "Salon(es)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignaciones) {
          setLoadingSalones(false);
          return;
        }

        // Filtrar solo las asignaciones que contienen la materia y grado seleccionados
        const asignacionesFiltradas = asignaciones.filter(a => {
          const materias = (a['Materia(s)'] || []).flat();
          const grados = (a['Grado(s)'] || []).flat();
          return materias.includes(storedMateria) && grados.includes(storedGrado);
        });

        console.log("Salones antes de aplanar:", asignacionesFiltradas?.map(a => a['Salon(es)']));

        // Extraer todos los salones y eliminar duplicados
        const todosSalones = asignacionesFiltradas
          ?.flatMap(a => a['Salon(es)'] || [])
          .flat() || [];
        const salonesUnicos = [...new Set(todosSalones)];
        setSalones(salonesUnicos);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingSalones(false);
      }
    };

    fetchSalones();
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between gap-2">
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
            className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 h-auto"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 max-w-4xl mx-auto mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button 
              onClick={() => navigate("/dashboard")}
              className="text-primary hover:underline"
            >
              Materias
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/seleccionar-grado")}
              className="text-primary hover:underline"
            >
              {materiaSeleccionada}
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{gradoSeleccionado}</span>
          </div>
        </div>

        {/* Sección de Salones */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Elige tu salón:
          </h3>
          
          {loadingSalones ? (
            <div className="text-center text-muted-foreground">
              Cargando salones...
            </div>
          ) : salones.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No hay salones asignados para este grado
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {salones.map((salon, index) => {
                const isSelected = selectedSalon === salon;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSalon(salon);
                      localStorage.setItem("salonSeleccionado", salon);
                      navigate("/tabla-notas");
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
                    <span className="font-medium text-foreground">{salon}</span>
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

export default SeleccionarSalon;
