import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, X, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Calendar } from "@/components/ui/calendar";
import { es } from "date-fns/locale";
import { markLastSeen, getAllLastSeen, countNewItems } from "@/utils/notificaciones";

interface ActividadCalendario {
  column_id: number;
  Nombres: string;
  Apellidos: string;
  Asignatura: string;
  Descripción: string;
  fecha_de_presentacion: string;
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
  const [hijo, setHijo] = useState<HijoData | null>(null);
  const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);
  const [badgesPorHijo, setBadgesPorHijo] = useState<Record<string, number>>({});

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    const hijosData = session.hijos || [];
    setHijos(hijosData);

    if (hijosData.length === 1) {
      seleccionar(hijosData[0]);
    } else {
      const fetchBadges = async () => {
        const b: Record<string, number> = {};
        for (const h of hijosData) {
          const lastSeen = await getAllLastSeen(h.codigo);
          const { data } = await supabase
            .from('Calendario Actividades')
            .select('column_id')
            .eq('Grado', h.grado)
            .eq('Salon', h.salon);
          if (data) {
            b[h.codigo] = countNewItems(data.map((a: any) => a.column_id), lastSeen['actividades']);
          }
        }
        setBadgesPorHijo(b);
      };
      fetchBadges();
    }
  }, [navigate]);

  const seleccionar = (h: HijoData) => {
    setHijo(h);
    localStorage.setItem("hijoSeleccionado", JSON.stringify(h));
    setActividades([]);
    setDiaSeleccionado(undefined);
    setLoading(true);

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('Calendario Actividades')
          .select('*')
          .eq('Grado', h.grado)
          .eq('Salon', h.salon)
          .order('fecha_de_presentacion', { ascending: true });

        if (!error && data) {
          setActividades(data);
          const maxId = Math.max(...data.map((a: ActividadCalendario) => a.column_id), 0);
          markLastSeen('actividades', h.codigo, maxId);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  };

  const cambiarEstudiante = () => {
    setHijo(null);
    setActividades([]);
    setDiaSeleccionado(undefined);
  };

  const actividadesPorFecha: Record<string, ActividadCalendario[]> = {};
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

  const actividadesDelDia = diaSeleccionado
    ? (actividadesPorFecha[fechaKey(diaSeleccionado)] || []).slice().sort((a, b) => a.Asignatura.localeCompare(b.Asignatura))
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button onClick={() => navigate("/dashboard-padre")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">&rarr;</span>
            {hijo && hijos.length > 1 ? (
              <>
                <button onClick={cambiarEstudiante} className="text-primary hover:underline">
                  Escoger Estudiante
                </button>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="text-foreground font-medium">Actividades de {hijo.nombre}</span>
              </>
            ) : (
              <span className="text-foreground font-medium">Actividades{hijo ? ` de ${hijo.nombre}` : ''}</span>
            )}
          </div>
        </div>

        {!hijo && hijos.length > 1 && (
          <div className="bg-card rounded-lg shadow-soft p-6 mb-6">
            <h3 className="text-lg font-bold text-foreground mb-4 text-center">
              Selecciona un estudiante
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hijos.map((h) => (
                <button
                  key={h.codigo}
                  onClick={() => seleccionar(h)}
                  className="relative flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 text-left"
                >
                  {(badgesPorHijo[h.codigo] || 0) > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm">
                      {badgesPorHijo[h.codigo]}
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{h.nombre} {h.apellidos}</p>
                    <p className="text-sm text-muted-foreground">{h.grado} - {h.salon}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {hijo && (
          <div className="bg-card rounded-lg shadow-soft p-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Actividades Asignadas
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {hijo.nombre} {hijo.apellidos} &mdash; {hijo.grado} {hijo.salon}
            </p>

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

                <div className="flex-1 min-w-0 lg:max-h-[420px] lg:overflow-y-auto">
                  {diaSeleccionado && actividadesDelDia.length > 0 ? (
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
                        {actividadesDelDia.length} actividad{actividadesDelDia.length > 1 ? 'es' : ''}
                      </p>
                      <div className="space-y-3">
                        {actividadesDelDia.map(actividad => (
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
                  ) : diaSeleccionado ? (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                      <p>No hay actividades para este día</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                      <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                      <p>Selecciona un día para ver sus actividades</p>
                      {actividades.length === 0 && (
                        <p className="text-sm mt-1">No hay actividades asignadas aún</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CalendarioPadre;
