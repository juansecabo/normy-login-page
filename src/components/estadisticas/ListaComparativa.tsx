import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ItemLista {
  nombre: string;
  valor: number;
  extra?: string;
}

interface ListaComparativaProps {
  titulo: string;
  items: ItemLista[];
  tipo?: "mejor" | "peor" | "neutral";
  mostrarPosicion?: boolean;
  icono?: React.ReactNode;
}

const getColorPorRendimiento = (valor: number): string => {
  if (valor < 3.0) return "text-red-600";
  if (valor < 4.0) return "text-amber-600";
  if (valor <= 4.5) return "text-blue-600";
  return "text-green-600";
};

const getBgPorRendimiento = (valor: number): string => {
  if (valor < 3.0) return "bg-red-50";
  if (valor < 4.0) return "bg-amber-50";
  if (valor <= 4.5) return "bg-blue-50";
  return "bg-green-50";
};

export const ListaComparativa = ({ 
  titulo, 
  items, 
  tipo = "neutral",
  mostrarPosicion = false,
  icono
}: ListaComparativaProps) => {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
        <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          {icono}
          {titulo}
        </h4>
        <p className="text-muted-foreground text-sm text-center py-4">
          Aún no hay datos disponibles para esta métrica
        </p>
      </div>
    );
  }

  const getTipoIcon = () => {
    if (tipo === "mejor") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (tipo === "peor") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="bg-card rounded-lg shadow-soft p-4 border border-border">
      <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        {icono || getTipoIcon()}
        {titulo}
      </h4>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div 
            key={idx} 
            className={`flex justify-between items-center p-2.5 rounded-lg ${getBgPorRendimiento(item.valor)}`}
          >
            <div className="flex items-center gap-2">
              {mostrarPosicion && (
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {idx + 1}
                </span>
              )}
              <div>
                <span className="text-sm font-medium text-foreground">{item.nombre}</span>
                {item.extra && (
                  <p className="text-xs text-muted-foreground">{item.extra}</p>
                )}
              </div>
            </div>
            <span className={`text-sm font-bold ${getColorPorRendimiento(item.valor)}`}>
              {item.valor.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
