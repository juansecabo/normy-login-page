import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";

interface Estudiante {
  id: number;
  codigo_estudiantil: string;
  apellidos_estudiante: string;
  nombre_estudiante: string;
}

const TablaNotas = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedCodigo = localStorage.getItem("codigo");
    const storedMateria = localStorage.getItem("materiaSeleccionada");
    const storedGrado = localStorage.getItem("gradoSeleccionado");
    const storedSalon = localStorage.getItem("salonSeleccionado");

    if (!storedCodigo) {
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

    if (!storedSalon) {
      navigate("/seleccionar-salon");
      return;
    }

    setMateriaSeleccionada(storedMateria);
    setGradoSeleccionado(storedGrado);
    setSalonSeleccionado(storedSalon);

    const fetchEstudiantes = async () => {
      try {
        console.log("=== DEBUG FILTRO ESTUDIANTES ===");
        console.log("Grado desde localStorage:", storedGrado);
        console.log("Salón desde localStorage:", storedSalon);
        console.log("Tipo de grado:", typeof storedGrado);
        console.log("Tipo de salón:", typeof storedSalon);

        const { data, error } = await supabase
          .from('Estudiantes')
          .select('*')
          .ilike('grado_estudiante', storedGrado!)
          .eq('salon_estudiante', storedSalon)
          .order('apellidos_estudiante', { ascending: true })
          .order('nombre_estudiante', { ascending: true });

        console.log("Estudiantes encontrados:", data?.length || 0);
        console.log("Datos:", data);

        if (error) {
          console.error('Error fetching estudiantes:', error);
          setLoading(false);
          return;
        }

        setEstudiantes(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudiantes();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("codigo");
    localStorage.removeItem("nombres");
    localStorage.removeItem("apellidos");
    localStorage.removeItem("materiaSeleccionada");
    localStorage.removeItem("gradoSeleccionado");
    localStorage.removeItem("salonSeleccionado");
    navigate("/");
  };

  const periodos = ["1er Periodo", "2do Periodo", "3er Periodo", "4to Periodo"];

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
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
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
            <button 
              onClick={() => navigate("/seleccionar-salon")}
              className="text-primary hover:underline"
            >
              {gradoSeleccionado}
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{salonSeleccionado}</span>
          </div>
        </div>

        {/* Tabla de Notas */}
        <div className="bg-card rounded-lg shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando estudiantes...
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay estudiantes en este salón
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1200px]">
                {/* Table */}
                <table className="w-full border-collapse">
                  {/* Header Row - Periods */}
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      {/* Fixed columns headers */}
                      <th className="sticky left-0 z-20 bg-primary border border-border/30 w-[100px] min-w-[100px] p-3 text-left font-semibold">
                        Código
                      </th>
                      <th className="sticky left-[100px] z-20 bg-primary border border-border/30 w-[180px] min-w-[180px] p-3 text-left font-semibold">
                        Apellidos
                      </th>
                      <th className="sticky left-[280px] z-20 bg-primary border border-border/30 w-[150px] min-w-[150px] p-3 text-left font-semibold">
                        Nombre
                      </th>
                      {/* Period headers */}
                      {periodos.map((periodo, index) => (
                        <th 
                          key={index}
                          className="border border-border/30 w-[200px] min-w-[200px] p-3 text-center font-semibold"
                        >
                          {periodo}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((estudiante, index) => (
                      <tr 
                        key={estudiante.id}
                        className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                      >
                        {/* Fixed columns */}
                        <td className={`sticky left-0 z-10 border border-border p-3 text-sm ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.codigo_estudiantil}
                        </td>
                        <td className={`sticky left-[100px] z-10 border border-border p-3 text-sm font-medium ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.apellidos_estudiante}
                        </td>
                        <td className={`sticky left-[280px] z-10 border border-border p-3 text-sm ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.nombre_estudiante}
                        </td>
                        {/* Period cells - placeholders */}
                        {periodos.map((_, periodIndex) => (
                          <td 
                            key={periodIndex}
                            className="border border-border p-3 text-center text-sm text-muted-foreground"
                          >
                            —
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TablaNotas;
