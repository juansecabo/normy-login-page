import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface ComentarioModalReadOnlyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreEstudiante: string;
  nombreActividad: string;
  comentario: string | null;
  nombreProfesor?: string;
}

const ComentarioModalReadOnly = ({
  open,
  onOpenChange,
  nombreEstudiante,
  nombreActividad,
  comentario,
  nombreProfesor,
}: ComentarioModalReadOnlyProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            Comentario - {nombreEstudiante}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{nombreActividad}</p>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {nombreProfesor && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <User className="w-4 h-4" />
              <span>Profesor(a): <span className="font-medium text-foreground">{nombreProfesor}</span></span>
            </div>
          )}
          {comentario ? (
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              {comentario}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              No hay comentario registrado
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComentarioModalReadOnly;
