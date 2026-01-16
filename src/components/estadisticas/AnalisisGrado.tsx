import { useEstadisticas } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaDistribucion } from "./TablaDistribucion";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import { GraduationCap, Users, Award, AlertTriangle } from "lucide-react";

interface AnalisisGradoProps {
  grado: string;
  periodo: number | "anual";
}

export const AnalisisGrado = ({ grado, periodo }: AnalisisGradoProps) => {
  const {
    getPromediosEstudiantes, getPromediosSalones, getPromediosMaterias,
    getDistribucionDesempeno, getTopEstudiantes, getEvolucionPeriodos,
    getPromedioInstitucional, tieneDatosSuficientesParaRiesgo, getEstudiantesEnRiesgo
  } = useEstadisticas();

  if (!grado) {
    return <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">Selecciona un grado para ver el análisis</div>;
  }

  const estudiantesGrado = getPromediosEstudiantes(periodo, grado);
  const promedioGrado = estudiantesGrado.length > 0 ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100 : 0;
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const distribucion = getDistribucionDesempeno(periodo, grado);
  const topEstudiantes = getTopEstudiantes(10, periodo, grado);
  const salones = getPromediosSalones(periodo, grado).sort((a, b) => b.promedio - a.promedio);
  const materias = getPromediosMaterias(periodo, grado);
  const evolucionPeriodos = getEvolucionPeriodos("grado", grado);
  const mostrarRiesgo = tieneDatosSuficientesParaRiesgo(periodo, grado);
  const estudiantesEnRiesgo = mostrarRiesgo ? getEstudiantesEnRiesgo(periodo, grado) : [];
  const diferenciaConInst = promedioGrado - promedioInstitucional;

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen titulo={`Promedio ${grado}`} valor={promedioGrado.toFixed(2)} subtitulo={`${diferenciaConInst >= 0 ? "+" : ""}${diferenciaConInst.toFixed(2)} vs institución`} icono={GraduationCap} color={promedioGrado >= 4 ? "success" : promedioGrado >= 3 ? "warning" : "danger"} />
        <TarjetaResumen titulo="Estudiantes" valor={estudiantesGrado.length} subtitulo={`En ${salones.length} salones`} icono={Users} color="primary" />
        <TarjetaResumen titulo="Mejor Estudiante" valor={topEstudiantes[0]?.promedio.toFixed(2) || "—"} subtitulo={topEstudiantes[0]?.nombre_completo.split(" ").slice(0, 2).join(" ") || ""} icono={Award} color="success" />
        {mostrarRiesgo ? <TarjetaResumen titulo="En Riesgo" valor={estudiantesEnRiesgo.length} subtitulo="Promedio menor a 3.0" icono={AlertTriangle} color={estudiantesEnRiesgo.length > 0 ? "danger" : "success"} /> : <TarjetaResumen titulo="En Riesgo" valor="—" subtitulo="Se necesitan más datos" icono={AlertTriangle} color="primary" />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaDistribucion titulo="Distribución por Desempeño" distribucion={distribucion} />
        <TablaEvolucion titulo={`Evolución de ${grado} por Período`} datos={evolucionPeriodos} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ListaComparativa titulo={`Ranking de Salones - ${grado}`} items={salones.map(s => ({ nombre: s.salon, valor: s.promedio, extra: `${s.cantidadEstudiantes} estudiantes` }))} mostrarPosicion />
        <ListaComparativa titulo={`Rendimiento por Materia - ${grado}`} items={materias.map(m => ({ nombre: m.materia, valor: m.promedio }))} mostrarPosicion />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TablaRanking titulo={`Top 10 Estudiantes - ${grado}`} datos={topEstudiantes} tipo="estudiante" limite={10} />
        <TablaRanking titulo={`Ranking Salones - ${grado}`} datos={salones} tipo="salon" limite={salones.length} />
      </div>
    </div>
  );
};
