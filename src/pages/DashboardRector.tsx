import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isRectorOrCoordinador } from "@/hooks/useSession";
import { BookOpen, BarChart3, Megaphone, FileUp } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";

const DashboardRector = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [cargo, setCargo] = useState("");

  useEffect(() => {
    const session = getSession();
    
    if (!session.codigo) {
      navigate("/");
      return;
    }

    // Verificar que es Rector o Coordinador
    if (!isRectorOrCoordinador()) {
      navigate("/dashboard");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");
    setCargo(session.cargo || "");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-rector" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-8">
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Bienvenido(a)
          </h2>
          <p className="text-xl text-primary font-semibold">
            {nombres} {apellidos}
          </p>
          <p className="text-muted-foreground mt-2">
            {cargo}
          </p>
        </div>

        {/* Botones principales */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            ¿Qué deseas consultar?
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/rector/seleccionar-grado")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <BookOpen className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Notas</span>
            </button>

            <button
              onClick={() => navigate("/rector/estadisticas")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <BarChart3 className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Estadísticas</span>
            </button>

            <button
              onClick={() => navigate("/enviar-comunicado")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <Megaphone className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Comunicado</span>
            </button>

            <button
              onClick={() => navigate("/enviar-documento")}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-border bg-background transition-all duration-200 hover:shadow-md hover:border-primary hover:bg-primary/10"
            >
              <FileUp className="w-16 h-16 text-primary" />
              <span className="font-semibold text-lg text-foreground">Documento</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardRector;
