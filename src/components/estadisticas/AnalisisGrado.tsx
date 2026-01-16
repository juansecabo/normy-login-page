import { useEstadisticas } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { GraficoCircular } from "./GraficoCircular";
import { TablaRanking } from "./TablaRanking";
import { GraduationCap, Users, TrendingUp, Award } from "lucide-react";

interface AnalisisGradoProps {
  grado: string;
  periodo: number | "anual";
}

export const AnalisisGrado = ({ grado, periodo }: AnalisisGradoProps) => {
  const {
    getPromediosEstudiantes,
    getPromediosSalones,
    getPromediosMaterias,
    getDistribucionDesempeno,
    getTopEstudiantes,
    getEvolucionPeriodos,
    getPromedioInstitucional
  } = useEstadisticas();

  if (!grado) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        Selecciona un grado para ver el análisis
      </div>
    );
  }

  const estudiantesGrado = getPromediosEstudiantes(periodo, grado);
  const promedioGrado = estudiantesGrado.length > 0
    ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100
    : 0;
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const distribucion = getDistribucionDesempeno(periodo, grado);
  const topEstudiantes = getTopEstudiantes(10, periodo, grado);
  const salones = getPromediosSalones(periodo, grado).sort((a, b) => b.promedio - a.promedio);
  const materias = getPromediosMaterias(periodo, grado);

  const evolucionPeriodos = getEvolucionPeriodos("grado", grado);
  const estudiantesEnRiesgo = estudiantesGrado.filter(e => e.promedio < 3.0).length;

  // Comparativa con institución
  const diferenciaConInst = promedioGrado - promedioInstitucional;

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo={`Promedio ${grado}`}
          valor={promedioGrado.toFixed(2)}
          subtitulo={`${diferenciaConInst >= 0 ? "+" : ""}${diferenciaConInst.toFixed(2)} vs institución`}
          icono={GraduationCap}
          color={promedioGrado >= 4 ? "success" : promedioGrado >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Estudiantes"
          valor={estudiantesGrado.length}
          subtitulo={`En ${salones.length} salones`}
          icono={Users}
          color="primary"
        />
        <TarjetaResumen
          titulo="Mejor Estudiante"
          valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"}
          subtitulo={topEstudiantes[0]?.nombre_completo.split(" ").slice(0, 2).join(" ") || ""}
          icono={Award}
          color="success"
        />
        <TarjetaResumen
          titulo="En Riesgo"
          valor={estudiantesEnRiesgo}
          subtitulo="Promedio menor a 3.0"
          icono={TrendingUp}
          color={estudiantesEnRiesgo > 0 ? "danger" : "success"}
        />
      </div>

      {/* Comparativa de salones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoBarras
          titulo={`Ranking de Salones - ${grado}`}
          datos={salones.map(s => ({ nombre: s.salon, valor: s.promedio }))}
          mostrarColoresPorRendimiento
        />
        <GraficoCircular
          titulo="Distribución por Desempeño"
          distribucion={distribucion}
        />
      </div>

      {/* Evolución y materias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoLineas
          titulo={`Evolución de ${grado} por Período`}
          datos={evolucionPeriodos}
          xAxisKey="periodo"
          lineas={[{ dataKey: "promedio", nombre: grado, color: "#16a34a" }]}
        />
        <GraficoBarras
          titulo={`Rendimiento por Materia - ${grado}`}
          datos={materias.map(m => ({ nombre: m.materia, valor: m.promedio }))}
          horizontal
          mostrarColoresPorRendimiento
          altura={Math.max(300, materias.length * 35)}
        />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TablaRanking
          titulo={`Top 10 Estudiantes - ${grado}`}
          datos={topEstudiantes}
          tipo="estudiante"
          limite={10}
        />
        <TablaRanking
          titulo={`Ranking Salones - ${grado}`}
          datos={salones}
          tipo="salon"
          limite={salones.length}
        />
      </div>
    </div>
  );
};
