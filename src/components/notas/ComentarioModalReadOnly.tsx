import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ComentarioModalReadOnlyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreEstudiante: string;
  nombreActividad: string;
  comentario: string | null;
}

const ComentarioModalReadOnly = ({
  open,
  onOpenChange,
  nombreEstudiante,
  nombreActividad,
  comentario,
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
        <div className="py-4">
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
