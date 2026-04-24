import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isProfesor } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ListaComunicados from "@/components/ListaComunicados";
import { markLastSeen } from "@/utils/notificaciones";

interface Comunicado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
  archivo_url: string | null;
  perfil: string[] | null;
  nivel: string | null;
  grado: string | null;
  salon: string | null;
  codigo_estudiantil: string | null;
  id_destinatarios: string[] | null;
}

const NIVELES_GRADOS: Record<string, string[]> = {
  Preescolar: ["Prejardín", "Jardín", "Transición"],
  Primaria: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  Secundaria: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  Media: ["Décimo", "Undécimo"],
};

const ComunicadosProfesor = () => {
  const navigate = useNavigate();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isProfesor()) {
      navigate("/");
      return;
    }

    const cargar = async () => {
      try {
        // Traer las asignaciones del profesor para poder filtrar por aula
        const { data: asignaciones } = await supabase
          .from('Asignación Profesores')
          .select('"Grado(s)", "Salon(es)"')
          .eq('codigo', parseInt(session.codigo!));

        const allGrados = new Set<string>();
        const allSalones = new Set<string>();
        for (const row of asignaciones || []) {
          for (const g of (row["Grado(s)"] as string[] | null) || []) allGrados.add(g);
          for (const s of (row["Salon(es)"] as string[] | null) || []) allSalones.add(s);
        }

        const { data, error } = await supabase
          .from('Comunicados')
          .select('*')
          .overlaps('perfil', ['Profesores'])
          .order('fecha', { ascending: false });

        if (!error && data) {
          const filtrados = data.filter((c: Comunicado) => {
            if (c.id_destinatarios && c.id_destinatarios.length > 0) {
              return c.id_destinatarios.includes(String(session.codigo));
            }
            if (c.codigo_estudiantil && c.codigo_estudiantil !== session.codigo) return false;
            // Si la fila tiene filtros de aula/nivel, el profesor solo la ve si
            // tiene alguna asignación que cubra esa aula/nivel
            if (c.grado || c.salon || c.nivel) {
              if (c.grado && !allGrados.has(c.grado)) return false;
              if (c.salon && !allSalones.has(c.salon)) return false;
              if (c.nivel) {
                const gradosDelNivel = NIVELES_GRADOS[c.nivel] || [];
                if (!gradosDelNivel.some(g => allGrados.has(g))) return false;
              }
            }
            return true;
          });
          setComunicados(filtrados);
          const maxId = filtrados.length > 0 ? Math.max(...filtrados.map((c: Comunicado) => c.id)) : 0;
          if (maxId > 0) markLastSeen('comunicados', session.codigo!, maxId);
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
      <HeaderNormy backLink="/dashboard" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-foreground font-medium">Comunicados Recibidos</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Comunicados Recibidos
          </h2>
          <ListaComunicados comunicados={comunicados} loading={loading} showDocumentLink />
        </div>
      </main>
    </div>
  );
};

export default ComunicadosProfesor;
