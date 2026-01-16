import { useEstadisticas, ordenGrados } from "@/hooks/useEstadisticas";
import { TarjetaResumen } from "./TarjetaResumen";
import { GraficoBarras } from "./GraficoBarras";
import { GraficoLineas } from "./GraficoLineas";
import { TablaRanking } from "./TablaRanking";
import { BookOpen, Users, TrendingUp, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

interface AnalisisMateriaProps {
  materia: string;
  periodo: number | "anual";
}

const getColorPorRendimiento = (valor: number): string => {
  if (valor < 3.0) return "#EF4444";
  if (valor < 4.0) return "#F59E0B";
  if (valor <= 4.5) return "#3B82F6";
  return "#10B981";
};

export const AnalisisMateria = ({ materia, periodo }: AnalisisMateriaProps) => {
  const {
    notas,
    grados,
    getPromediosEstudiantes,
    getPromediosMaterias,
    getPromediosSalones
  } = useEstadisticas();

  if (!materia) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        Selecciona una materia para ver el análisis
      </div>
    );
  }

  // Filtrar notas de la materia
  const notasMateria = notas.filter(n => n.materia === materia);
  
  if (notasMateria.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-8 text-center text-muted-foreground">
        No hay datos disponibles para {materia}
      </div>
    );
  }

  // Promedio general de la materia
  const promedioMateria = notasMateria.reduce((sum, n) => sum + n.nota, 0) / notasMateria.length;
  
  // Estudiantes únicos que tienen notas en esta materia
  const estudiantesUnicos = [...new Set(notasMateria.map(n => n.codigo_estudiantil))];
  
  // Grados donde se dicta la materia
  const gradosConMateria = [...new Set(notasMateria.map(n => n.grado))].sort(
    (a, b) => ordenGrados.indexOf(a) - ordenGrados.indexOf(b)
  );

  // Promedios por grado para esta materia
  const promediosPorGrado = gradosConMateria.map(grado => {
    const notasGrado = notasMateria.filter(n => n.grado === grado);
    const promedio = notasGrado.length > 0
      ? Math.round((notasGrado.reduce((sum, n) => sum + n.nota, 0) / notasGrado.length) * 100) / 100
      : 0;
    return { grado, promedio };
  });

  const mejorGrado = [...promediosPorGrado].sort((a, b) => b.promedio - a.promedio)[0];
  const peorGrado = [...promediosPorGrado].sort((a, b) => a.promedio - b.promedio)[0];

  // Top 10 estudiantes en esta materia
  const topEstudiantes = getPromediosEstudiantes(periodo)
    .filter(e => e.promediosPorMateria[materia])
    .map(e => ({
      ...e,
      promedio: e.promediosPorMateria[materia]
    }))
    .sort((a, b) => b.promedio - a.promedio)
    .slice(0, 10);

  // Evolución por período
  const evolucionPeriodos = [1, 2, 3, 4].map(p => {
    const notasPeriodo = notasMateria.filter(n => n.periodo === p);
    const promedio = notasPeriodo.length > 0
      ? Math.round((notasPeriodo.reduce((sum, n) => sum + n.nota, 0) / notasPeriodo.length) * 100) / 100
      : 0;
    return { periodo: `Período ${p}`, promedio };
  }).filter(p => p.promedio > 0);

  // Distribución de notas (histograma)
  const rangos = [
    { nombre: "0.0-1.0", min: 0, max: 1 },
    { nombre: "1.0-2.0", min: 1, max: 2 },
    { nombre: "2.0-3.0", min: 2, max: 3 },
    { nombre: "3.0-4.0", min: 3, max: 4 },
    { nombre: "4.0-5.0", min: 4, max: 5 }
  ];

  const distribucionNotas = rangos.map(rango => {
    const count = notasMateria.filter(n => n.nota >= rango.min && n.nota < (rango.max === 5 ? 5.1 : rango.max)).length;
    return {
      nombre: rango.nombre,
      cantidad: count,
      color: rango.min < 3 ? "#EF4444" : rango.min < 4 ? "#F59E0B" : "#10B981"
    };
  });

  // Comparativa por salón (dentro de cada grado)
  const comparativaSalones: { grado: string; salon: string; promedio: number }[] = [];
  gradosConMateria.forEach(grado => {
    const salonesGrado = [...new Set(notasMateria.filter(n => n.grado === grado).map(n => n.salon))];
    salonesGrado.forEach(salon => {
      const notasSalon = notasMateria.filter(n => n.grado === grado && n.salon === salon);
      const promedio = notasSalon.length > 0
        ? Math.round((notasSalon.reduce((sum, n) => sum + n.nota, 0) / notasSalon.length) * 100) / 100
        : 0;
      comparativaSalones.push({ grado, salon, promedio });
    });
  });

  return (
    <div className="space-y-6">
      {/* Encabezado de la materia */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{materia}</h3>
            <p className="text-muted-foreground">Análisis de rendimiento institucional</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TarjetaResumen
          titulo="Promedio General"
          valor={promedioMateria.toFixed(2)}
          subtitulo="A nivel institucional"
          icono={BookOpen}
          color={promedioMateria >= 4 ? "success" : promedioMateria >= 3 ? "warning" : "danger"}
        />
        <TarjetaResumen
          titulo="Estudiantes"
          valor={estudiantesUnicos.length}
          subtitulo={`En ${gradosConMateria.length} grados`}
          icono={Users}
          color="primary"
        />
        <TarjetaResumen
          titulo="Mejor Grado"
          valor={mejorGrado?.promedio.toFixed(2) || "—"}
          subtitulo={mejorGrado?.grado || ""}
          icono={Award}
          color="success"
        />
        <TarjetaResumen
          titulo="Grado a Reforzar"
          valor={peorGrado?.promedio.toFixed(2) || "—"}
          subtitulo={peorGrado?.grado || ""}
          icono={TrendingUp}
          color={peorGrado && peorGrado.promedio < 3 ? "danger" : "warning"}
        />
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoBarras
          titulo={`Promedio por Grado - ${materia}`}
          datos={promediosPorGrado.map(g => ({ nombre: g.grado, valor: g.promedio }))}
          mostrarColoresPorRendimiento
        />
        
        {/* Histograma de distribución */}
        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4">Distribución de Calificaciones</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distribucionNotas} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number) => [`${value} calificaciones`, "Cantidad"]}
              />
              <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                {distribucionNotas.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolución por período */}
      {evolucionPeriodos.length > 0 && (
        <GraficoLineas
          titulo={`Evolución de ${materia} por Período`}
          datos={evolucionPeriodos}
          xAxisKey="periodo"
          lineas={[{ dataKey: "promedio", nombre: materia, color: "#16a34a" }]}
        />
      )}

      {/* Rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TablaRanking
          titulo={`Top 10 Estudiantes en ${materia}`}
          datos={topEstudiantes}
          tipo="estudiante"
          limite={10}
        />
        
        {/* Comparativa de salones */}
        <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
          <h4 className="font-semibold text-foreground mb-4">Ranking por Salón</h4>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {comparativaSalones
              .sort((a, b) => b.promedio - a.promedio)
              .map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {item.grado} - {item.salon}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-sm font-semibold ${
                    item.promedio < 3 ? 'text-red-600 bg-red-50' :
                    item.promedio < 4 ? 'text-amber-600 bg-amber-50' :
                    item.promedio <= 4.5 ? 'text-blue-600 bg-blue-50' :
                    'text-green-600 bg-green-50'
                  }`}>
                    {item.promedio.toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Mapa de calor por grado y período */}
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-4">Rendimiento por Grado y Período</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 text-sm font-semibold text-foreground border-b">Grado</th>
                {[1, 2, 3, 4].map(p => (
                  <th key={p} className="text-center p-2 text-sm font-semibold text-foreground border-b">
                    Período {p}
                  </th>
                ))}
                <th className="text-center p-2 text-sm font-semibold text-foreground border-b">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {gradosConMateria.map(grado => {
                const promediosPeriodo = [1, 2, 3, 4].map(p => {
                  const notasGradoPeriodo = notasMateria.filter(n => n.grado === grado && n.periodo === p);
                  return notasGradoPeriodo.length > 0
                    ? Math.round((notasGradoPeriodo.reduce((sum, n) => sum + n.nota, 0) / notasGradoPeriodo.length) * 100) / 100
                    : null;
                });
                const promedioGrado = promediosPorGrado.find(g => g.grado === grado)?.promedio || 0;

                return (
                  <tr key={grado} className="hover:bg-muted/30">
                    <td className="p-2 text-sm font-medium text-foreground border-b">{grado}</td>
                    {promediosPeriodo.map((prom, idx) => (
                      <td key={idx} className="text-center p-2 border-b">
                        {prom !== null ? (
                          <span 
                            className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                              prom < 3 ? 'bg-red-100 text-red-700' :
                              prom < 4 ? 'bg-amber-100 text-amber-700' :
                              prom <= 4.5 ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            }`}
                          >
                            {prom.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ))}
                    <td className="text-center p-2 border-b">
                      <span 
                        className={`inline-block px-2 py-1 rounded text-sm font-bold ${
                          promedioGrado < 3 ? 'bg-red-200 text-red-800' :
                          promedioGrado < 4 ? 'bg-amber-200 text-amber-800' :
                          promedioGrado <= 4.5 ? 'bg-blue-200 text-blue-800' :
                          'bg-green-200 text-green-800'
                        }`}
                      >
                        {promedioGrado.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
