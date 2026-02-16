import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isEstudiante } from "@/hooks/useSession";
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

const DashboardEstudiante = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");
  const [badges, setBadges] = useState({ notas: 0, actividades: 0, comunicados: 0, documentos: 0 });

  useEffect(() => {
    const session = getSession();

    if (!session.codigo) {
      navigate("/");
      return;
    }

    if (!isEstudiante()) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");
    setGrado(session.grado || "");
    setSalon(session.salon || "");

    const fetchBadges = async () => {
      const codigo = session.codigo!;
      const b = { notas: 0, actividades: 0, comunicados: 0, documentos: 0 };

      try {
        const lastSeen = await getAllLastSeen(codigo);

        const [msgResult, actResult, notasResult] = await Promise.all([
          supabase
            .from('Comunicados')
            .select('id, tipo, perfil, nivel, grado, salon, codigo_estudiantil')
            .in('perfil', ['Estudiantes', 'Estudiantes y Padres de familia']),
          supabase
            .from('Calendario Actividades')
            .select('column_id')
            .eq('Grado', session.grado)
            .eq('Salon', session.salon),
          supabase
            .from('Notas')
            .select('column_id')
            .eq('codigo_estudiantil', codigo)
            .eq('grado', session.grado)
            .eq('salon', session.salon),
        ]);

        if (msgResult.data) {
          const misFiltrados = msgResult.data.filter((c: any) => {
            if (c.codigo_estudiantil && c.codigo_estudiantil !== codigo) return false;
            if (c.nivel && c.nivel !== session.nivel) return false;
            if (c.grado && c.grado !== session.grado) return false;
            if (c.salon && c.salon !== session.salon) return false;
            return true;
          });
          b.comunicados = countNewItems(
            misFiltrados.filter((c: any) => c.tipo === 'comunicado').map((c: any) => c.id),
            lastSeen['comunicados']
          );
          b.documentos = countNewItems(
            misFiltrados.filter((c: any) => c.tipo === 'documento').map((c: any) => c.id),
            lastSeen['documentos']
          );
        }

        if (actResult.data) {
          b.actividades = countNewItems(actResult.data.map((a: any) => a.column_id), lastSeen['actividades']);
        }

        if (notasResult.data) {
          b.notas = countNewItems(notasResult.data.map((n: any) => n.column_id), lastSeen['notas']);
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
      <HeaderNormy backLink="/dashboard-estudiante" />

      <main className="flex-1 container mx-auto p-8">
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Bienvenido(a)
          </h2>
          <p className="text-xl text-primary font-semibold">
            {nombres} {apellidos}
          </p>
          <p className="text-muted-foreground mt-2">
            {grado} - {salon}
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            ¿Qué deseas consultar?
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/estudiante/notas")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-emerald-100 transition-all duration-200 hover:shadow-md hover:bg-emerald-200"
            >
              <Badge count={badges.notas} />
              <BookOpen className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground">Notas</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/actividades")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-green-100 transition-all duration-200 hover:shadow-md hover:bg-green-200"
            >
              <Badge count={badges.actividades} />
              <ClipboardList className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Actividades</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/estadisticas")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-teal-100 transition-all duration-200 hover:shadow-md hover:bg-teal-200"
            >
              <BarChart3 className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Estadísticas</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/comunicados")}
              className="relative flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-lime-100 transition-all duration-200 hover:shadow-md hover:bg-lime-200"
            >
              <Badge count={badges.comunicados} />
              <Megaphone className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Comunicados</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/documentos")}
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

export default DashboardEstudiante;
