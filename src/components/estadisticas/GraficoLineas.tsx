import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataItem {
  [key: string]: string | number;
}

interface LineaConfig {
  dataKey: string;
  nombre: string;
  color: string;
}

interface GraficoLineasProps {
  titulo: string;
  datos: DataItem[];
  xAxisKey: string;
  lineas: LineaConfig[];
  altura?: number;
}

export const GraficoLineas = ({
  titulo,
  datos,
  xAxisKey,
  lineas,
  altura = 300
}: GraficoLineasProps) => {
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
        <LineChart data={datos} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number) => [value.toFixed(2), ""]}
          />
          {lineas.length > 1 && <Legend />}
          {lineas.map(linea => (
            <Line 
              key={linea.dataKey}
              type="monotone" 
              dataKey={linea.dataKey} 
              name={linea.nombre}
              stroke={linea.color} 
              strokeWidth={2}
              dot={{ fill: linea.color, strokeWidth: 2 }}
              activeDot={{ r: 6, fill: linea.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
