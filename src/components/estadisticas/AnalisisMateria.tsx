import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { GraficoHistograma } from "./GraficoHistograma";
import { TablaRanking } from "./TablaRanking";
import { BookOpen, Users, TrendingUp, Award, AlertTriangle } from "lucide-react";

interface AnalisisMateriaProps {
  materia: string;
  periodo: number | "anual";
  grado?: string;
  salon?: string;
}

export const AnalisisMateria = ({ materia, periodo, grado, salon }: AnalisisMateriaProps) => {
  const {
    getPromediosEstudiantes,
    getPromediosGrados,
    getPromediosSalones,
    getPromediosMaterias,
    notas
  } = useEstadisticas();

  if (!materia) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        Selecciona una materia para ver su análisis
      </div>
    );
  }

  // Promedio de la materia a nivel institucional
  const promedioMateria = getPromediosMaterias(periodo, grado, salon)
    .find(m => m.materia === materia);

  // Obtener notas de la materia para histograma
  let notasMateria = notas.filter(n => n.materia === materia && n.porcentaje && n.porcentaje > 0);
  if (grado) notasMateria = notasMateria.filter(n => n.grado === grado);
  if (salon) notasMateria = notasMateria.filter(n => n.salon === salon);
  if (periodo && periodo !== "anual") {
    notasMateria = notasMateria.filter(n => n.periodo === periodo);
  }

  const valoresNotas = notasMateria.map(n => n.nota);

  // Rendimiento por grado en esta materia
  const rendimientoPorGrado = ordenGrados
    .map(g => {
      const promediosGrado = getPromediosMaterias(periodo, g)
        .find(m => m.materia === materia);
      return {
        nombre: g,
        valor: promediosGrado?.promedio || 0
      };
    })
    .filter(g => g.valor > 0);

  // Mejores y peores grados
  const gradosOrdenados = [...rendimientoPorGrado].sort((a, b) => b.valor - a.valor);
  const mejoresGrados = gradosOrdenados.slice(0, 3);
  const peoresGrados = [...gradosOrdenados].reverse().slice(0, 3);

  // Rendimiento por salón (si hay un grado seleccionado)
  const rendimientoPorSalon = grado
    ? getPromediosSalones(periodo, grado)
        .map(s => {
          const promMat = getPromediosMaterias(periodo, grado, s.salon)
            .find(m => m.materia === materia);
          return {
            grado: s.grado,
            salon: s.salon,
            promedio: promMat?.promedio || 0,
            cantidadEstudiantes: s.cantidadEstudiantes
          };
        })
        .filter(s => s.promedio > 0)
        .sort((a, b) => b.promedio - a.promedio)
    : [];

  // Top estudiantes en esta materia
  const estudiantesConMateria = getPromediosEstudiantes(periodo, grado, salon)
    .map(e => ({
      ...e,
      promedioMateria: e.promediosPorMateria?.[materia] || 0
    }))
    .filter(e => e.promedioMateria > 0)
    .sort((a, b) => b.promedioMateria - a.promedioMateria);

  const topEstudiantes = estudiantesConMateria.slice(0, 10).map(e => ({
    ...e,
    promedio: e.promedioMateria
  }));

  // Evolución por período de la materia
  const evolucionMateria = [1, 2, 3, 4].map(p => {
    const prom = getPromediosMaterias(p, grado, salon)
      .find(m => m.materia === materia);
    return {
      periodo: `Período ${p}`,
      promedio: prom?.promedio || 0
    };
  }).filter(e => e.promedio > 0);

  // Estadísticas de la materia
  const cantidadEstudiantes = estudiantesConMateria.length;
  const estudiantesAprobados = estudiantesConMateria.filter(e => e.promedioMateria >= 3.0).length;
  const estudiantesReprobados = estudiantesConMateria.filter(e => e.promedioMateria < 3.0).length;
  const tasaAprobacion = cantidadEstudiantes > 0 
    ? Math.round((estudiantesAprobados / cantidadEstudiantes) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Encabezado de la materia */}
      <div className="bg-card rounded-lg shadow-soft p-6 border border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{materia}</h2>
            <p className="text-muted-foreground">
              {grado && salon 
                ? `${grado} - ${salon}`
                : grado 
                  ? `Grado: ${grado}` 
                  : "Análisis institucional"}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio de la Materia"
          valor={promedioMateria?.promedio.toFixed(2) || "—"}
          subtitulo={periodo === "anual" ? "Acumulado anual" : `Período ${periodo}`}
          icono={BookOpen}
          color={promedioMateria && promedioMateria.promedio >= 4 ? "success" : promedioMateria && promedioMateria.promedio >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Estudiantes"
          valor={cantidadEstudiantes}
          subtitulo="Con calificaciones"
          icono={Users}
          color="primary"
        />
        <TarjetaResumen
          titulo="Tasa de Aprobación"
          valor={`${tasaAprobacion}%`}
          subtitulo={`${estudiantesAprobados} aprobados`}
          icono={Award}
          color={tasaAprobacion >= 80 ? "success" : tasaAprobacion >= 60 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="En Riesgo"
          valor={estudiantesReprobados}
          subtitulo="Promedio < 3.0"
          icono={AlertTriangle}
          color={estudiantesReprobados > 0 ? "danger" : "success"}
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoHistograma
          titulo={`Distribución de Notas - ${materia}`}
          datos={valoresNotas}
        />
        <GraficoBarras
          titulo="Rendimiento por Grado"
          datos={rendimientoPorGrado}
          mostrarColoresPorRendimiento
        />
      </div>

      {/* Evolución por período */}
      {evolucionMateria.length > 0 && (
        <GraficoLineas
          titulo={`Evolución de ${materia} por Período`}
          datos={evolucionMateria}
          xAxisKey="periodo"
          lineas={[{ dataKey: "promedio", nombre: materia, color: "#16a34a" }]}
        />
      )}

      {/* Rankings y comparativas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TablaRanking
          titulo={`Top 10 Estudiantes - ${materia}`}
          datos={topEstudiantes}
          tipo="estudiante"
          limite={10}
        />

        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-green-500" />
            Mejores Grados
          </h4>
          <div className="space-y-2">
            {mejoresGrados.map((g, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-foreground">{g.nombre}</span>
                <span className="text-sm font-bold text-green-600">{g.valor.toFixed(2)}</span>
              </div>
            ))}
            {mejoresGrados.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay datos</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Grados a Reforzar
          </h4>
          <div className="space-y-2">
            {peoresGrados.map((g, idx) => (
              <div 
                key={idx} 
                className={`flex justify-between items-center p-2 rounded-lg ${
                  g.valor < 3 ? 'bg-red-50' : 'bg-amber-50'
                }`}
              >
                <span className="text-sm font-medium text-foreground">{g.nombre}</span>
                <span className={`text-sm font-bold ${g.valor < 3 ? 'text-red-600' : 'text-amber-600'}`}>
                  {g.valor.toFixed(2)}
                </span>
              </div>
            ))}
            {peoresGrados.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Ranking de salones (si hay grado seleccionado) */}
      {grado && rendimientoPorSalon.length > 0 && (
        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4">
            Ranking de Salones - {grado} - {materia}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {rendimientoPorSalon.map((s, idx) => (
              <div 
                key={idx} 
                className={`flex justify-between items-center p-3 rounded-lg ${
                  s.promedio >= 4 ? 'bg-green-50' : s.promedio >= 3 ? 'bg-amber-50' : 'bg-red-50'
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-foreground">{s.salon}</span>
                  <p className="text-xs text-muted-foreground">{s.cantidadEstudiantes} estudiantes</p>
                </div>
                <span className={`text-sm font-bold ${
                  s.promedio >= 4 ? 'text-green-600' : s.promedio >= 3 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {s.promedio.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
