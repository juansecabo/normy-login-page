import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "@/hooks/useSession";

interface CambiarContrasenaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CambiarContrasenaModal = ({ open, onOpenChange }: CambiarContrasenaModalProps) => {
  const [contrasenaActual, setContrasenaActual] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [showActual, setShowActual] = useState(false);
  const [showNueva, setShowNueva] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setContrasenaActual("");
    setNuevaContrasena("");
    setConfirmarContrasena("");
    setShowActual(false);
    setShowNueva(false);
    setShowConfirmar(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleGuardar = async () => {
    const session = getSession();
    if (!session.codigo) return;

    if (!contrasenaActual.trim()) {
      toast({ title: "Error", description: "Ingresa tu contraseña actual", variant: "destructive" });
      return;
    }
    if (!nuevaContrasena.trim()) {
      toast({ title: "Error", description: "Ingresa la nueva contraseña", variant: "destructive" });
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Obtener datos del usuario para verificar contraseña actual
      const { data: usuario, error: fetchError } = await supabase
        .from("Internos")
        .select("codigo, contrasena")
        .eq("codigo", parseInt(session.codigo))
        .maybeSingle();

      if (fetchError || !usuario) {
        toast({ title: "Error", description: "No se pudo verificar el usuario", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Verificar contraseña actual: si contrasena es null, usar codigo
      const contrasenaEsperada = usuario.contrasena ?? String(usuario.codigo);
      if (contrasenaActual !== contrasenaEsperada) {
        toast({ title: "Error", description: "La contraseña actual no es correcta", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase
        .from("Internos")
        .update({ contrasena: nuevaContrasena })
        .eq("codigo", parseInt(session.codigo));

      if (updateError) {
        toast({ title: "Error", description: "No se pudo guardar la contraseña", variant: "destructive" });
        setLoading(false);
        return;
      }

      toast({ title: "Contraseña actualizada", description: "Tu contraseña ha sido cambiada exitosamente" });
      handleClose(false);
    } catch {
      toast({ title: "Error", description: "Ocurrió un error inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const PasswordField = ({
    label,
    value,
    onChange,
    show,
    onToggle,
    placeholder,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
  }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">{label}</label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10 h-11"
          style={{ fontFamily: show ? "inherit" : "'Dotsfont', sans-serif", fontSize: show ? "inherit" : "1.25rem", letterSpacing: show ? "inherit" : "0.15em" }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <PasswordField
            label="Contraseña actual"
            value={contrasenaActual}
            onChange={setContrasenaActual}
            show={showActual}
            onToggle={() => setShowActual(!showActual)}
            placeholder="Ingresa tu contraseña actual"
          />
          <PasswordField
            label="Nueva contraseña"
            value={nuevaContrasena}
            onChange={setNuevaContrasena}
            show={showNueva}
            onToggle={() => setShowNueva(!showNueva)}
            placeholder="Ingresa la nueva contraseña"
          />
          <PasswordField
            label="Confirmar nueva contraseña"
            value={confirmarContrasena}
            onChange={setConfirmarContrasena}
            show={showConfirmar}
            onToggle={() => setShowConfirmar(!showConfirmar)}
            placeholder="Repite la nueva contraseña"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleGuardar} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CambiarContrasenaModal;
