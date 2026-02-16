import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import { BookOpen, ClipboardList, BarChart3, Megaphone, FileText } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";
import { supabase } from "@/integrations/supabase/client";
import { getAllLastSeen, countNewItems } from "@/utils/notificaciones";

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

    // Si solo tiene un hijo, auto-seleccionar en localStorage para las páginas internas
    if (session.hijos && session.hijos.length === 1) {
      localStorage.setItem("hijoSeleccionado", JSON.stringify(session.hijos[0]));
    }

    const fetchBadges = async () => {
      const codigo = session.codigo!;
      const hijosData = session.hijos || [];
      const b = { notas: 0, actividades: 0, comunicados: 0, documentos: 0 };

      try {
        const lastSeenPadre = await getAllLastSeen(codigo);

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
          b.comunicados = countNewItems(
            filtrados.filter((c: any) => c.tipo === 'comunicado').map((c: any) => c.id),
            lastSeenPadre['comunicados']
          );
          b.documentos = countNewItems(
            filtrados.filter((c: any) => c.tipo === 'documento').map((c: any) => c.id),
            lastSeenPadre['documentos']
          );
        }

        for (const hijo of hijosData) {
          const lastSeenHijo = await getAllLastSeen(hijo.codigo);

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
            b.actividades += countNewItems(actResult.data.map((a: any) => a.column_id), lastSeenHijo['actividades']);
          }
          if (notasResult.data) {
            b.notas += countNewItems(notasResult.data.map((n: any) => n.column_id), lastSeenHijo['notas']);
          }
        }
      } catch (err) {
        console.error('Error fetching badges:', err);
      }

      setBadges(b);
    };

    fetchBadges();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-8">
        <div className="bg-card rounded-lg shadow-soft p-5 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">
            Bienvenido(a)
          </h2>
          <p className="text-lg text-primary font-semibold">
            {nombres}
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-1">
            Padre de familia de
          </p>
          <div className="space-y-0.5">
            {hijos.map(h => (
              <p key={h.codigo} className="text-sm text-foreground">
                {h.nombre} {h.apellidos} <span className="text-muted-foreground">({h.grado} {h.salon})</span>
              </p>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
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
              <span className="font-semibold text-foreground text-center">Actividades</span>
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
