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
          
          <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
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
          </div>
        </div>

        {/* Botones de acciones */}
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 lg:gap-4 mt-8 max-w-[560px] mx-auto">
          <button
            onClick={() => navigate("/enviar-comunicado")}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-purple-600 hover:to-purple-500 text-center"
          >
            <Megaphone className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
            <span>Enviar Comunicado</span>
          </button>
          <button
            onClick={() => navigate("/enviar-documento")}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-3 p-4 lg:p-6 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm lg:text-base transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:from-orange-600 hover:to-orange-500 text-center"
          >
            <FileUp className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
            <span>Enviar Documento</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default DashboardRector;
