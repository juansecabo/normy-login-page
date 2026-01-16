import { useState } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DetalleIncompleto {
  tipo: "nota_faltante" | "porcentaje_incompleto";
  descripcion: string;
  materia?: string;
  estudiante?: string;
  actividad?: string;
}

interface IndicadorCompletitudProps {
  completo: boolean;
  detalles: DetalleIncompleto[];
  nivel: string; // "Institución", "Grado", "Salón", "Estudiante", "Materia"
}

export const IndicadorCompletitud = ({ completo, detalles, nivel }: IndicadorCompletitudProps) => {
  const [open, setOpen] = useState(false);

  if (completo) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
        <CheckCircle className="w-4 h-4" />
        <span>Completo</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium hover:bg-amber-200 transition-colors cursor-pointer"
      >
        <AlertCircle className="w-4 h-4" />
        <span>Incompleto</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Detalles de incompletitud - {nivel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {detalles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No se encontraron detalles específicos.</p>
            ) : (
              <ul className="space-y-2">
                {detalles.slice(0, 20).map((detalle, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm p-2 bg-muted rounded-md">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{detalle.descripcion}</span>
                  </li>
                ))}
                {detalles.length > 20 && (
                  <li className="text-sm text-muted-foreground italic">
                    ...y {detalles.length - 20} más
                  </li>
                )}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export type { DetalleIncompleto };