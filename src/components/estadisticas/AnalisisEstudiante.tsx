import { useState } from "react";
import { useEstadisticas, PromedioEstudiante } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Award, TrendingUp, Target } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface AnalisisEstudianteProps {
  grado: string;
  salon: string;
  periodo: number | "anual";
}

export const AnalisisEstudiante = ({ grado, salon, periodo }: AnalisisEstudianteProps) => {
  const {
    getPromediosEstudiantes,
    getPromediosMaterias,
    getPromedioInstitucional
  } = useEstadisticas();

  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState("");

  if (!grado || !salon) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        Selecciona un grado y un salón para ver los estudiantes
      </div>
    );
  }

  const estudiantesSalon = getPromediosEstudiantes(periodo, grado, salon)
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

  const estudiante = estudiantesSalon.find(e => e.codigo_estudiantil === estudianteSeleccionado);

  if (!estudianteSeleccionado || !estudiante) {
    return (
      <div className="space-y-6">
        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <label className="text-sm text-muted-foreground mb-1.5 block">Seleccionar Estudiante</label>
          <Select value={estudianteSeleccionado} onValueChange={setEstudianteSeleccionado}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Selecciona un estudiante" />
            </SelectTrigger>
            <SelectContent>
              {estudiantesSalon.map(est => (
                <SelectItem key={est.codigo_estudiantil} value={est.codigo_estudiantil}>
                  {est.nombre_completo} ({est.promedio.toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
          Selecciona un estudiante para ver su perfil académico
        </div>
      </div>
    );
  }

  // Calcular posiciones
  const posicionSalon = estudiantesSalon
    .sort((a, b) => b.promedio - a.promedio)
    .findIndex(e => e.codigo_estudiantil === estudianteSeleccionado) + 1;

  const estudiantesGrado = getPromediosEstudiantes(periodo, grado)
    .sort((a, b) => b.promedio - a.promedio);
  const posicionGrado = estudiantesGrado.findIndex(e => e.codigo_estudiantil === estudianteSeleccionado) + 1;

  const todosEstudiantes = getPromediosEstudiantes(periodo)
    .sort((a, b) => b.promedio - a.promedio);
  const posicionInstitucion = todosEstudiantes.findIndex(e => e.codigo_estudiantil === estudianteSeleccionado) + 1;

  const promedioInstitucional = getPromedioInstitucional(periodo);
  const promedioSalon = estudiantesSalon.length > 0
    ? Math.round((estudiantesSalon.reduce((a, e) => a + e.promedio, 0) / estudiantesSalon.length) * 100) / 100
    : 0;

  // Datos para gráfico de radar
  const materiasEstudiante = Object.entries(estudiante.promediosPorMateria);
  const promediosMateriasSalon = getPromediosMaterias(periodo, grado, salon);

  const datosRadar = materiasEstudiante.map(([materia, promedio]) => {
    const promedioSalonMateria = promediosMateriasSalon.find(m => m.materia === materia)?.promedio || 0;
    return {
      materia: materia.length > 12 ? materia.substring(0, 12) + "..." : materia,
      estudiante: promedio,
      salon: promedioSalonMateria
    };
  });

  // Datos para evolución por período
  const evolucionEstudiante = [1, 2, 3, 4].map(p => ({
    periodo: `P${p}`,
    estudiante: estudiante.promediosPorPeriodo[p] || 0,
    salon: getPromediosEstudiantes(p, grado, salon).reduce((sum, e) => sum + e.promedio, 0) / 
           (getPromediosEstudiantes(p, grado, salon).length || 1)
  })).filter(d => d.estudiante > 0);

  // Mejores y peores materias
  const materiasOrdenadas = [...materiasEstudiante].sort((a, b) => b[1] - a[1]);
  const mejorMateria = materiasOrdenadas[0];
  const peorMateria = materiasOrdenadas[materiasOrdenadas.length - 1];

  return (
    <div className="space-y-6">
      {/* Selector de estudiante */}
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <label className="text-sm text-muted-foreground mb-1.5 block">Seleccionar Estudiante</label>
        <Select value={estudianteSeleccionado} onValueChange={setEstudianteSeleccionado}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Selecciona un estudiante" />
          </SelectTrigger>
          <SelectContent>
            {estudiantesSalon.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)).map(est => (
              <SelectItem key={est.codigo_estudiantil} value={est.codigo_estudiantil}>
                {est.nombre_completo} ({est.promedio.toFixed(2)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Perfil del estudiante */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{estudiante.nombre_completo}</h3>
            <p className="text-muted-foreground">{grado} - {salon}</p>
            <p className="text-sm text-muted-foreground">Código: {estudiante.codigo_estudiantil}</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio General"
          valor={estudiante.promedio.toFixed(2)}
          subtitulo={`${(estudiante.promedio - promedioSalon >= 0 ? "+" : "")}${(estudiante.promedio - promedioSalon).toFixed(2)} vs salón`}
          icono={Award}
          color={estudiante.promedio >= 4 ? "success" : estudiante.promedio >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Posición Salón"
          valor={`#${posicionSalon}`}
          subtitulo={`De ${estudiantesSalon.length} estudiantes`}
          icono={TrendingUp}
          color={posicionSalon <= 3 ? "success" : "primary"}
        />
        <TarjetaResumen
          titulo="Posición Grado"
          valor={`#${posicionGrado}`}
          subtitulo={`De ${estudiantesGrado.length} estudiantes`}
          icono={TrendingUp}
          color={posicionGrado <= 10 ? "success" : "primary"}
        />
        <TarjetaResumen
          titulo="Mejor Materia"
          valor={mejorMateria?.[1]?.toFixed(2) || "—"}
          subtitulo={mejorMateria?.[0] || ""}
          icono={Target}
          color="success"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Radar */}
        {datosRadar.length > 0 && (
          <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
            <h4 className="font-semibold text-foreground mb-4">Perfil de Competencias vs Salón</h4>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={datosRadar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="materia" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                <Radar 
                  name={estudiante.nombre_completo.split(" ").slice(0, 2).join(" ")} 
                  dataKey="estudiante" 
                  stroke="#16a34a" 
                  fill="#16a34a" 
                  fillOpacity={0.5} 
                />
                <Radar 
                  name="Promedio Salón" 
                  dataKey="salon" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.3} 
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Evolución por período */}
        {evolucionEstudiante.length > 0 && (
          <GraficoLineas
            titulo="Evolución por Período vs Salón"
            datos={evolucionEstudiante}
            xAxisKey="periodo"
            lineas={[
              { dataKey: "estudiante", nombre: "Estudiante", color: "#16a34a" },
              { dataKey: "salon", nombre: "Promedio Salón", color: "#3b82f6" }
            ]}
          />
        )}
      </div>

      {/* Rendimiento por materia */}
      <GraficoBarras
        titulo="Rendimiento por Materia"
        datos={materiasEstudiante.map(([materia, promedio]) => ({
          nombre: materia,
          valor: promedio
        })).sort((a, b) => b.valor - a.valor)}
        horizontal
        mostrarColoresPorRendimiento
        altura={Math.max(250, materiasEstudiante.length * 40)}
      />

      {/* Fortalezas y debilidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Fortalezas (Materias destacadas)
          </h4>
          <div className="space-y-2">
            {materiasOrdenadas.slice(0, 3).map(([materia, promedio], idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border border-green-200">
                <span className="text-sm text-foreground">{materia}</span>
                <span className="text-sm font-bold text-green-600">{promedio.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h4 className="font-semibold text-amber-700 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Áreas de Mejora
          </h4>
          <div className="space-y-2">
            {materiasOrdenadas.slice(-3).reverse().map(([materia, promedio], idx) => (
              <div 
                key={idx} 
                className={`flex justify-between items-center p-2 bg-white rounded border ${
                  promedio < 3 ? 'border-red-200' : 'border-amber-200'
                }`}
              >
                <span className="text-sm text-foreground">{materia}</span>
                <span className={`text-sm font-bold ${promedio < 3 ? 'text-red-600' : 'text-amber-600'}`}>
                  {promedio.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
