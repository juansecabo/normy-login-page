import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export type TipoNotificacion = 
  | "actividad_individual" 
  | "periodo_completo" 
  | "definitiva" 
  | "nota_individual";

interface NotificacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoNotificacion: TipoNotificacion;
  descripcion: string;
  cantidadPadres: number;
  onConfirmar: () => Promise<void>;
}

const NotificacionModal = ({
  open,
  onOpenChange,
  tipoNotificacion,
  descripcion,
  cantidadPadres,
  onConfirmar,
}: NotificacionModalProps) => {
  const [enviando, setEnviando] = useState(false);

  const handleConfirmar = async () => {
    setEnviando(true);
    try {
      await onConfirmar();
    } finally {
      setEnviando(false);
      onOpenChange(false);
    }
  };

  const getTituloTipo = () => {
    switch (tipoNotificacion) {
      case "actividad_individual":
        return "Notificar actividad";
      case "periodo_completo":
        return "Notificar período completo";
      case "definitiva":
        return "Notificar definitiva";
      case "nota_individual":
        return "Notificar a padre";
      default:
        return "Confirmar notificación";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿{getTituloTipo()}?</AlertDialogTitle>
          <AlertDialogDescription>
            Se enviará notificación a {cantidadPadres} {cantidadPadres === 1 ? "padre" : "padres"} sobre:
            <br />
            <span className="font-medium text-foreground">{descripcion}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmar}
            disabled={enviando}
            className="bg-primary hover:bg-primary/90"
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar notificación"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default NotificacionModal;
