import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEstadisticas } from "@/hooks/useEstadisticas";
import { useCompletitud } from "@/hooks/useCompletitud";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { IndicadorCompletitud } from "./IndicadorCompletitud";
import BotonDescarga from "./BotonDescarga";
import { GraduationCap, Users, Award, AlertTriangle } from "lucide-react";

interface AnalisisGradoProps {
  grado: string;
  periodo: number | "anual";
  titulo?: string;
}

export const AnalisisGrado = ({ grado, periodo, titulo }: AnalisisGradoProps) => {
  const contenidoRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    getPromediosEstudiantes, getPromediosSalones, getPromediosMaterias,
    getDistribucionDesempeno, getTopEstudiantes, getEvolucionPeriodos,
    getPromedioInstitucional, tieneDatosSuficientesParaRiesgo, getEstudiantesEnRiesgo
  } = useEstadisticas();

  const { verificarCompletitud } = useCompletitud();

  if (!grado) {
    return <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">Selecciona un grado para ver el análisis</div>;
  }

  const estudiantesGrado = getPromediosEstudiantes(periodo, grado);
  const promedioGrado = estudiantesGrado.length > 0 ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100 : 0;
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const distribucion = getDistribucionDesempeno(periodo, grado);
  const topEstudiantes = getTopEstudiantes(10, periodo, grado);
  const peoresEstudiantes = [...getPromediosEstudiantes(periodo, grado)].sort((a, b) => a.promedio - b.promedio || a.nombre_completo.localeCompare(b.nombre_completo)).slice(0, 10);
  const salones = getPromediosSalones(periodo, grado).sort((a, b) => b.promedio - a.promedio);
  const materias = getPromediosMaterias(periodo, grado);
  
  // Verificar completitud con el nuevo hook
  const { completo, detalles, resumen, resumenCompleto } = verificarCompletitud("grado", periodo, grado);
  
  // Filtrar evolución hasta el período seleccionado
  const periodoHasta = periodo === "anual" ? 4 : periodo;
  const evolucionPeriodos = getEvolucionPeriodos("grado", grado).filter(e => {
    const numPeriodo = parseInt(e.periodo.replace("Período ", ""));
    return numPeriodo <= periodoHasta;
  });
  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo, grado);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo, grado) : [];
  const diferenciaConInst = promedioGrado - promedioInstitucional;

  // Obtener total de salones únicos con datos
  const salonesUnicos = [...new Set(estudiantesGrado.map(e => e.salon))];

  // Formatear el período para mostrar
  const periodoTexto = periodo === "anual" ? "Acumulado Anual" : `Período ${periodo}`;

  const handleVerRiesgo = () => {
    const params = new URLSearchParams();
    params.set("nivel", "grado");
    params.set("periodo", String(periodo));
    params.set("grado", grado);
    navigate(`/rector/estudiantes-riesgo?${params.toString()}`);
  };

  if (estudiantesGrado.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay actividades con notas registradas para {grado}</h3>
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
        <div className="flex items-center gap-2">
          <IndicadorCompletitud 
            completo={completo} 
            detalles={detalles} 
            resumen={resumen}
            resumenCompleto={resumenCompleto}
            nivel={grado} 
            periodo={periodoTexto}
          />
          <BotonDescarga contenidoRef={contenidoRef} nombreArchivo={titulo || `${grado} - ${periodoTexto}`} />
        </div>
      </div>

      <div ref={contenidoRef} className="space-y-6">
        {/* Título dinámico */}
        {titulo && (
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
            {titulo}
          </h2>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen titulo={`Promedio ${grado}`} valor={promedioGrado.toFixed(2)} subtitulo={`${diferenciaConInst >= 0 ? "+" : ""}${diferenciaConInst.toFixed(2)} vs institución`} icono={GraduationCap} color={promedioGrado >= 4.5 ? "success" : promedioGrado >= 4 ? "blue" : promedioGrado >= 3 ? "warning" : "danger"} />
        <TarjetaResumen titulo="Estudiantes con notas" valor={estudiantesGrado.length} subtitulo={`En ${salonesUnicos.length} salones`} icono={Users} color="primary" />
        <TarjetaResumen titulo="Mejor Estudiante" valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"} subtitulo={topEstudiantes[0]?.nombre_completo || ""} icono={Award} color={topEstudiantes[0]?.promedio >= 4.5 ? "success" : topEstudiantes[0]?.promedio >= 4 ? "blue" : topEstudiantes[0]?.promedio >= 3 ? "warning" : "danger"} />
        {mostrarRiesgo ? (
          <div 
            onClick={estudiantesEnRiesgo.length > 0 ? handleVerRiesgo : undefined}
            className={estudiantesEnRiesgo.length > 0 ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}
          >
            <TarjetaResumen titulo="En Riesgo" valor={estudiantesEnRiesgo.length} subtitulo={estudiantesEnRiesgo.length > 0 ? "Click para ver detalles" : "Promedio menor a 3.0"} icono={AlertTriangle} color={estudiantesEnRiesgo.length > 0 ? "danger" : "success"} />
          </div>
        ) : (
          <TarjetaResumen titulo="En Riesgo" valor="—" subtitulo="Se necesitan más datos" icono={AlertTriangle} color="primary" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaDistribucion titulo={`Distribución por Desempeño - ${grado}`} distribucion={distribucion} />
        <TablaEvolucion titulo={`Evolución de ${grado} por Período`} datos={evolucionPeriodos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ListaComparativa titulo={`Rendimiento por Salón - ${grado}`} items={salones.map(s => ({ nombre: `${grado} ${s.salon}`, valor: s.promedio, extra: `${s.cantidadEstudiantes} estudiantes` }))} mostrarPosicion />
        <ListaComparativa titulo={`Rendimiento por Materia - ${grado}`} items={materias.map(m => ({ nombre: m.materia, valor: m.promedio }))} mostrarPosicion />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TablaRanking titulo={`Top 10 Mejores Estudiantes - ${grado}`} datos={topEstudiantes} tipo="estudiante" limite={10} />
        <TablaRanking titulo={`Top 10 Estudiantes a Reforzar - ${grado}`} datos={peoresEstudiantes} tipo="estudiante" limite={10} ocultarIconosDespuesDe={0} />
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
                <td className="py-2 px-3 font-medium text-foreground">{grado}</td>
                <td className="py-2 px-3 text-center font-bold text-foreground">{promedioGrado.toFixed(2)}</td>
                <td className="py-2 px-3 text-center text-muted-foreground">—</td>
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
