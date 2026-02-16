import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, isEstudiante } from "@/hooks/useSession";
import { BookOpen, Calendar, BarChart3, Megaphone, FileText } from "lucide-react";
import HeaderNormy from "@/components/HeaderNormy";

const DashboardEstudiante = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");

  useEffect(() => {
    const session = getSession();

    if (!session.codigo) {
      navigate("/");
      return;
    }

    if (!isEstudiante()) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");
    setGrado(session.grado || "");
    setSalon(session.salon || "");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-estudiante" />

      <main className="flex-1 container mx-auto p-8">
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
            Bienvenido(a)
          </h2>
          <p className="text-xl text-primary font-semibold">
            {nombres} {apellidos}
          </p>
          <p className="text-muted-foreground mt-2">
            {grado} - {salon}
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-8 max-w-4xl mx-auto mt-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            ¿Qué deseas consultar?
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 max-w-4xl mx-auto">
            <button
              onClick={() => navigate("/estudiante/notas")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-emerald-100 transition-all duration-200 hover:shadow-md hover:bg-emerald-200"
            >
              <BookOpen className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground">Notas</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/calendario")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-green-100 transition-all duration-200 hover:shadow-md hover:bg-green-200"
            >
              <Calendar className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground">Calendario</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/estadisticas")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-teal-100 transition-all duration-200 hover:shadow-md hover:bg-teal-200"
            >
              <BarChart3 className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Estadísticas</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/comunicados")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-lime-100 transition-all duration-200 hover:shadow-md hover:bg-lime-200"
            >
              <Megaphone className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Comunicados</span>
            </button>

            <button
              onClick={() => navigate("/estudiante/documentos")}
              className="flex flex-col items-center justify-center gap-4 p-6 rounded-lg bg-cyan-100 transition-all duration-200 hover:shadow-md hover:bg-cyan-200"
            >
              <FileText className="w-12 h-12 text-foreground" />
              <span className="font-semibold text-foreground text-center">Documentos</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardEstudiante;
