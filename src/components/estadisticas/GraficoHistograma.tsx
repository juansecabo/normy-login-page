import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface GraficoHistogramaProps {
  titulo: string;
  datos: number[];
  altura?: number;
}

// Rangos para el histograma de notas
const rangos = [
  { min: 0, max: 1, label: "0-1", color: "#EF4444" },
  { min: 1, max: 2, label: "1-2", color: "#EF4444" },
  { min: 2, max: 3, label: "2-3", color: "#EF4444" },
  { min: 3, max: 3.5, label: "3-3.5", color: "#F59E0B" },
  { min: 3.5, max: 4, label: "3.5-4", color: "#F59E0B" },
  { min: 4, max: 4.5, label: "4-4.5", color: "#3B82F6" },
  { min: 4.5, max: 5, label: "4.5-5", color: "#10B981" },
];

export const GraficoHistograma = ({
  titulo,
  datos,
  altura = 300
}: GraficoHistogramaProps) => {
  // Calcular la distribución
  const distribucion = rangos.map(rango => {
    const cantidad = datos.filter(nota => nota >= rango.min && nota < rango.max).length;
    return {
      rango: rango.label,
      cantidad,
      color: rango.color,
      porcentaje: datos.length > 0 ? Math.round((cantidad / datos.length) * 100) : 0
    };
  });

  // Ajustar el último rango para incluir 5.0
  if (datos.length > 0) {
    const notasCinco = datos.filter(nota => nota === 5).length;
    distribucion[distribucion.length - 1].cantidad += notasCinco;
    distribucion[distribucion.length - 1].porcentaje = 
      Math.round((distribucion[distribucion.length - 1].cantidad / datos.length) * 100);
  }

  if (datos.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-4">{titulo}</h4>
        <div className="flex items-center justify-center h-[200px] text-muted-foreground">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
      <h4 className="font-semibold text-foreground mb-4">{titulo}</h4>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={distribucion} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="rango" 
            tick={{ fontSize: 12 }} 
            label={{ value: 'Rango de Notas', position: 'insideBottom', offset: -5, fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string, props: any) => [
              `${value} estudiantes (${props.payload.porcentaje}%)`,
              "Cantidad"
            ]}
          />
          <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
            {distribucion.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
