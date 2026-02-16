import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isPadreDeFamilia, HijoData } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import ConsolidadoNotas from "@/components/ConsolidadoNotas";

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
        setHijo(JSON.parse(storedHijo));
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
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-padre")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
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
