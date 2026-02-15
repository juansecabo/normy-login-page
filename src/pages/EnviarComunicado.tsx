import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { getSession, isRectorOrCoordinador } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WEBHOOK_URL =
  "https://n8n.srv966880.hstgr.cloud/webhook/ae459f1c-7e94-45f4-9909-aaddc82a7552";

const NIVELES_GRADOS: Record<string, string[]> = {
  Preescolar: ["Prejardín", "Jardín", "Transición"],
  Primaria: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  Secundaria: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  Media: ["Décimo", "Undécimo"],
};

const SALONES = ["1", "2", "3", "4", "5", "6"];

const EnviarComunicado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [remitente, setRemitente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Destinatarios state
  const [perfil, setPerfil] = useState("");
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");

  // Mensaje
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session.codigo) {
      navigate("/");
      return;
    }
    setRemitente(`${session.cargo} ${session.nombres} ${session.apellidos}`);
  }, [navigate]);

  // Reset dependientes al cambiar perfil
  const handlePerfilChange = (value: string) => {
    setPerfil(value);
    setNivel("");
    setGrado("");
    setSalon("");
  };

  const handleNivelChange = (value: string) => {
    setNivel(value);
    setGrado("");
    setSalon("");
  };

  const handleGradoChange = (value: string) => {
    setGrado(value);
    setSalon("");
  };

  // Construir texto de destinatarios
  const buildDestinatarios = (): string => {
    let texto = perfil; // "Estudiantes", "Padres de familia" o "Estudiantes y Padres de familia"

    if (!nivel || nivel === "Todos") {
      // No se eligió nivel específico
      return texto;
    }

    texto += ` de ${nivel}`;

    if (!grado) return texto;

    texto += `, grado ${grado}`;

    if (salon && salon !== "Todos") {
      texto += ` ${salon}`;
    }

    return texto;
  };

  const destinatariosTexto = buildDestinatarios();

  const canSend = perfil && mensaje.trim();

  const handleEnviar = async () => {
    setShowConfirm(false);
    setEnviando(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remitente,
          destinatarios: destinatariosTexto,
          mensaje: mensaje.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      toast({
        title: "Comunicado enviado",
        description: "El comunicado se está enviando por WhatsApp.",
      });

      // Limpiar formulario
      setPerfil("");
      setNivel("");
      setGrado("");
      setSalon("");
      setMensaje("");
    } catch (error) {
      console.error("Error enviando comunicado:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el comunicado. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEnviando(false);
    }
  };

  const backLink = isRectorOrCoordinador() ? "/dashboard-rector" : "/dashboard";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink={backLink} />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Enviar Comunicado
          </h2>

          {/* Destinatarios */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Destinatarios
            </h3>

            {/* Perfil */}
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select value={perfil} onValueChange={handlePerfilChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estudiantes">Estudiantes</SelectItem>
                  <SelectItem value="Padres de familia">
                    Padres de familia
                  </SelectItem>
                  <SelectItem value="Estudiantes y Padres de familia">
                    Estudiantes y Padres de familia
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nivel */}
            {perfil && (
              <div className="space-y-2">
                <Label>Nivel</Label>
                <Select value={nivel} onValueChange={handleNivelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos los niveles</SelectItem>
                    {Object.keys(NIVELES_GRADOS).map((n) => (
                      <SelectItem key={n} value={n}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Grado - solo si se eligió un nivel específico */}
            {nivel && nivel !== "Todos" && (
              <div className="space-y-2">
                <Label>Grado</Label>
                <Select value={grado} onValueChange={handleGradoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el grado" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVELES_GRADOS[nivel]?.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Salón - solo si se eligió grado */}
            {grado && (
              <div className="space-y-2">
                <Label>Salón (opcional)</Label>
                <Select value={salon} onValueChange={setSalon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los salones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {SALONES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview de destinatarios */}
            {perfil && (
              <p className="text-sm text-muted-foreground">
                Destinatarios:{" "}
                <span className="font-medium text-foreground">
                  {destinatariosTexto}
                </span>
              </p>
            )}
          </div>

          {/* Mensaje */}
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold text-foreground">Mensaje</h3>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe el comunicado..."
              rows={6}
            />
          </div>

          {/* Botón enviar */}
          <button
            disabled={!canSend || enviando}
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:from-green-600 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar comunicado
              </>
            )}
          </button>
        </div>
      </main>

      {/* Diálogo de confirmación */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Remitente:</span>{" "}
                  {remitente}
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Destinatarios:
                  </span>{" "}
                  {destinatariosTexto}
                </p>
                <p>
                  <span className="font-medium text-foreground">Mensaje:</span>
                </p>
                <p className="whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {mensaje}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviar}>
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EnviarComunicado;
