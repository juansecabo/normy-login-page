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
  | "periodo_completo_definitivo"
  | "periodo_parcial"
  | "definitiva_completa"
  | "definitiva_parcial"
  | "nota_individual";

interface NotificacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoNotificacion: TipoNotificacion;
  descripcion: string;
  nombreEstudiante?: string; // Solo para notificación individual
  onConfirmar: () => Promise<void>;
}

const NotificacionModal = ({
  open,
  onOpenChange,
  tipoNotificacion,
  descripcion,
  nombreEstudiante,
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
      case "periodo_completo_definitivo":
        return "Notificar REPORTE FINAL del período";
      case "periodo_parcial":
        return "Notificar REPORTE PARCIAL del período";
      case "definitiva_completa":
        return "Notificar REPORTE FINAL ANUAL";
      case "definitiva_parcial":
        return "Notificar REPORTE PARCIAL ANUAL";
      case "nota_individual":
        return "Notificar a padre(s)";
      default:
        return "Confirmar notificación";
    }
  };

  const getMensaje = () => {
    if (tipoNotificacion === "nota_individual" && nombreEstudiante) {
      return (
        <>
          Se enviará notificación al/los padre(s) de <span className="font-medium text-foreground">{nombreEstudiante}</span> sobre:
        </>
      );
    }
    return "Se enviará notificación a los padres de familia sobre:";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿{getTituloTipo()}?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              {getMensaje()}
              <br />
              <span className="font-medium text-foreground">{descripcion}</span>
            </div>
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
