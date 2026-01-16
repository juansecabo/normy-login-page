import { useEstadisticas } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { Home, Users, TrendingUp, AlertTriangle, Award } from "lucide-react";

interface AnalisisSalonProps { grado: string; salon: string; periodo: number | "anual"; }

export const AnalisisSalon = ({ grado, salon, periodo }: AnalisisSalonProps) => {
  const { getPromediosEstudiantes, getPromediosSalones, getPromediosMaterias, getDistribucionDesempeno, getTopEstudiantes, getEvolucionPeriodos, getPromedioInstitucional, tieneDatosSuficientesParaRiesgo, getEstudiantesEnRiesgo } = useEstadisticas();

  if (!grado || !salon) return <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">Selecciona un grado y un salón para ver el análisis</div>;

  const estudiantesSalon = getPromediosEstudiantes(periodo, grado, salon);
  const promedioSalon = estudiantesSalon.length > 0 ? Math.round((estudiantesSalon.reduce((a, e) => a + e.promedio, 0) / estudiantesSalon.length) * 100) / 100 : 0;
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const salonesGrado = getPromediosSalones(periodo, grado).sort((a, b) => b.promedio - a.promedio);
  const posicionEnGrado = salonesGrado.findIndex(s => s.salon === salon) + 1;
  const distribucion = getDistribucionDesempeno(periodo, grado, salon);
  const topEstudiantes = getTopEstudiantes(5, periodo, grado, salon);
  const materias = getPromediosMaterias(periodo, grado, salon);
  const evolucionPeriodos = getEvolucionPeriodos("salon", grado, salon);
  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo, grado, salon);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo, grado, salon) : [];
  const estudiantesGrado = getPromediosEstudiantes(periodo, grado);
  const promedioGrado = estudiantesGrado.length > 0 ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100 : 0;
  const diferenciaConGrado = promedioSalon - promedioGrado;
  const diferenciaConInst = promedioSalon - promedioInstitucional;
  const mejoresMaterias = [...materias].slice(0, 3);
  const peoresMaterias = [...materias].sort((a, b) => a.promedio - b.promedio).slice(0, 3);

  if (estudiantesSalon.length === 0) {
    return <div className="bg-card rounded-lg shadow-soft p-8 text-center"><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay actividades con notas registradas para {grado} - {salon}</h3><p className="text-muted-foreground">Las estadísticas estarán disponibles cuando se registren notas.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen titulo={`Promedio ${grado} - ${salon}`} valor={promedioSalon.toFixed(2)} subtitulo={`#${posicionEnGrado} de ${salonesGrado.length} en ${grado}`} icono={Home} color={promedioSalon >= 4 ? "success" : promedioSalon >= 3 ? "warning" : "danger"} />
        <TarjetaResumen titulo="Estudiantes" valor={estudiantesSalon.length} subtitulo="En este salón" icono={Users} color="primary" />
        <TarjetaResumen titulo="vs Grado" valor={`${diferenciaConGrado >= 0 ? "+" : ""}${diferenciaConGrado.toFixed(2)}`} subtitulo={`Prom. grado: ${promedioGrado.toFixed(2)}`} icono={TrendingUp} color={diferenciaConGrado >= 0 ? "success" : "danger"} />
        <TarjetaResumen titulo="vs Institución" valor={`${diferenciaConInst >= 0 ? "+" : ""}${diferenciaConInst.toFixed(2)}`} subtitulo={`Prom. inst: ${promedioInstitucional.toFixed(2)}`} icono={TrendingUp} color={diferenciaConInst >= 0 ? "success" : "danger"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaDistribucion titulo="Distribución por Desempeño" distribucion={distribucion} />
        <TablaEvolucion titulo={`Evolución de ${grado} - ${salon} por Período`} datos={evolucionPeriodos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TablaRanking titulo={`Top 5 Estudiantes - ${salon}`} datos={topEstudiantes} tipo="estudiante" limite={5} />
        <ListaComparativa titulo="Mejores Materias" items={mejoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))} tipo="mejor" icono={<Award className="w-5 h-5 text-green-500" />} />
        <ListaComparativa titulo="Materias a Reforzar" items={peoresMaterias.map(m => ({ nombre: m.materia, valor: m.promedio }))} tipo="peor" icono={<AlertTriangle className="w-5 h-5 text-amber-500" />} />
      </div>

      <ListaComparativa titulo={`Rendimiento por Materia - ${grado} ${salon}`} items={materias.map(m => ({ nombre: m.materia, valor: m.promedio }))} mostrarPosicion />

      {mostrarRiesgo && estudiantesEnRiesgo.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" />Estudiantes en Riesgo Académico ({estudiantesEnRiesgo.length})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {estudiantesEnRiesgo.map((est, idx) => <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-red-200"><span className="text-sm text-foreground truncate">{est.nombre_completo}</span><span className="text-sm font-bold text-red-600 ml-2">{est.promedio.toFixed(2)}</span></div>)}
          </div>
        </div>
      )}
    </div>
  );
};
