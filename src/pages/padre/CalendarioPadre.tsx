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
  const [hijo, setHijo] = useState<HijoData | null>(null);
  const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);

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

        if (!error && data) {
          setActividades(data);
          const maxId = Math.max(...data.map((a: ActividadCalendario) => a.column_id), 0);
          markLastSeen('actividades', hijoData.codigo, maxId);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [navigate]);

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
    ? actividadesPorFecha[fechaKey(diaSeleccionado)] || []
    : [];

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
            <span className="text-foreground font-medium">Actividades de {hijo?.nombre}</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            Actividades Asignadas
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {hijo?.nombre} {hijo?.apellidos} &mdash; {hijo?.grado} {hijo?.salon}
          </p>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={diaSeleccionado}
                  onSelect={setDiaSeleccionado}
                  month={mesActual}
                  onMonthChange={setMesActual}
                  locale={es}
                  modifiers={{ conActividad: diasConActividades }}
                  modifiersClassNames={{ conActividad: "relative" }}
                  components={{
                    DayContent: ({ date }) => {
                      const key = fechaKey(date);
                      const tiene = !!actividadesPorFecha[key];
                      const cantidad = actividadesPorFecha[key]?.length || 0;
                      return (
                        <div className="relative flex items-center justify-center w-full h-full">
                          <span>{date.getDate()}</span>
                          {tiene && (
                            <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                              {cantidad <= 3 ? (
                                Array.from({ length: cantidad }).map((_, i) => (
                                  <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                                ))
                              ) : (
                                <>
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    },
                  }}
                  className="rounded-md border shadow-sm"
                />
              </div>

              <div className="flex-1 min-w-0">
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
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full mb-2">
                                {actividad.Asignatura}
                              </span>
                              <p className="text-foreground font-medium">{actividad.Descripción}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Prof. {actividad.Nombres} {actividad.Apellidos}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : diaSeleccionado ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                    <p>No hay actividades para este d&iacute;a</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mb-2 opacity-50" />
                    <p>Selecciona un d&iacute;a para ver sus actividades</p>
                    {actividades.length === 0 && (
                      <p className="text-sm mt-1">No hay actividades asignadas a&uacute;n</p>
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
