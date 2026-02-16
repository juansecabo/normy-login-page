import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ConsolidadoNotas from "@/components/ConsolidadoNotas";
import { supabase } from "@/integrations/supabase/client";
import { markLastSeen, getAllLastSeen, countNewItems } from "@/utils/notificaciones";
import { User } from "lucide-react";

const NotasPadre = () => {
  const navigate = useNavigate();
  const [hijos, setHijos] = useState<HijoData[]>([]);
  const [hijo, setHijo] = useState<HijoData | null>(null);
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
      const stored = localStorage.getItem("hijoSeleccionado");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const existe = hijosData.find(h => h.codigo === parsed.codigo);
          if (existe) seleccionar(existe);
        } catch {}
      }

      // Calcular badges por hijo
      const fetchBadges = async () => {
        const b: Record<string, number> = {};
        for (const h of hijosData) {
          const lastSeen = await getAllLastSeen(h.codigo);
          const { data } = await supabase
            .from('Notas')
            .select('column_id')
            .eq('codigo_estudiantil', h.codigo)
            .eq('grado', h.grado)
            .eq('salon', h.salon);
          if (data) {
            b[h.codigo] = countNewItems(data.map((n: any) => n.column_id), lastSeen['notas']);
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

    const marcarVisto = async () => {
      const { data } = await supabase
        .from('Notas')
        .select('column_id')
        .eq('codigo_estudiantil', h.codigo)
        .eq('grado', h.grado)
        .eq('salon', h.salon);
      if (data) {
        const maxId = Math.max(...data.map((n: any) => n.column_id), 0);
        await markLastSeen('notas', h.codigo, maxId);
      }
    };
    marcarVisto();
  };

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
            <span className="text-foreground font-medium">Notas{hijo ? ` de ${hijo.nombre}` : ''}</span>
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
          <>
            {hijos.length > 1 && (
              <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Estudiante: <span className="font-semibold text-foreground">{hijo.nombre} {hijo.apellidos}</span> — {hijo.grado} {hijo.salon}
                  </p>
                  <button
                    onClick={() => setHijo(null)}
                    className="text-sm text-primary hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}

            <ConsolidadoNotas
              codigoEstudiante={hijo.codigo}
              nombreEstudiante={hijo.nombre}
              apellidosEstudiante={hijo.apellidos}
              grado={hijo.grado}
              salon={hijo.salon}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default NotasPadre;
