import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { GraficoCircular } from "./GraficoCircular";
import { TablaRanking } from "./TablaRanking";
import { School, Users, TrendingUp, Award } from "lucide-react";

interface AnalisisInstitucionalProps {
  periodo: number | "anual";
}

export const AnalisisInstitucional = ({ periodo }: AnalisisInstitucionalProps) => {
  const {
    getPromedioInstitucional,
    getPromediosEstudiantes,
    getPromediosGrados,
    getPromediosSalones,
    getPromediosMaterias,
    getDistribucionDesempeno,
    getTopEstudiantes,
    getEvolucionPeriodos
  } = useEstadisticas();

  const promedioInstitucional = getPromedioInstitucional(periodo);
  const estudiantesTotales = getPromediosEstudiantes(periodo);
  const distribucion = getDistribucionDesempeno(periodo);
  const topEstudiantes = getTopEstudiantes(10, periodo);
  const topSalones = getPromediosSalones(periodo).sort((a, b) => b.promedio - a.promedio).slice(0, 5);
  const topGrados = getPromediosGrados(periodo).sort((a, b) => b.promedio - a.promedio).slice(0, 5);
  const mejoresMaterias = getPromediosMaterias(periodo).slice(0, 5);
  const peoresMaterias = [...getPromediosMaterias(periodo)].sort((a, b) => a.promedio - b.promedio).slice(0, 5);

  // Datos para gráficos
  const datosGrados = getPromediosGrados(periodo)
    .sort((a, b) => ordenGrados.indexOf(a.grado) - ordenGrados.indexOf(b.grado))
    .map(g => ({
      nombre: g.grado,
      valor: g.promedio
    }));

  const evolucionPeriodos = getEvolucionPeriodos("institucion");

  const estudiantesEnRiesgo = estudiantesTotales.filter(e => e.promedio < 3.0).length;

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio Institucional"
          valor={promedioInstitucional.toFixed(2)}
          subtitulo={periodo === "anual" ? "Acumulado anual" : `Período ${periodo}`}
          icono={School}
          color={promedioInstitucional >= 4 ? "success" : promedioInstitucional >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Total Estudiantes"
          valor={estudiantesTotales.length}
          subtitulo="Con calificaciones"
          icono={Users}
          color="primary"
        />
        <TarjetaResumen
          titulo="Mejor Promedio"
          valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"}
          subtitulo={topEstudiantes[0]?.nombre_completo || ""}
          icono={Award}
          color="success"
        />
        <TarjetaResumen
          titulo="En Riesgo Académico"
          valor={estudiantesEnRiesgo}
          subtitulo="Promedio menor a 3.0"
          icono={TrendingUp}
          color={estudiantesEnRiesgo > 0 ? "danger" : "success"}
        />
      </div>

      {/* Primera fila de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoBarras
          titulo="Promedio por Grado"
          datos={datosGrados}
          mostrarColoresPorRendimiento
        />
        <GraficoCircular
          titulo="Distribución por Niveles de Desempeño"
          distribucion={distribucion}
        />
      </div>

      {/* Evolución por período */}
      <GraficoLineas
        titulo="Evolución del Rendimiento Institucional por Período"
        datos={evolucionPeriodos}
        xAxisKey="periodo"
        lineas={[{ dataKey: "promedio", nombre: "Promedio", color: "#16a34a" }]}
      />

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TablaRanking
          titulo="Top 10 Mejores Estudiantes"
          datos={topEstudiantes}
          tipo="estudiante"
          limite={10}
        />
        <TablaRanking
          titulo="Top 5 Mejores Salones"
          datos={topSalones}
          tipo="salon"
          limite={5}
        />
        <TablaRanking
          titulo="Top 5 Mejores Grados"
          datos={topGrados}
          tipo="grado"
          limite={5}
        />
      </div>

      {/* Materias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoBarras
          titulo="Materias con Mejor Rendimiento"
          datos={mejoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))}
          horizontal
          mostrarColoresPorRendimiento
        />
        <GraficoBarras
          titulo="Materias con Menor Rendimiento"
          datos={peoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))}
          horizontal
          mostrarColoresPorRendimiento
        />
      </div>
    </div>
  );
};
