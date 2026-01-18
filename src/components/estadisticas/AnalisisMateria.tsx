import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { TablaRanking } from "./TablaRanking";
import { TablaEvolucion } from "./TablaEvolucion";
import { ListaComparativa } from "./ListaComparativa";
import BotonDescarga from "./BotonDescarga";
import { BookOpen, Users, Award, AlertTriangle } from "lucide-react";

interface AnalisisMateriaProps { materia: string; periodo: number | "anual"; grado?: string; salon?: string; titulo?: string; }

export const AnalisisMateria = ({ materia, periodo, grado, salon, titulo }: AnalisisMateriaProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { getPromediosEstudiantes, getPromediosSalones, getPromediosMaterias, getEstudiantesEnRiesgo } = useEstadisticas();

  if (!materia) return <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">Selecciona una materia para ver su análisis</div>;

  // Determinar contexto de nivel para etiquetas
  const gradoEfectivo = grado && grado !== "all" ? grado : undefined;
  const salonEfectivo = salon && salon !== "all" ? salon : undefined;
  
  // Construir sufijo de contexto para títulos
  const getContextoLabel = () => {
    if (salonEfectivo) return `${gradoEfectivo} ${salonEfectivo}`;
    if (gradoEfectivo) return gradoEfectivo;
    return "Institucional";
  };

  const promedioMateria = getPromediosMaterias(periodo, grado, salon).find(m => m.materia === materia);
  const rendimientoPorGrado = ordenGrados.map(g => { const pm = getPromediosMaterias(periodo, g).find(m => m.materia === materia); return { nombre: g, valor: pm?.promedio || 0 }; }).filter(g => g.valor > 0);
  const gradosOrdenados = [...rendimientoPorGrado].sort((a, b) => b.valor - a.valor);
  
  // Calcular mejores y peores grados SIN superposición
  const cantidadGrados = gradosOrdenados.length;
  let cantidadMejores = Math.min(3, Math.floor(cantidadGrados / 2));
  let cantidadPeores = Math.min(3, cantidadGrados - cantidadMejores);
  
  if (cantidadGrados <= 1) {
    cantidadMejores = cantidadGrados;
    cantidadPeores = 0;
  } else if (cantidadGrados <= 3) {
    cantidadMejores = 1;
    cantidadPeores = 1;
  }

  const mejoresGrados = gradosOrdenados.slice(0, cantidadMejores);
  const peoresGrados = gradosOrdenados.slice(-cantidadPeores).reverse();
  
  const rendimientoPorSalon = gradoEfectivo ? getPromediosSalones(periodo, gradoEfectivo).map(s => { const pm = getPromediosMaterias(periodo, gradoEfectivo, s.salon).find(m => m.materia === materia); return { grado: s.grado, salon: s.salon, promedio: pm?.promedio || 0, cantidadEstudiantes: s.cantidadEstudiantes }; }).filter(s => s.promedio > 0).sort((a, b) => b.promedio - a.promedio) : [];
  
  // Obtener estudiantes con nota en esta materia
  const estudiantesConMateria = getPromediosEstudiantes(periodo, grado, salon).map(e => ({ ...e, promedioMateria: e.promediosPorMateria?.[materia] || 0 })).filter(e => e.promedioMateria > 0).sort((a, b) => b.promedioMateria - a.promedioMateria);
  
  // Límite de top según nivel
  const limiteTop = salonEfectivo ? 5 : 10;
  const topEstudiantes = estudiantesConMateria.slice(0, limiteTop).map(e => ({ ...e, promedio: e.promedioMateria }));
  
  // Título del ranking según contexto
  const getTituloRanking = () => {
    if (salonEfectivo) return `Top ${limiteTop} Estudiantes - ${gradoEfectivo} ${salonEfectivo} - ${materia}`;
    if (gradoEfectivo) return `Top ${limiteTop} Estudiantes - ${gradoEfectivo} - ${materia}`;
    return `Top ${limiteTop} Estudiantes - ${materia}`;
  };
  
  // Calcular evolución específica por nivel
  const periodoHasta = periodo === "anual" ? 4 : periodo;
  const evolucionMateria = [1, 2, 3, 4]
    .filter(p => p <= periodoHasta)
    .map(p => { const pm = getPromediosMaterias(p, grado, salon).find(m => m.materia === materia); return { periodo: `Período ${p}`, promedio: pm?.promedio || 0 }; })
    .filter(e => e.promedio > 0);
  
  // Título de evolución según contexto
  const getTituloEvolucion = () => {
    if (salonEfectivo) return `Evolución de ${materia} - ${gradoEfectivo} ${salonEfectivo}`;
    if (gradoEfectivo) return `Evolución de ${materia} - ${gradoEfectivo}`;
    return `Evolución de ${materia} - Institucional`;
  };
  
  const cantidadEstudiantes = estudiantesConMateria.length;
  const estudiantesAprobados = estudiantesConMateria.filter(e => e.promedioMateria >= 3.0).length;
  
  // Calcular estudiantes en riesgo SOLO para esta materia
  const estudiantesEnRiesgoMateria = getEstudiantesEnRiesgo(periodo, grado, salon, materia);
  const estudiantesReprobados = estudiantesEnRiesgoMateria.length;
  
  const tasaAprobacion = cantidadEstudiantes > 0 ? Math.round((estudiantesAprobados / cantidadEstudiantes) * 100) : 0;

  // Navegar a página de riesgo con filtro de materia
  const handleRiesgoClick = () => {
    const params = new URLSearchParams();
    params.set("nivel", "materia");
    params.set("periodo", periodo.toString());
    params.set("materia", materia);
    if (gradoEfectivo) params.set("grado", gradoEfectivo);
    if (salonEfectivo) params.set("salon", salonEfectivo);
    navigate(`/rector/estudiantes-riesgo?${params.toString()}`);
  };

  if (!promedioMateria) {
    return <div className="bg-card rounded-lg shadow-soft p-8 text-center"><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" /><h3 className="text-lg font-semibold text-foreground mb-2">Aún no hay notas registradas para {materia}</h3><p className="text-muted-foreground">Las estadísticas estarán disponibles cuando se registren notas.</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Botón de descarga FUERA del contenido capturado */}
      <div className="flex justify-end">
        <BotonDescarga contentRef={contentRef} nombreArchivo={`estadisticas-${materia}-${periodo === "anual" ? "anual" : `periodo-${periodo}`}`} />
      </div>

      {/* Contenido capturado para PDF */}
      <div ref={contentRef}>
      {/* Banner informativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-700">
        <span className="font-medium">ℹ️</span>
        <span>Estadísticas basadas únicamente en estudiantes con notas registradas.</span>
      </div>

      <div className="space-y-6">
        {/* Título dinámico */}
        {titulo && (
          <h2 className="text-xl md:text-2xl font-bold text-foreground text-center">
            {titulo}
          </h2>
        )}

        <div className="bg-card rounded-lg shadow-soft p-6 border border-border">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center"><BookOpen className="w-8 h-8 text-primary" /></div>
            <div><h2 className="text-xl font-bold text-foreground">{materia}</h2><p className="text-muted-foreground">{
              salonEfectivo 
                ? `${gradoEfectivo} ${salonEfectivo}` 
                : gradoEfectivo 
                  ? `Grado: ${gradoEfectivo}` 
                  : "Análisis institucional"
            }</p></div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen titulo="Promedio de la Materia" valor={promedioMateria.promedio.toFixed(2)} subtitulo={periodo === "anual" ? "Acumulado anual" : `Período ${periodo}`} icono={BookOpen} color={promedioMateria.promedio >= 4 ? "success" : promedioMateria.promedio >= 3 ? "warning" : "danger"} />
        <TarjetaResumen titulo="Estudiantes con notas" valor={cantidadEstudiantes} subtitulo="Con calificaciones" icono={Users} color="primary" />
        <TarjetaResumen titulo="Tasa de Aprobación" valor={`${tasaAprobacion}%`} subtitulo={`${estudiantesAprobados} aprobados`} icono={Award} color={tasaAprobacion >= 80 ? "success" : tasaAprobacion >= 60 ? "warning" : "danger"} />
        <TarjetaResumen 
          titulo="En Riesgo" 
          valor={estudiantesReprobados} 
          subtitulo="Promedio < 3.0" 
          icono={AlertTriangle} 
          color={estudiantesReprobados > 0 ? "danger" : "success"} 
          onClick={estudiantesReprobados > 0 ? handleRiesgoClick : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TablaEvolucion titulo={getTituloEvolucion()} datos={evolucionMateria} />
        <ListaComparativa titulo="Rendimiento por Grado" items={rendimientoPorGrado} mostrarPosicion />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TablaRanking titulo={getTituloRanking()} datos={topEstudiantes} tipo="estudiante" limite={limiteTop} />
        {cantidadGrados > 1 && (
          <>
            <ListaComparativa titulo="Mejores Grados" items={mejoresGrados} tipo="mejor" icono={<Award className="w-5 h-5 text-green-500" />} />
            {cantidadPeores > 0 && (
              <ListaComparativa titulo="Grados a Reforzar" items={peoresGrados} tipo="peor" icono={<AlertTriangle className="w-5 h-5 text-amber-500" />} />
            )}
          </>
        )}
      </div>

      {gradoEfectivo && rendimientoPorSalon.length > 0 && (
        <ListaComparativa titulo={`Ranking de Salones - ${gradoEfectivo} - ${materia}`} items={rendimientoPorSalon.map(s => ({ nombre: s.salon, valor: s.promedio, extra: `${s.cantidadEstudiantes} estudiantes` }))} mostrarPosicion />
      )}
      </div>
      </div>
    </div>
  );
};
