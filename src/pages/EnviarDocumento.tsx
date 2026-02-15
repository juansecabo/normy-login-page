import { useEffect, useState, useRef } from "react";
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
import { Loader2, FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL =
  "https://n8n.srv966880.hstgr.cloud/webhook/af44e992-4372-48ce-b661-73019d6cab9d";

const NIVELES_GRADOS: Record<string, string[]> = {
  Preescolar: ["Prejardín", "Jardín", "Transición"],
  Primaria: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  Secundaria: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  Media: ["Décimo", "Undécimo"],
};

const SALONES = ["1", "2", "3", "4", "5", "6"];

const EnviarDocumento = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [remitente, setRemitente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Destinatarios state
  const [perfil, setPerfil] = useState("");
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");

  // Archivo y mensaje
  const [archivo, setArchivo] = useState<File | null>(null);
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
    let texto = perfil;

    if (!nivel || nivel === "Todos") {
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

  const canSend = perfil && archivo;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArchivo(file);
    }
  };

  const handleRemoveFile = () => {
    setArchivo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleEnviar = async () => {
    setShowConfirm(false);
    setEnviando(true);

    try {
      if (!archivo) throw new Error("No se seleccionó archivo");

      // 1. Subir archivo a Supabase Storage
      const timestamp = Date.now();
      // Sanitizar nombre: quitar acentos y caracteres especiales
      const nombreLimpio = archivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${timestamp}_${nombreLimpio}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(fileName, archivo);

      if (uploadError) {
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      // 2. Obtener URL pública
      const { data: urlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(fileName);

      const archivoUrl = urlData.publicUrl;

      // 3. Enviar al webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remitente,
          destinatarios: destinatariosTexto,
          mensaje: mensaje.trim(),
          archivo_url: archivoUrl,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      toast({
        title: "Documento enviado",
        description: "El documento se está enviando por WhatsApp.",
      });

      // Limpiar formulario
      setPerfil("");
      setNivel("");
      setGrado("");
      setSalon("");
      setArchivo(null);
      setMensaje("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error enviando documento:", error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "Error",
        description: errorMsg,
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
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate(backLink)} className="text-primary hover:underline">Inicio</button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Enviar Documento</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Enviar Documento
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

          {/* Archivo */}
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold text-foreground">Archivo</h3>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
            />
            {archivo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                <FileUp className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{archivo.name}</span>
                <span className="text-xs shrink-0">
                  ({(archivo.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={handleRemoveFile}
                  className="text-destructive hover:text-destructive/80 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Mensaje (opcional) */}
          <div className="space-y-2 mb-6">
            <h3 className="text-lg font-semibold text-foreground">
              Mensaje <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
            </h3>
            <Textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Escribe un mensaje para acompañar el documento..."
              rows={4}
            />
          </div>

          {/* Botón enviar */}
          <button
            disabled={!canSend || enviando}
            onClick={() => setShowConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FileUp className="w-5 h-5" />
                Enviar documento
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
                  <span className="font-medium text-foreground">Archivo:</span>{" "}
                  {archivo?.name}
                </p>
                {mensaje.trim() && (
                  <>
                    <p>
                      <span className="font-medium text-foreground">Mensaje:</span>
                    </p>
                    <p className="whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {mensaje}
                    </p>
                  </>
                )}
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

export default EnviarDocumento;
