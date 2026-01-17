import { LucideIcon } from "lucide-react";

interface TarjetaResumenProps {
  titulo: string;
  valor: string | number;
  subtitulo?: string;
  icono: LucideIcon;
  color?: "primary" | "success" | "warning" | "danger";
  onClick?: () => void;
}

const colorClasses = {
  primary: "bg-blue-100 text-blue-600",
  success: "bg-green-100 text-green-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-600"
};

// Helper para obtener color basado en rendimiento académico
// Superior (4.5-5): success (verde), Alto (4-4.49): primary (azul), Básico (3-3.99): warning (naranja), Bajo (<3): danger (rojo)
export const getColorPorRendimiento = (valor: number): "primary" | "success" | "warning" | "danger" => {
  if (valor >= 4.5) return "success";
  if (valor >= 4) return "primary";
  if (valor >= 3) return "warning";
  return "danger";
};

export const TarjetaResumen = ({
  titulo,
  valor,
  subtitulo,
  icono: Icon,
  color = "primary",
  onClick
}: TarjetaResumenProps) => {
  return (
    <div 
      className={`bg-card rounded-lg shadow-soft p-4 border border-border ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{valor}</p>
          {subtitulo && (
            <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
