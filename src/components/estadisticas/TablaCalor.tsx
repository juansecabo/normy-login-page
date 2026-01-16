import { useMemo } from "react";

interface DatoCalor {
  estudiante: string;
  [materia: string]: string | number;
}

interface TablaCalorProps {
  titulo: string;
  datos: DatoCalor[];
  materias: string[];
  altura?: number;
}

const getColorPorNota = (nota: number): string => {
  if (nota === 0) return "bg-gray-100 text-gray-400";
  if (nota < 3.0) return "bg-red-100 text-red-700";
  if (nota < 4.0) return "bg-amber-100 text-amber-700";
  if (nota <= 4.5) return "bg-blue-100 text-blue-700";
  return "bg-green-100 text-green-700";
};

export const TablaCalor = ({
  titulo,
  datos,
  materias,
  altura = 400
}: TablaCalorProps) => {
  const materiasCortas = useMemo(() => {
    return materias.map(m => {
      if (m.length > 12) {
        return m.substring(0, 10) + "...";
      }
      return m;
    });
  }, [materias]);

  if (datos.length === 0 || materias.length === 0) {
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
      
      {/* Leyenda */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-red-100 rounded"></span>
          <span className="text-muted-foreground">Bajo (&lt;3.0)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-amber-100 rounded"></span>
          <span className="text-muted-foreground">Básico (3.0-3.9)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-blue-100 rounded"></span>
          <span className="text-muted-foreground">Alto (4.0-4.5)</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 bg-green-100 rounded"></span>
          <span className="text-muted-foreground">Superior (&gt;4.5)</span>
        </span>
      </div>

      <div className="overflow-auto" style={{ maxHeight: altura }}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-card">
            <tr>
              <th className="text-left p-1 font-medium text-muted-foreground border-b min-w-[120px]">
                Estudiante
              </th>
              {materiasCortas.map((mat, idx) => (
                <th 
                  key={idx} 
                  className="text-center p-1 font-medium text-muted-foreground border-b min-w-[50px]"
                  title={materias[idx]}
                >
                  {mat}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, idx) => (
              <tr key={idx} className="hover:bg-muted/50">
                <td className="p-1 font-medium text-foreground border-b truncate max-w-[150px]" title={fila.estudiante}>
                  {fila.estudiante}
                </td>
                {materias.map((mat, matIdx) => {
                  const nota = typeof fila[mat] === "number" ? fila[mat] as number : 0;
                  return (
                    <td 
                      key={matIdx} 
                      className={`text-center p-1 border-b font-medium ${getColorPorNota(nota)}`}
                    >
                      {nota > 0 ? nota.toFixed(1) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
