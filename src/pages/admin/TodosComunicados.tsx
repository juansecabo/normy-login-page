import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isAdmin } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ListaComunicados from "@/components/ListaComunicados";

interface Comunicado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
  archivo_url: string | null;
}

const TodosComunicados = () => {
  const navigate = useNavigate();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isAdmin()) {
      navigate("/");
      return;
    }

    const cargar = async () => {
      const { data, error } = await supabase
        .from("Comunicados")
        .select("id, remitente, destinatarios, mensaje, fecha, archivo_url")
        .order("fecha", { ascending: false });
      if (!error && data) setComunicados(data as Comunicado[]);
      setLoading(false);
    };
    cargar();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-admin" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-admin")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Todos los Comunicados</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            Todos los Comunicados
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Historial completo de comunicados enviados por toda la comunidad educativa.
          </p>
          <ListaComunicados comunicados={comunicados} loading={loading} showDocumentLink />
        </div>
      </main>
    </div>
  );
};

export default TodosComunicados;
