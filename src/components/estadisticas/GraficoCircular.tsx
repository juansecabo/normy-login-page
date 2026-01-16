import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { DistribucionDesempeno } from "@/hooks/useEstadisticas";

interface GraficoCircularProps {
  titulo: string;
  distribucion: DistribucionDesempeno;
  altura?: number;
}

const COLORES = {
  bajo: "#EF4444",
  basico: "#F59E0B", 
  alto: "#3B82F6",
  superior: "#10B981"
};

const LABELS = {
  bajo: "Bajo (0-2.9)",
  basico: "Básico (3.0-3.9)",
  alto: "Alto (4.0-4.5)",
  superior: "Superior (4.6-5.0)"
};

export const GraficoCircular = ({
  titulo,
  distribucion,
  altura = 300
}: GraficoCircularProps) => {
  const datos = [
    { nombre: LABELS.bajo, valor: distribucion.bajo, color: COLORES.bajo },
    { nombre: LABELS.basico, valor: distribucion.basico, color: COLORES.basico },
    { nombre: LABELS.alto, valor: distribucion.alto, color: COLORES.alto },
    { nombre: LABELS.superior, valor: distribucion.superior, color: COLORES.superior }
  ].filter(d => d.valor > 0);

  const total = distribucion.bajo + distribucion.basico + distribucion.alto + distribucion.superior;

  if (total === 0) {
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
        <PieChart>
          <Pie
            data={datos}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ nombre, percent }) => `${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="valor"
          >
            {datos.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => [
              `${value} estudiantes (${((value / total) * 100).toFixed(1)}%)`, 
              name
            ]}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
