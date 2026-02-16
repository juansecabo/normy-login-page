import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ConsolidadoNotas from "@/components/ConsolidadoNotas";
import { supabase } from "@/integrations/supabase/client";
import { markLastSeen } from "@/utils/notificaciones";

const NotasPadre = () => {
  const navigate = useNavigate();
  const [hijo, setHijo] = useState<HijoData | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isPadreDeFamilia()) {
      navigate("/");
      return;
    }

    const storedHijo = localStorage.getItem("hijoSeleccionado");
    if (storedHijo) {
      try {
        const hijoData: HijoData = JSON.parse(storedHijo);
        setHijo(hijoData);

        const marcarVisto = async () => {
          const { data } = await supabase
            .from('Notas')
            .select('column_id')
            .eq('codigo_estudiantil', hijoData.codigo)
            .eq('grado', hijoData.grado)
            .eq('salon', hijoData.salon);
          if (data) {
            const maxId = Math.max(...data.map((n: any) => n.column_id), 0);
            await markLastSeen('notas', hijoData.codigo, maxId);
          }
        };
        marcarVisto();
      } catch {
        navigate("/dashboard-padre");
      }
    } else {
      navigate("/dashboard-padre");
    }
  }, [navigate]);

  if (!hijo) return null;

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
            <span className="text-foreground font-medium">Notas de {hijo.nombre}</span>
          </div>
        </div>

        <ConsolidadoNotas
          codigoEstudiante={hijo.codigo}
          nombreEstudiante={hijo.nombre}
          apellidosEstudiante={hijo.apellidos}
          grado={hijo.grado}
          salon={hijo.salon}
        />
      </main>
    </div>
  );
};

export default NotasPadre;
