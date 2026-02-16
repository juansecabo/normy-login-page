import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";

interface ActividadCalendario {
  column_id: number;
  Nombres: string;
  Apellidos: string;
  Asignatura: string;
  Descripción: string;
  fecha_de_presentacion: string;
}

const CalendarioPadre = () => {
  const navigate = useNavigate();
  const [hijo, setHijo] = useState<HijoData | null>(null);
  const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    const storedHijo = localStorage.getItem("hijoSeleccionado");
    if (!storedHijo) {
      navigate("/dashboard-padre");
      return;
    }

    let hijoData: HijoData;
    try {
      hijoData = JSON.parse(storedHijo);
      setHijo(hijoData);
    } catch {
      navigate("/dashboard-padre");
      return;
    }

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('Calendario Actividades')
          .select('*')
          .eq('Grado', hijoData.grado)
          .eq('Salon', hijoData.salon)
          .order('fecha_de_presentacion', { ascending: true });

        if (!error) {
          setActividades(data || []);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [navigate]);

  const porAsignatura: Record<string, ActividadCalendario[]> = {};
  actividades.forEach(a => {
    if (!porAsignatura[a.Asignatura]) porAsignatura[a.Asignatura] = [];
    porAsignatura[a.Asignatura].push(a);
  });
  const asignaturas = Object.keys(porAsignatura).sort((a, b) => a.localeCompare(b, 'es'));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-padre")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Calendario de {hijo?.nombre}</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            Actividades Asignadas
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {hijo?.nombre} {hijo?.apellidos} — {hijo?.grado} {hijo?.salon}
          </p>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : actividades.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No hay actividades asignadas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {asignaturas.map(asignatura => (
                <div key={asignatura}>
                  <h3 className="text-lg font-semibold text-foreground mb-3 border-b border-border pb-2">
                    {asignatura}
                  </h3>
                  <div className="space-y-3">
                    {porAsignatura[asignatura].map(actividad => (
                      <div
                        key={actividad.column_id}
                        className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <p className="text-foreground font-medium">{actividad.Descripción}</p>
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-primary" />
                            {actividad.fecha_de_presentacion}
                          </span>
                          <span>
                            Prof. {actividad.Nombres} {actividad.Apellidos}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CalendarioPadre;
