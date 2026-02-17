import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { markLastSeen } from "@/utils/notificaciones";

interface ActividadCalendario {
  column_id: string;
  auto_id: number;
  Nombres: string;
  Apellidos: string;
  Asignatura: string;
  Descripción: string;
  fecha_de_presentacion: string;
}

interface ActividadConHijo extends ActividadCalendario {
  hijo: HijoData;
}

const parsearFecha = (fechaStr: string): Date | null => {
  const match = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
};

const fechaKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const CalendarioPadre = () => {
  const navigate = useNavigate();
  const [hijos, setHijos] = useState<HijoData[]>([]);
  const [actividades, setActividades] = useState<ActividadConHijo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    const hijosData = session.hijos || [];
    setHijos(hijosData);

    const cargar = async () => {
      try {
        const todasActividades: ActividadConHijo[] = [];

        for (const hijo of hijosData) {
          const { data, error } = await supabase
            .from('Calendario Actividades')
            .select('*')
            .eq('Grado', hijo.grado)
            .eq('Salon', hijo.salon)
            .order('fecha_de_presentacion', { ascending: true });

          if (!error && data) {
            data.forEach((a: ActividadCalendario) => {
              todasActividades.push({ ...a, hijo });
            });
            const ids = data.map((a: any) => Number(a.auto_id)).filter((id: number) => !isNaN(id) && id > 0);
            const maxId = ids.length > 0 ? Math.max(...ids) : 0;
            markLastSeen('actividades', hijo.codigo, maxId);
          }
        }

        setActividades(todasActividades);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [navigate]);

  // Mapear actividades por fecha
  const actividadesPorFecha: Record<string, ActividadConHijo[]> = {};
  actividades.forEach(a => {
    const fecha = parsearFecha(a.fecha_de_presentacion);
    if (fecha) {
      const key = fechaKey(fecha);
      if (!actividadesPorFecha[key]) actividadesPorFecha[key] = [];
      actividadesPorFecha[key].push(a);
    }
  });

  const diasConActividades = Object.keys(actividadesPorFecha).map(key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  // Actividades del día agrupadas por hijo
  const actividadesDelDia = diaSeleccionado
    ? actividadesPorFecha[fechaKey(diaSeleccionado)] || []
    : [];

  // Agrupar por hijo, manteniendo el orden de hijos
  const actividadesPorHijo: { hijo: HijoData; actividades: ActividadConHijo[] }[] = [];
  if (actividadesDelDia.length > 0) {
    for (const hijo of hijos) {
      const delHijo = actividadesDelDia
        .filter(a => a.hijo.codigo === hijo.codigo)
        .sort((a, b) => a.Asignatura.localeCompare(b.Asignatura));
      if (delHijo.length > 0) {
        actividadesPorHijo.push({ hijo, actividades: delHijo });
      }
    }
  }

  const totalActividades = actividadesDelDia.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-padre")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-foreground font-medium">Actividades</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
            <ClipboardList className="h-5 w-5 text-primary" />
            Actividades Asignadas
          </h2>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="flex flex-col lg:flex-row lg:items-start gap-6">
              <div className="flex justify-center lg:sticky lg:top-4 shrink-0">
                <Calendar
                  mode="single"
                  selected={diaSeleccionado}
                  onSelect={setDiaSeleccionado}
                  month={mesActual}
                  onMonthChange={setMesActual}
                  locale={es}
                  modifiers={{ conActividad: diasConActividades }}
                  modifiersClassNames={{ conActividad: "bg-orange-400 text-white hover:bg-orange-500 !h-8 !w-8" }}
                  className="rounded-md border shadow-sm"
                />
              </div>

              <div className="flex-1 min-w-0 lg:max-h-[500px] lg:overflow-y-auto">
                {diaSeleccionado && actividadesPorHijo.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        {diaSeleccionado.toLocaleDateString("es-CO", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => setDiaSeleccionado(undefined)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {totalActividades} actividad{totalActividades > 1 ? 'es' : ''}
                    </p>

                    <div className="space-y-6">
                      {actividadesPorHijo.map(({ hijo, actividades: acts }) => (
                        <div key={hijo.codigo}>
                          <h4 className="text-lg font-bold text-primary mb-2">
                            Actividades de {hijo.nombre} {hijo.apellidos}
                            <span className="text-muted-foreground font-normal text-sm"> — {hijo.grado} {hijo.salon}</span>
                          </h4>
                          <div className="space-y-3">
                            {acts.map(actividad => (
                              <div
                                key={actividad.column_id}
                                className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                              >
                                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full mb-2">
                                  {actividad.Asignatura}
                                </span>
                                <p className="text-foreground font-medium">{actividad.Descripción}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Prof. {actividad.Nombres} {actividad.Apellidos}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : diaSeleccionado ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                    <p>No hay actividades para este día</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                    <p>Selecciona un día para ver las actividades</p>
                    {actividades.length === 0 && (
                      <p className="text-sm mt-1">No hay actividades asignadas aún</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CalendarioPadre;
