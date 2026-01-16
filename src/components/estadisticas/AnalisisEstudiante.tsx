import { useEstadisticas } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { GraficoRadar } from "./GraficoRadar";
import { User, TrendingUp, Award, AlertTriangle, Medal, Star } from "lucide-react";

interface AnalisisEstudianteProps {
  codigoEstudiante: string;
  periodo: number | "anual";
}

export const AnalisisEstudiante = ({ codigoEstudiante, periodo }: AnalisisEstudianteProps) => {
  const {
    getPromediosEstudiantes,
    getPromediosMaterias,
    getPromedioInstitucional,
    getEvolucionPeriodos
  } = useEstadisticas();

  if (!codigoEstudiante) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        Selecciona un estudiante para ver su análisis
      </div>
    );
  }

  // Obtener datos del estudiante
  const todosEstudiantes = getPromediosEstudiantes(periodo);
  const estudiante = todosEstudiantes.find(e => e.codigo_estudiantil === codigoEstudiante);

  if (!estudiante) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        No se encontró información del estudiante
      </div>
    );
  }

  // Posiciones en rankings
  const estudiantesSalon = getPromediosEstudiantes(periodo, estudiante.grado, estudiante.salon)
    .sort((a, b) => b.promedio - a.promedio);
  const estudiantesGrado = getPromediosEstudiantes(periodo, estudiante.grado)
    .sort((a, b) => b.promedio - a.promedio);
  const estudiantesInst = todosEstudiantes.sort((a, b) => b.promedio - a.promedio);

  const posicionSalon = estudiantesSalon.findIndex(e => e.codigo_estudiantil === codigoEstudiante) + 1;
  const posicionGrado = estudiantesGrado.findIndex(e => e.codigo_estudiantil === codigoEstudiante) + 1;
  const posicionInst = estudiantesInst.findIndex(e => e.codigo_estudiantil === codigoEstudiante) + 1;

  // Promedios comparativos
  const promedioInstitucional = getPromedioInstitucional(periodo);
  const promedioSalon = estudiantesSalon.length > 0
    ? Math.round((estudiantesSalon.reduce((a, e) => a + e.promedio, 0) / estudiantesSalon.length) * 100) / 100
    : 0;
  const promedioGrado = estudiantesGrado.length > 0
    ? Math.round((estudiantesGrado.reduce((a, e) => a + e.promedio, 0) / estudiantesGrado.length) * 100) / 100
    : 0;

  // Análisis por materia del estudiante
  const materiasEstudiante = Object.entries(estudiante.promediosPorMateria || {})
    .map(([materia, promedio]) => ({ materia, promedio }))
    .sort((a, b) => b.promedio - a.promedio);

  const mejorMateria = materiasEstudiante[0];
  const peorMateria = materiasEstudiante[materiasEstudiante.length - 1];

  // Datos para gráfico de barras
  const datosBarras = materiasEstudiante.map(m => ({
    nombre: m.materia,
    valor: m.promedio
  }));

  // Datos para gráfico de radar (comparación con promedio del salón)
  const promediosSalon = getPromediosMaterias(periodo, estudiante.grado, estudiante.salon);
  const datosRadar = materiasEstudiante.map(m => {
    const promedioMatSalon = promediosSalon.find(p => p.materia === m.materia);
    return {
      materia: m.materia.length > 10 ? m.materia.substring(0, 8) + "..." : m.materia,
      estudiante: m.promedio,
      promedio: promedioMatSalon?.promedio || 0
    };
  });

  // Evolución por período del estudiante
  const evolucionEstudiante = Object.entries(estudiante.promediosPorPeriodo || {})
    .map(([periodo, promedio]) => ({
      periodo: `Período ${periodo}`,
      estudiante: promedio
    }))
    .sort((a, b) => {
      const pA = parseInt(a.periodo.replace("Período ", ""));
      const pB = parseInt(b.periodo.replace("Período ", ""));
      return pA - pB;
    });

  // Comparar con evolución del salón
  const evolucionSalon = getEvolucionPeriodos("salon", estudiante.grado, estudiante.salon);
  const evolucionComparativa = evolucionEstudiante.map(e => {
    const salonData = evolucionSalon.find(s => s.periodo === e.periodo);
    return {
      periodo: e.periodo,
      estudiante: e.estudiante,
      salon: salonData?.promedio || 0
    };
  });

  // Fortalezas y debilidades
  const fortalezas = materiasEstudiante.filter(m => m.promedio >= 4.0).slice(0, 3);
  const debilidades = materiasEstudiante.filter(m => m.promedio < 3.5)
    .sort((a, b) => a.promedio - b.promedio).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Información del estudiante */}
      <div className="bg-card rounded-lg shadow-soft p-6 border border-border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{estudiante.nombre_completo}</h2>
              <p className="text-muted-foreground">{estudiante.grado} - {estudiante.salon}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="text-center px-4 py-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Salón</p>
              <p className="text-lg font-bold text-foreground">#{posicionSalon}/{estudiantesSalon.length}</p>
            </div>
            <div className="text-center px-4 py-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Grado</p>
              <p className="text-lg font-bold text-foreground">#{posicionGrado}/{estudiantesGrado.length}</p>
            </div>
            <div className="text-center px-4 py-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">Institución</p>
              <p className="text-lg font-bold text-foreground">#{posicionInst}/{estudiantesInst.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio General"
          valor={estudiante.promedio.toFixed(2)}
          subtitulo={periodo === "anual" ? "Acumulado anual" : `Período ${periodo}`}
          icono={Award}
          color={estudiante.promedio >= 4 ? "success" : estudiante.promedio >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="vs Salón"
          valor={`${(estudiante.promedio - promedioSalon) >= 0 ? "+" : ""}${(estudiante.promedio - promedioSalon).toFixed(2)}`}
          subtitulo={`Prom. salón: ${promedioSalon.toFixed(2)}`}
          icono={TrendingUp}
          color={(estudiante.promedio - promedioSalon) >= 0 ? "success" : "danger"}
        />
        <TarjetaResumen
          titulo="Mejor Materia"
          valor={mejorMateria?.promedio.toFixed(2) || "—"}
          subtitulo={mejorMateria?.materia || ""}
          icono={Star}
          color="success"
        />
        <TarjetaResumen
          titulo="Materia a Mejorar"
          valor={peorMateria?.promedio.toFixed(2) || "—"}
          subtitulo={peorMateria?.materia || ""}
          icono={AlertTriangle}
          color={peorMateria && peorMateria.promedio < 3 ? "danger" : "warning"}
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoRadar
          titulo="Perfil de Competencias vs Promedio del Salón"
          datos={datosRadar}
          nombreEstudiante={estudiante.nombre_completo.split(" ")[0]}
        />
        <GraficoBarras
          titulo="Rendimiento por Materia"
          datos={datosBarras}
          horizontal
          mostrarColoresPorRendimiento
          altura={Math.max(250, datosBarras.length * 35)}
        />
      </div>

      {/* Evolución temporal */}
      <GraficoLineas
        titulo="Evolución por Período vs Promedio del Salón"
        datos={evolucionComparativa}
        xAxisKey="periodo"
        lineas={[
          { dataKey: "estudiante", nombre: estudiante.nombre_completo.split(" ")[0], color: "#10B981" },
          { dataKey: "salon", nombre: "Promedio Salón", color: "#3B82F6" }
        ]}
      />

      {/* Fortalezas y Debilidades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Medal className="w-5 h-5 text-green-500" />
            Fortalezas
          </h4>
          <div className="space-y-2">
            {fortalezas.length > 0 ? fortalezas.map((mat, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium text-foreground">{mat.materia}</span>
                <span className="text-sm font-bold text-green-600">{mat.promedio.toFixed(2)}</span>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">No hay materias con promedio ≥ 4.0</p>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Áreas de Mejora
          </h4>
          <div className="space-y-2">
            {debilidades.length > 0 ? debilidades.map((mat, idx) => (
              <div 
                key={idx} 
                className={`flex justify-between items-center p-3 rounded-lg ${
                  mat.promedio < 3 ? 'bg-red-50' : 'bg-amber-50'
                }`}
              >
                <span className="text-sm font-medium text-foreground">{mat.materia}</span>
                <span className={`text-sm font-bold ${mat.promedio < 3 ? 'text-red-600' : 'text-amber-600'}`}>
                  {mat.promedio.toFixed(2)}
                </span>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm">¡Excelente! Todas las materias ≥ 3.5</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla comparativa */}
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-4">Comparativa con Promedios de Referencia</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-medium text-muted-foreground">Referencia</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Promedio</th>
                <th className="text-center p-2 font-medium text-muted-foreground">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-muted/50">
                <td className="p-2 font-medium">{estudiante.nombre_completo}</td>
                <td className="text-center p-2 font-bold text-primary">{estudiante.promedio.toFixed(2)}</td>
                <td className="text-center p-2">—</td>
              </tr>
              <tr className="border-b hover:bg-muted/50">
                <td className="p-2">Promedio Salón ({estudiante.salon})</td>
                <td className="text-center p-2">{promedioSalon.toFixed(2)}</td>
                <td className={`text-center p-2 font-medium ${(estudiante.promedio - promedioSalon) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(estudiante.promedio - promedioSalon) >= 0 ? "+" : ""}{(estudiante.promedio - promedioSalon).toFixed(2)}
                </td>
              </tr>
              <tr className="border-b hover:bg-muted/50">
                <td className="p-2">Promedio Grado ({estudiante.grado})</td>
                <td className="text-center p-2">{promedioGrado.toFixed(2)}</td>
                <td className={`text-center p-2 font-medium ${(estudiante.promedio - promedioGrado) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(estudiante.promedio - promedioGrado) >= 0 ? "+" : ""}{(estudiante.promedio - promedioGrado).toFixed(2)}
                </td>
              </tr>
              <tr className="hover:bg-muted/50">
                <td className="p-2">Promedio Institucional</td>
                <td className="text-center p-2">{promedioInstitucional.toFixed(2)}</td>
                <td className={`text-center p-2 font-medium ${(estudiante.promedio - promedioInstitucional) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {(estudiante.promedio - promedioInstitucional) >= 0 ? "+" : ""}{(estudiante.promedio - promedioInstitucional).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
