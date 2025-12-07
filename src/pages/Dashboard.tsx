import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [materias, setMaterias] = useState<string[]>([]);
  const [selectedMateria, setSelectedMateria] = useState<string | null>(null);
  const [loadingMaterias, setLoadingMaterias] = useState(true);

  useEffect(() => {
    const storedNombres = localStorage.getItem("nombres");
    const storedApellidos = localStorage.getItem("apellidos");
    const storedCodigo = localStorage.getItem("codigo");

    if (!storedCodigo) {
      navigate("/");
      return;
    }

    setNombres(storedNombres || "");
    setApellidos(storedApellidos || "");

    // Fetch materias del profesor
    const fetchMaterias = async () => {
      try {
        console.log("1. Codigo desde localStorage:", storedCodigo);
        
        // Primero obtener el id del profesor desde Internos
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(storedCodigo))
          .single();

        console.log("2. ID del profesor desde Internos:", profesor?.id);
        console.log("2b. Error profesor si hay:", profesorError);

        if (profesorError || !profesor) {
          console.error('Error fetching profesor:', profesorError);
          setLoadingMaterias(false);
          return;
        }

        // Luego buscar las materias en Asignación Profesores (puede tener múltiples registros)
        const { data: asignaciones, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)"')
          .eq('id', profesor.id);

        console.log("3. Asignaciones encontradas:", asignaciones);
        console.log("4. Error asignaciones si hay:", asignacionError);

        if (asignacionError || !asignaciones) {
          console.error('Error fetching materias:', asignacionError);
          setLoadingMaterias(false);
          return;
        }

        // Combinar todas las materias de todos los registros sin duplicados
        const todasMaterias = asignaciones.flatMap(a => a['Materia(s)'] || []);
        const materiasUnicas = [...new Set(todasMaterias)];
        console.log("5. Materias únicas:", materiasUnicas);
        
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
    localStorage.removeItem("codigo");
    localStorage.removeItem("nombres");
    localStorage.removeItem("apellidos");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold">Notas Normy</h1>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium"
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
              {materias.map((materia, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedMateria(materia)}
                  className={`
                    p-6 rounded-lg border-2 text-center transition-all duration-200
                    hover:shadow-md hover:border-primary hover:bg-primary/5
                    ${selectedMateria === materia 
                      ? 'border-primary bg-primary/10 shadow-md' 
                      : 'border-border bg-card'
                    }
                  `}
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

export default Dashboard;
