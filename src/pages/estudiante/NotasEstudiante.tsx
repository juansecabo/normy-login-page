import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isEstudiante } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ConsolidadoNotas from "@/components/ConsolidadoNotas";
import { supabase } from "@/integrations/supabase/client";
import { markLastSeen } from "@/utils/notificaciones";

const NotasEstudiante = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isEstudiante()) {
      navigate("/");
      return;
    }

    const marcarVisto = async () => {
      const { data } = await supabase
        .from('Notas')
        .select('column_id')
        .eq('codigo_estudiantil', session.codigo)
        .eq('grado', session.grado)
        .eq('salon', session.salon);
      if (data) {
        const maxId = Math.max(...data.map((n: any) => n.column_id), 0);
        await markLastSeen('notas', session.codigo!, maxId);
      }
    };
    marcarVisto();
  }, [navigate]);

  const session = getSession();
  if (!session.codigo || !isEstudiante()) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-estudiante" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-estudiante")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-foreground font-medium">Notas</span>
          </div>
        </div>

        <ConsolidadoNotas
          codigoEstudiante={session.codigo}
          nombreEstudiante={session.nombres || ''}
          apellidosEstudiante={session.apellidos || ''}
          grado={session.grado || ''}
          salon={session.salon || ''}
        />
      </main>
    </div>
  );
};

export default NotasEstudiante;
