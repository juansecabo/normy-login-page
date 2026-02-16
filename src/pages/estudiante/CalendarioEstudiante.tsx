import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isEstudiante } from "@/hooks/useSession";
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

const CalendarioEstudiante = () => {
  const navigate = useNavigate();
  const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesActual, setMesActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);
  const [marcas, setMarcas] = useState<Record<number, 'hecho' | 'estudiar'>>({});

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isEstudiante()) {
      navigate("/");
      return;
    }

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('Calendario Actividades')
          .select('*')
          .eq('Grado', session.grado)
          .eq('Salon', session.salon)
          .order('fecha_de_presentacion', { ascending: true });

        if (!error && data) {
          setActividades(data);
          const maxId = Math.max(...data.map((a: ActividadCalendario) => a.column_id), 0);
          markLastSeen('actividades', session.codigo!, maxId);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();

    // Cargar marcas desde Supabase
    const cargarMarcas = async () => {
      try {
        const { data } = await supabase
          .from('Actividades_Marcas')
          .select('actividad_id, marca')
          .eq('estudiante_codigo', session.codigo);
        if (data) {
          const m: Record<number, 'hecho' | 'estudiar'> = {};
          data.forEach((r: any) => { m[r.actividad_id] = r.marca; });
          setMarcas(m);
        }
      } catch {}
    };
    cargarMarcas();
  }, [navigate]);

  const toggleMarca = async (columnId: number, tipo: 'hecho' | 'estudiar') => {
    const session = getSession();
    const codigo = session.codigo!;
    const yaEsta = marcas[columnId] === tipo;

    // Actualizar UI inmediatamente
    setMarcas(prev => {
      const next = { ...prev };
      if (yaEsta) {
        delete next[columnId];
      } else {
        next[columnId] = tipo;
      }
      return next;
    });

    // Persistir en Supabase
    try {
      if (yaEsta) {
        await supabase
          .from('Actividades_Marcas')
          .delete()
          .eq('estudiante_codigo', codigo)
          .eq('actividad_id', columnId);
      } else {
        await supabase
          .from('Actividades_Marcas')
          .upsert(
            { estudiante_codigo: codigo, actividad_id: columnId, marca: tipo, updated_at: new Date().toISOString() },
            { onConflict: 'estudiante_codigo,actividad_id' }
          );
      }
    } catch {}
  };

  // Mapear actividades por fecha
  const actividadesPorFecha: Record<string, ActividadCalendario[]> = {};
  actividades.forEach(a => {
    const fecha = parsearFecha(a.fecha_de_presentacion);
    if (fecha) {
      const key = fechaKey(fecha);
      if (!actividadesPorFecha[key]) actividadesPorFecha[key] = [];
      actividadesPorFecha[key].push(a);
    }
  });

  // Fechas con actividades para marcar en el calendario
  const diasConActividades = Object.keys(actividadesPorFecha).map(key => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  // Actividades del día seleccionado (ordenadas por asignatura)
  const actividadesDelDia = diaSeleccionado
    ? (actividadesPorFecha[fechaKey(diaSeleccionado)] || []).slice().sort((a, b) => a.Asignatura.localeCompare(b.Asignatura))
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-estudiante" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-estudiante")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
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
              {/* Calendario */}
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

              {/* Detalle del día seleccionado */}
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
                      {actividadesDelDia.map(actividad => {
                        const marca = marcas[actividad.column_id];
                        return (
                          <div
                            key={actividad.column_id}
                            className={`border rounded-lg p-4 transition-colors ${marca === 'hecho' ? 'border-green-300 bg-green-50/50' : marca === 'estudiar' ? 'border-yellow-300 bg-yellow-50/50' : 'border-border hover:border-primary/50'}`}
                          >
                            <div>
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full mb-2">
                                {actividad.Asignatura}
                              </span>
                              <p className={`font-medium ${marca === 'hecho' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{actividad.Descripción}</p>
                              <p className="text-sm text-muted-foreground mt-1">
                                Prof. {actividad.Nombres} {actividad.Apellidos}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => toggleMarca(actividad.column_id, 'hecho')}
                                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${marca === 'hecho' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                >
                                  Hecho
                                </button>
                                <button
                                  onClick={() => toggleMarca(actividad.column_id, 'estudiar')}
                                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${marca === 'estudiar' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'}`}
                                >
                                  Estudiar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
      </main>
    </div>
  );
};

export default CalendarioEstudiante;
