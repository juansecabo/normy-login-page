import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import { BookOpen, ClipboardList, BarChart3, Megaphone, FileText, User } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";
import { supabase } from "@/integrations/supabase/client";
import { getAllSeenForUser, countUnseenFromMap } from "@/utils/notificaciones";

const Badge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const DashboardPadre = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [hijos, setHijos] = useState<HijoData[]>([]);
  const [hijoSeleccionado, setHijoSeleccionado] = useState<HijoData | null>(null);
  const [badges, setBadges] = useState({ notas: 0, actividades: 0, comunicados: 0, documentos: 0 });

  useEffect(() => {
    const session = getSession();

    if (!session.codigo) {
      navigate("/");
      return;
    }

    if (!isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setHijos(session.hijos || []);

    // Restaurar hijo seleccionado de localStorage o seleccionar el primero
    const storedHijo = localStorage.getItem("hijoSeleccionado");
    if (storedHijo) {
      try {
        const parsed = JSON.parse(storedHijo);
        const existe = (session.hijos || []).find(h => h.codigo === parsed.codigo);
        if (existe) {
          setHijoSeleccionado(existe);
        } else if (session.hijos && session.hijos.length > 0) {
          setHijoSeleccionado(session.hijos[0]);
          localStorage.setItem("hijoSeleccionado", JSON.stringify(session.hijos[0]));
        }
      } catch {
        if (session.hijos && session.hijos.length > 0) {
          setHijoSeleccionado(session.hijos[0]);
          localStorage.setItem("hijoSeleccionado", JSON.stringify(session.hijos[0]));
        }
      }
    } else if (session.hijos && session.hijos.length > 0) {
      setHijoSeleccionado(session.hijos[0]);
      localStorage.setItem("hijoSeleccionado", JSON.stringify(session.hijos[0]));
    }

    // Fetch notification badges
    const fetchBadges = async () => {
      const codigo = session.codigo!;
      const hijosData = session.hijos || [];
      const b = { notas: 0, actividades: 0, comunicados: 0, documentos: 0 };

      try {
        // IDs vistos del padre (comunicados/documentos)
        const seenMapPadre = await getAllSeenForUser(codigo);

        // Comunicados y documentos (nivel padre)
        const { data: msgData } = await supabase
          .from('Comunicados')
          .select('id, tipo, perfil, nivel, grado, salon, codigo_estudiantil')
          .in('perfil', ['Padres de familia', 'Estudiantes y Padres de familia']);

        if (msgData) {
          const filtrados = msgData.filter((c: any) => {
            if (c.codigo_estudiantil) {
              return hijosData.some(h => h.codigo === c.codigo_estudiantil);
            }
            if (!c.nivel && !c.grado && !c.salon) return true;
            return hijosData.some(h => {
              if (c.nivel && c.nivel !== h.nivel) return false;
              if (c.grado && c.grado !== h.grado) return false;
              if (c.salon && c.salon !== h.salon) return false;
              return true;
            });
          });
          const comunicados = filtrados.filter((c: any) => c.tipo === 'comunicado');
          const documentos = filtrados.filter((c: any) => c.tipo === 'documento');
          b.comunicados = countUnseenFromMap(comunicados.map((c: any) => c.id), seenMapPadre['comunicados']);
          b.documentos = countUnseenFromMap(documentos.map((c: any) => c.id), seenMapPadre['documentos']);
        }

        // Actividades y notas (por cada hijo)
        for (const hijo of hijosData) {
          const seenMapHijo = await getAllSeenForUser(hijo.codigo);

          const [actResult, notasResult] = await Promise.all([
            supabase
              .from('Calendario Actividades')
              .select('column_id')
              .eq('Grado', hijo.grado)
              .eq('Salon', hijo.salon),
            supabase
              .from('Notas')
              .select('column_id')
              .eq('codigo_estudiantil', hijo.codigo)
              .eq('grado', hijo.grado)
              .eq('salon', hijo.salon),
          ]);

          if (actResult.data) {
            b.actividades += countUnseenFromMap(actResult.data.map((a: any) => a.column_id), seenMapHijo['actividades']);
          }
          if (notasResult.data) {
            b.notas += countUnseenFromMap(notasResult.data.map((n: any) => n.column_id), seenMapHijo['notas']);
          }
        }
      } catch (err) {
        console.error('Error fetching badges:', err);
      }

      setBadges(b);
    };

    fetchBadges();
  }, [navigate]);

  const seleccionarHijo = (hijo: HijoData) => {
    setHijoSeleccionado(hijo);
    localStorage.setItem("hijoSeleccionado", JSON.stringify(hijo));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-8">
        {/* Bienvenida */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Bienvenido(a)
          </h2>
          <p className="text-xl text-primary font-semibold">
            {nombres}
          </p>
          <p className="text-muted-foreground mt-2">
            Padre de familia
          </p>
        </div>

        {/* Selector de hijos */}
        {hijos.length > 1 && (
          <div className="bg-card rounded-lg shadow-soft p-6 max-w-4xl mx-auto mt-6">
            <h3 className="text-lg font-bold text-foreground mb-4 text-center">
              Selecciona un hijo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hijos.map((hijo) => {
                const isSelected = hijoSeleccionado?.codigo === hijo.codigo;
                return (
                  <button
                    key={hijo.codigo}
                    onClick={() => seleccionarHijo(hijo)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 text-left
                      ${isSelected
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {hijo.nombre} {hijo.apellidos}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {hijo.grado} - {hijo.salon}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Info del hijo seleccionado (si solo hay uno) */}
        {hijos.length === 1 && hijoSeleccionado && (
          <div className="bg-card rounded-lg shadow-soft p-4 max-w-2xl mx-auto mt-4 text-center">
            <p className="text-muted-foreground text-sm">
              Hijo: <span className="font-semibold text-foreground">{hijoSeleccionado.nombre} {hijoSeleccionado.apellidos}</span> — {hijoSeleccionado.grado} {hijoSeleccionado.salon}
            </p>
          </div>
        )}

        {/* Botones principales */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-6">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            ¿Qué deseas consultar?
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/padre/notas")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-emerald-100 transition-all duration-200 hover:shadow-md hover:bg-emerald-200"
            >
              <Badge count={badges.notas} />
              <BookOpen className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground">Notas</span>
            </button>

            <button
              onClick={() => navigate("/padre/actividades")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-green-100 transition-all duration-200 hover:shadow-md hover:bg-green-200"
            >
              <Badge count={badges.actividades} />
              <ClipboardList className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground">Actividades</span>
            </button>

            <button
              onClick={() => navigate("/padre/estadisticas")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-teal-100 transition-all duration-200 hover:shadow-md hover:bg-teal-200"
            >
              <BarChart3 className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Estadísticas</span>
            </button>

            <button
              onClick={() => navigate("/padre/comunicados")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-lime-100 transition-all duration-200 hover:shadow-md hover:bg-lime-200"
            >
              <Badge count={badges.comunicados} />
              <Megaphone className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Comunicados</span>
            </button>

            <button
              onClick={() => navigate("/padre/documentos")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-cyan-100 transition-all duration-200 hover:shadow-md hover:bg-cyan-200"
            >
              <Badge count={badges.documentos} />
              <FileText className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Documentos</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPadre;
