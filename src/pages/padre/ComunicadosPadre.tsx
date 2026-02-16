import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isPadreDeFamilia } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ListaComunicados from "@/components/ListaComunicados";
import { markAsSeen } from "@/utils/notificaciones";

interface Comunicado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
  perfil: string | null;
  nivel: string | null;
  grado: string | null;
  salon: string | null;
  codigo_estudiantil: string | null;
}

const ComunicadosPadre = () => {
  const navigate = useNavigate();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    const hijos = session.hijos || [];

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('Comunicados')
          .select('*')
          .eq('tipo', 'comunicado')
          .in('perfil', ['Padres de familia', 'Estudiantes y Padres de familia'])
          .order('fecha', { ascending: false });

        if (!error && data) {
          // Filtrar client-side: el comunicado debe coincidir con al menos un hijo
          const filtrados = data.filter((c: Comunicado) => {
            // Si tiene codigo_estudiantil específico, debe coincidir con algún hijo
            if (c.codigo_estudiantil) {
              return hijos.some(h => h.codigo === c.codigo_estudiantil);
            }
            // Si no tiene filtros específicos (es general), incluir
            if (!c.nivel && !c.grado && !c.salon) return true;
            // Si tiene filtros, al menos un hijo debe coincidir
            return hijos.some(h => {
              if (c.nivel && c.nivel !== h.nivel) return false;
              if (c.grado && c.grado !== h.grado) return false;
              if (c.salon && c.salon !== h.salon) return false;
              return true;
            });
          });
          setComunicados(filtrados);
          markAsSeen('comunicados', session.codigo!, filtrados.map((c: Comunicado) => c.id));
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-padre" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-padre")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Comunicados</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Comunicados
          </h2>
          <ListaComunicados comunicados={comunicados} loading={loading} />
        </div>
      </main>
    </div>
  );
};

export default ComunicadosPadre;
