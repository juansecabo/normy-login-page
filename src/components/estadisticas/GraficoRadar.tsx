import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface DataItem {
  materia: string;
  estudiante: number;
  promedio?: number;
}

interface GraficoRadarProps {
  titulo: string;
  datos: DataItem[];
  nombreEstudiante?: string;
  altura?: number;
}

export const GraficoRadar = ({
  titulo,
  datos,
  nombreEstudiante = "Estudiante",
  altura = 350
}: GraficoRadarProps) => {
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

  const tienePromedioComparativo = datos.some(d => d.promedio !== undefined);

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
      <h4 className="font-semibold text-foreground mb-4">{titulo}</h4>
      <ResponsiveContainer width="100%" height={altura}>
        <RadarChart data={datos} margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="materia" 
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            tick={{ fontSize: 10 }}
            tickCount={6}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [value.toFixed(2), ""]}
          />
          <Radar
            name={nombreEstudiante}
            dataKey="estudiante"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.5}
            strokeWidth={2}
          />
          {tienePromedioComparativo && (
            <Radar
              name="Promedio Salón"
              dataKey="promedio"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
