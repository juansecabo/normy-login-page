import { useNavigate } from "react-router-dom";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import { useCompletitud } from "@/hooks/useCompletitud";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { IndicadorCompletitud } from "./IndicadorCompletitud";
import { Home, Users, TrendingUp, AlertTriangle, Award } from "lucide-react";

interface AnalisisSalonProps { 
  grado: string; 
  salon: string; 
  periodo: number | "anual";
  titulo?: string;
}

export const AnalisisSalon = ({ grado, salon, periodo, titulo }: AnalisisSalonProps) => {
  const navigate = useNavigate();
  const { 
    getPromediosEstudiantes, getPromediosSalones, getPromediosMaterias, 
    getDistribucionDesempeno, getTopEstudiantes, getEvolucionPeriodos, 
    getPromedioInstitucional, tieneDatosSuficientesParaRiesgo, getEstudiantesEnRiesgo 
  } = useEstadisticas();

  const { verificarCompletitud } = useCompletitud();

  if (!grado || !salon) {
    return <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">Selecciona un grado y un salón para ver el análisis</div>;
  }

  const estudiantesSalon = getPromediosEstudiantes(periodo, grado, salon);
  const promedioSalon = estudiantesSalon.length > 0 ? Math.round((estudiantesSalon.reduce((a, e) => a + e.promedio, 0) / estudiantesSalon.length) * 100) / 100 : 0;
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const salonesGrado = getPromediosSalones(periodo, grado).sort((a, b) => b.promedio - a.promedio);
  const posicionEnGrado = salonesGrado.findIndex(s => s.salon === salon) + 1;
  const distribucion = getDistribucionDesempeno(periodo, grado, salon);
  const topEstudiantes = getTopEstudiantes(5, periodo, grado, salon);
  const materias = getPromediosMaterias(periodo, grado, salon);
  
  // Verificar completitud con el nuevo hook
  const { completo, detalles, resumen, resumenCompleto } = verificarCompletitud("salon", periodo, grado, salon);
  
  // Filtrar evolución hasta el período seleccionado
  const periodoHasta = periodo === "anual" ? 4 : periodo;
  const evolucionPeriodos = getEvolucionPeriodos("salon", grado, salon).filter(e => {
    const numPeriodo = parseInt(e.periodo.replace("Período ", ""));
    return numPeriodo <= periodoHasta;
  });
  
  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo, grado, salon);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo, grado, salon) : [];
  const estudiantesGrado = getPromediosEstudiantes(periodo, grado);
  const promedioGrado = estudiantesGrado.length > 0 ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100 : 0;
  const diferenciaConGrado = promedioSalon - promedioGrado;
  const diferenciaConInst = promedioSalon - promedioInstitucional;
  // Formatear el período para mostrar

  // Formatear el período para mostrar
  const periodoTexto = periodo === "anual" ? "Acumulado Anual" : `Período ${periodo}`;

  const handleVerRiesgo = () => {
    const params = new URLSearchParams();
    params.set("nivel", "salon");
    params.set("periodo", String(periodo));
    params.set("grado", grado);
    params.set("salon", salon);
    navigate(`/rector/estudiantes-riesgo?${params.toString()}`);
  };

  if (estudiantesSalon.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay actividades con notas registradas para {grado} {salon}</h3>
        <p className="text-muted-foreground">Las estadísticas estarán disponibles cuando se registren notas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner informativo con indicador de completitud */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <span className="font-medium">ℹ️</span>
          <span>Estadísticas basadas únicamente en estudiantes con notas registradas.</span>
        </div>
        <IndicadorCompletitud 
          completo={completo} 
          detalles={detalles} 
          resumen={resumen}
          resumenCompleto={resumenCompleto}
          nivel={`${grado} ${salon}`} 
          periodo={periodoTexto}
        />
      </div>

      <div className="space-y-6">
        {/* Título dinámico */}
        {titulo && (
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
            {titulo}
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TarjetaResumen titulo={`Promedio ${grado} ${salon}`} valor={promedioSalon.toFixed(2)} subtitulo={`#${posicionEnGrado} de ${salonesGrado.length} en ${grado}`} icono={Home} color={promedioSalon >= 4.5 ? "success" : promedioSalon >= 4 ? "blue" : promedioSalon >= 3 ? "warning" : "danger"} />
          <TarjetaResumen titulo="Estudiantes con notas" valor={estudiantesSalon.length} subtitulo="En este salón" icono={Users} color="primary" />
          <TarjetaResumen titulo="Mejor Estudiante" valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"} subtitulo={topEstudiantes[0]?.nombre_completo || ""} icono={Award} color={topEstudiantes[0]?.promedio >= 4.5 ? "success" : topEstudiantes[0]?.promedio >= 4 ? "blue" : topEstudiantes[0]?.promedio >= 3 ? "warning" : "danger"} />
        <TarjetaResumen 
          titulo="En Riesgo Académico" 
          valor={mostrarRiesgo ? estudiantesEnRiesgo.length : "—"} 
          subtitulo={mostrarRiesgo ? (estudiantesEnRiesgo.length > 0 ? "Click para ver detalles" : "Promedio menor a 3.0") : "Se necesitan más datos"} 
          icono={AlertTriangle} 
          color={estudiantesEnRiesgo.length > 0 ? "danger" : "success"} 
          onClick={mostrarRiesgo && estudiantesEnRiesgo.length > 0 ? handleVerRiesgo : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaDistribucion titulo={`Distribución por Desempeño - ${grado} ${salon}`} distribucion={distribucion} />
        <TablaEvolucion titulo={`Evolución de ${grado} ${salon} por Período`} datos={evolucionPeriodos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TablaRanking titulo={`Top 5 Estudiantes - ${grado} ${salon}`} datos={topEstudiantes} tipo="estudiante" limite={5} />
        <ListaComparativa titulo={`Rendimiento por Materia - ${grado} ${salon}`} items={materias.map(m => ({ nombre: m.materia, valor: m.promedio }))} mostrarPosicion />
      </div>

      {/* Comparativa con promedios de referencia */}
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-4">Comparativa con Promedios de Referencia</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-muted-foreground font-medium">Referencia</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Promedio</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 font-medium text-foreground">{grado} {salon}</td>
                <td className="py-2 px-3 text-center font-bold text-foreground">{promedioSalon.toFixed(2)}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">—</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 text-foreground">Promedio {grado}</td>
                <td className="py-2 px-3 text-center text-foreground">{promedioGrado.toFixed(2)}</td>
                <td className={`py-2 px-3 text-center font-medium ${diferenciaConGrado >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {diferenciaConGrado >= 0 ? "+" : ""}{diferenciaConGrado.toFixed(2)}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-foreground">Promedio Institucional</td>
                <td className="py-2 px-3 text-center text-foreground">{promedioInstitucional.toFixed(2)}</td>
                <td className={`py-2 px-3 text-center font-medium ${diferenciaConInst >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {diferenciaConInst >= 0 ? "+" : ""}{diferenciaConInst.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
};
