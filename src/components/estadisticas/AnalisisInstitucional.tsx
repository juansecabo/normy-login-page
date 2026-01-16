import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { School, Users, Award, AlertTriangle } from "lucide-react";

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
    getEvolucionPeriodos,
    tieneDatosSuficientesParaRiesgo,
    getEstudiantesEnRiesgo
  } = useEstadisticas();

  const promedioInstitucional = getPromedioInstitucional(periodo);
  const estudiantesTotales = getPromediosEstudiantes(periodo);
  const distribucion = getDistribucionDesempeno(periodo);
  const topEstudiantes = getTopEstudiantes(10, periodo);
  const topSalones = getPromediosSalones(periodo).sort((a, b) => b.promedio - a.promedio).slice(0, 5);
  const topGrados = getPromediosGrados(periodo).sort((a, b) => b.promedio - a.promedio).slice(0, 5);
  const mejoresMaterias = getPromediosMaterias(periodo).slice(0, 5);
  const peoresMaterias = [...getPromediosMaterias(periodo)].sort((a, b) => a.promedio - b.promedio).slice(0, 5);
  const evolucionPeriodos = getEvolucionPeriodos("institucion");

  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo) : [];

  // Datos para listas
  const datosGrados = getPromediosGrados(periodo)
    .sort((a, b) => ordenGrados.indexOf(a.grado) - ordenGrados.indexOf(b.grado))
    .map(g => ({ nombre: g.grado, valor: g.promedio, extra: `${g.cantidadEstudiantes} estudiantes` }));

  if (estudiantesTotales.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay actividades con notas registradas</h3>
        <p className="text-muted-foreground">Las estadísticas estarán disponibles cuando se registren notas en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio Institucional"
          valor={promedioInstitucional.toFixed(2)}
          subtitulo={`Basado en ${estudiantesTotales.length} estudiantes`}
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
        {mostrarRiesgo ? (
          <TarjetaResumen
            titulo="En Riesgo Académico"
            valor={estudiantesEnRiesgo.length}
            subtitulo="Promedio menor a 3.0"
            icono={AlertTriangle}
            color={estudiantesEnRiesgo.length > 0 ? "danger" : "success"}
          />
        ) : (
          <TarjetaResumen
            titulo="En Riesgo Académico"
            valor="—"
            subtitulo="Se necesitan más datos"
            icono={AlertTriangle}
            color="primary"
          />
        )}
      </div>

      {/* Distribución y Evolución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaDistribucion titulo="Distribución por Niveles de Desempeño" distribucion={distribucion} />
        <TablaEvolucion titulo="Evolución del Rendimiento por Período" datos={evolucionPeriodos} />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TablaRanking titulo="Top 10 Mejores Estudiantes" datos={topEstudiantes} tipo="estudiante" limite={10} />
        <TablaRanking titulo="Top 5 Mejores Salones" datos={topSalones} tipo="salon" limite={5} />
        <TablaRanking titulo="Top 5 Mejores Grados" datos={topGrados} tipo="grado" limite={5} />
      </div>

      {/* Materias y Grados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListaComparativa
          titulo="Promedio por Grado"
          items={datosGrados}
          mostrarPosicion
        />
        <ListaComparativa
          titulo="Materias con Mejor Rendimiento"
          items={mejoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))}
          tipo="mejor"
          mostrarPosicion
        />
      </div>

      <ListaComparativa
        titulo="Materias con Menor Rendimiento (Áreas de Mejora)"
        items={peoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))}
        tipo="peor"
        mostrarPosicion
      />
    </div>
  );
};
