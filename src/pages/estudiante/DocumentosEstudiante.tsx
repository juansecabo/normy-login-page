import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isEstudiante } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ListaComunicados from "@/components/ListaComunicados";
import { markAsSeen } from "@/utils/notificaciones";

interface Comunicado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
  archivo_url: string | null;
  perfil: string | null;
  nivel: string | null;
  grado: string | null;
  salon: string | null;
  codigo_estudiantil: string | null;
}

const DocumentosEstudiante = () => {
  const navigate = useNavigate();
  const [documentos, setDocumentos] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isEstudiante()) {
      navigate("/");
      return;
    }

    const cargar = async () => {
      try {
        const { data, error } = await supabase
          .from('Comunicados')
          .select('*')
          .eq('tipo', 'documento')
          .in('perfil', ['Estudiantes', 'Estudiantes y Padres de familia'])
          .order('fecha', { ascending: false });

        if (!error && data) {
          const filtrados = data.filter((c: Comunicado) => {
            if (c.codigo_estudiantil && c.codigo_estudiantil !== session.codigo) return false;
            if (c.nivel && c.nivel !== session.nivel) return false;
            if (c.grado && c.grado !== session.grado) return false;
            if (c.salon && c.salon !== session.salon) return false;
            return true;
          });
          setDocumentos(filtrados);
          markAsSeen('documentos', session.codigo!, filtrados.map((c: Comunicado) => c.id));
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
      <HeaderNormy backLink="/dashboard-estudiante" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-estudiante")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Documentos</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Documentos
          </h2>
          <ListaComunicados comunicados={documentos} loading={loading} showDocumentLink />
        </div>
      </main>
    </div>
  );
};

export default DocumentosEstudiante;
