import { useNavigate } from "react-router-dom";
import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { useCompletitud } from "@/hooks/useCompletitud";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { IndicadorCompletitud } from "./IndicadorCompletitud";
import { School, Users, Award, AlertTriangle } from "lucide-react";

interface AnalisisInstitucionalProps {
  periodo: number | "anual";
}

export const AnalisisInstitucional = ({ periodo }: AnalisisInstitucionalProps) => {
  const navigate = useNavigate();
  const {
    getPromedioInstitucional,
    getPromediosEstudiantes,
    getPromediosGrados,
    getPromediosSalones,
    getDistribucionDesempeno,
    getTopEstudiantes,
    getEvolucionPeriodos,
    tieneDatosSuficientesParaRiesgo,
    getEstudiantesEnRiesgo
  } = useEstadisticas();

  const { verificarCompletitud } = useCompletitud();

  const promedioInstitucional = getPromedioInstitucional(periodo);
  const estudiantesTotales = getPromediosEstudiantes(periodo);
  const distribucion = getDistribucionDesempeno(periodo);
  const topEstudiantes = getTopEstudiantes(10, periodo);
  const topSalones = getPromediosSalones(periodo).sort((a, b) => b.promedio - a.promedio).slice(0, 5);
  const todosGrados = getPromediosGrados(periodo).sort((a, b) => b.promedio - a.promedio);
  
  // Verificar completitud con el nuevo hook
  const { completo, detalles, resumen, resumenCompleto } = verificarCompletitud("institucion", periodo);
  
  // Filtrar evolución hasta el período seleccionado
  const periodoHasta = periodo === "anual" ? 4 : periodo;
  const evolucionPeriodos = getEvolucionPeriodos("institucion").filter(e => {
    const numPeriodo = parseInt(e.periodo.replace("Período ", ""));
    return numPeriodo <= periodoHasta;
  });

  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo) : [];

  // Calcular mejores y peores grados SIN superposición
  const cantidadGrados = todosGrados.length;
  let cantidadMejores = Math.min(3, Math.floor(cantidadGrados / 2));
  let cantidadPeores = Math.min(3, cantidadGrados - cantidadMejores);
  
  // Si hay muy pocos grados, ajustar
  if (cantidadGrados <= 1) {
    cantidadMejores = cantidadGrados;
    cantidadPeores = 0;
  } else if (cantidadGrados <= 3) {
    cantidadMejores = 1;
    cantidadPeores = 1;
  }

  const mejoresGrados = todosGrados.slice(0, cantidadMejores);
  const peoresGrados = todosGrados.slice(-cantidadPeores).reverse();

  // Datos para listas
  const datosGrados = getPromediosGrados(periodo)
    .sort((a, b) => ordenGrados.indexOf(a.grado) - ordenGrados.indexOf(b.grado))
    .map(g => ({ nombre: g.grado, valor: g.promedio, extra: `${g.cantidadEstudiantes} estudiantes con notas` }));

  // Contar salones únicos con datos
  const salonesConDatos = getPromediosSalones(periodo);

  // Formatear el período para mostrar
  const periodoTexto = periodo === "anual" ? "Acumulado Anual" : `Período ${periodo}`;

  const handleVerRiesgo = () => {
    const params = new URLSearchParams();
    params.set("nivel", "institucion");
    params.set("periodo", String(periodo));
    navigate(`/rector/estudiantes-riesgo?${params.toString()}`);
  };

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
          nivel="Institución" 
          periodo={periodoTexto}
        />
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio Institucional"
          valor={promedioInstitucional.toFixed(2)}
          subtitulo={`Basado en ${estudiantesTotales.length} estudiantes con notas`}
          icono={School}
          color={promedioInstitucional >= 4 ? "success" : promedioInstitucional >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Estudiantes con notas"
          valor={estudiantesTotales.length}
          subtitulo={`En ${salonesConDatos.length} salones`}
          icono={Users}
          color="primary"
        />
        <TarjetaResumen
          titulo="Mejor Promedio"
          valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"}
          subtitulo={topEstudiantes[0]?.nombre_completo || ""}
          icono={Award}
          color={topEstudiantes[0]?.promedio >= 4 ? "success" : topEstudiantes[0]?.promedio >= 3 ? "warning" : "danger"}
        />
        {mostrarRiesgo ? (
          <div 
            onClick={estudiantesEnRiesgo.length > 0 ? handleVerRiesgo : undefined}
            className={estudiantesEnRiesgo.length > 0 ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}
          >
            <TarjetaResumen
              titulo="En Riesgo Académico"
              valor={estudiantesEnRiesgo.length}
              subtitulo={estudiantesEnRiesgo.length > 0 ? "Click para ver detalles" : "Promedio menor a 3.0"}
              icono={AlertTriangle}
              color={estudiantesEnRiesgo.length > 0 ? "danger" : "success"}
            />
          </div>
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
        <TablaRanking titulo="Top 5 Mejores Grados" datos={todosGrados.slice(0, 5)} tipo="grado" limite={5} />
      </div>

      {/* Promedio por Grado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ListaComparativa
          titulo="Promedio por Grado"
          items={datosGrados}
          mostrarPosicion
        />
      </div>

      {/* Mejores y Peores Grados (sin superposición) */}
      {cantidadGrados > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ListaComparativa
            titulo="Mejores Grados"
            items={mejoresGrados.map(g => ({ nombre: g.grado, valor: g.promedio }))}
            tipo="mejor"
            icono={<Award className="w-5 h-5 text-green-500" />}
          />
          {cantidadPeores > 0 && (
            <ListaComparativa
              titulo="Grados a Reforzar"
              items={peoresGrados.map(g => ({ nombre: g.grado, valor: g.promedio }))}
              tipo="peor"
              icono={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            />
          )}
        </div>
      )}
    </div>
  );
};
