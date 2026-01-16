import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DataItem {
  nombre: string;
  valor: number;
  [key: string]: string | number;
}

interface GraficoBarrasProps {
  titulo: string;
  datos: DataItem[];
  dataKey?: string;
  horizontal?: boolean;
  mostrarColoresPorRendimiento?: boolean;
  altura?: number;
}

const getColorPorRendimiento = (valor: number): string => {
  if (valor < 3.0) return "#EF4444"; // Rojo - Bajo
  if (valor < 4.0) return "#F59E0B"; // Amarillo - Básico
  if (valor <= 4.5) return "#3B82F6"; // Azul - Alto
  return "#10B981"; // Verde - Superior
};

export const GraficoBarras = ({
  titulo,
  datos,
  dataKey = "valor",
  horizontal = false,
  mostrarColoresPorRendimiento = true,
  altura = 300
}: GraficoBarrasProps) => {
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
        {horizontal ? (
          <BarChart data={datos} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={75} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [value.toFixed(2), "Promedio"]}
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {datos.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={mostrarColoresPorRendimiento ? getColorPorRendimiento(entry.valor) : "#16a34a"} 
                />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={datos} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="nombre" 
              tick={{ fontSize: 11 }} 
              angle={-45} 
              textAnchor="end"
              height={60}
            />
            <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value: number) => [value.toFixed(2), "Promedio"]}
            />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {datos.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={mostrarColoresPorRendimiento ? getColorPorRendimiento(entry.valor) : "#16a34a"} 
                />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
