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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSession, isRectorOrCoordinador } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Loader2, FileUp, X, Clock, Trash2, Search } from "lucide-react";
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

interface DocumentoEnviado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
}

const EnviarDocumento = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [remitente, setRemitente] = useState("");
  const [codigoRemitente, setCodigoRemitente] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Destinatarios state
  const [perfil, setPerfil] = useState("");
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");
  const [estudiante, setEstudiante] = useState("");
  const [estudiantes, setEstudiantes] = useState<{ codigo: string; nombre: string }[]>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);

  // Archivo y mensaje
  const [archivo, setArchivo] = useState<File | null>(null);
  const [mensaje, setMensaje] = useState("");

  // Historial
  const [historial, setHistorial] = useState<DocumentoEnviado[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const session = getSession();
    if (!session.codigo) {
      navigate("/");
      return;
    }
    setRemitente(`${session.cargo} ${session.nombres} ${session.apellidos}`);
    setCodigoRemitente(session.codigo!);
  }, [navigate]);

  // Fetch estudiantes cuando cambia grado + salón
  useEffect(() => {
    if (!grado || !salon || salon === "Todos") {
      setEstudiantes([]);
      setEstudiante("");
      return;
    }
    const fetchEstudiantes = async () => {
      setLoadingEstudiantes(true);
      const { data } = await supabase
        .from("Estudiantes")
        .select("codigo_estudiantil, apellidos_estudiante, nombre_estudiante")
        .eq("grado_estudiante", grado)
        .eq("salon_estudiante", salon)
        .order("apellidos_estudiante", { ascending: true })
        .order("nombre_estudiante", { ascending: true });
      setEstudiantes(
        data?.map((e) => ({
          codigo: e.codigo_estudiantil,
          nombre: `${e.apellidos_estudiante} ${e.nombre_estudiante}`,
        })) || []
      );
      setLoadingEstudiantes(false);
    };
    fetchEstudiantes();
  }, [grado, salon]);

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    const { data } = await supabase
      .from("Comunicados")
      .select("*")
      .eq("codigo_remitente", codigoRemitente)
      .eq("tipo", "documento")
      .order("fecha", { ascending: false });
    setHistorial((data as DocumentoEnviado[]) || []);
    setLoadingHistorial(false);
  };

  const handleEliminar = async () => {
    if (!deleteId) return;
    await supabase.from("Comunicados").delete().eq("id", deleteId);
    setHistorial((prev) => prev.filter((c) => c.id !== deleteId));
    setDeleteId(null);
  };

  // Reset dependientes al cambiar perfil
  const handlePerfilChange = (value: string) => {
    setPerfil(value);
    setNivel("");
    setGrado("");
    setSalon("");
    setEstudiante("");
  };

  const handleNivelChange = (value: string) => {
    setNivel(value);
    setGrado("");
    setSalon("");
    setEstudiante("");
  };

  const handleGradoChange = (value: string) => {
    setGrado(value);
    setSalon("");
    setEstudiante("");
  };

  const handleSalonChange = (value: string) => {
    setSalon(value);
    setEstudiante("");
  };

  // Construir texto de destinatarios
  const buildDestinatarios = (): string => {
    if (estudiante && estudiante !== "Todos") {
      if (perfil === "Estudiantes") {
        return `Estudiante con código ${estudiante}`;
      } else if (perfil === "Padres de familia") {
        return `Padres de estudiante con código ${estudiante}`;
      } else {
        return `Estudiante y padres de estudiante con código ${estudiante}`;
      }
    }

    let texto = perfil;

    if (!nivel || nivel === "Todos") {
      return texto;
    }

    if (!grado) {
      texto += ` de ${nivel}`;
      return texto;
    }

    texto += ` de ${grado}`;

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

      // 4. Guardar en historial
      await supabase.from("Comunicados").insert({
        remitente,
        codigo_remitente: codigoRemitente,
        destinatarios: destinatariosTexto,
        perfil: perfil || null,
        nivel: (nivel && nivel !== "Todos") ? nivel : null,
        grado: grado || null,
        salon: (salon && salon !== "Todos") ? salon : null,
        codigo_estudiantil: (estudiante && estudiante !== "Todos") ? estudiante : null,
        mensaje: mensaje.trim() || archivo.name,
        tipo: "documento",
      });

      toast({
        title: "Documento enviado",
        description: "El documento se está enviando por WhatsApp.",
      });

      // Limpiar solo archivo y mensaje, mantener destinatarios
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

  const formatFecha = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
          <Tabs defaultValue="enviar" onValueChange={(v) => { if (v === "historial") fetchHistorial(); }}>
            <TabsList className="flex w-full">
              <TabsTrigger value="enviar" className="flex-1 text-xs md:text-sm px-2 md:px-3">Enviar Documento</TabsTrigger>
              <TabsTrigger value="historial" className="flex-1 text-xs md:text-sm px-2 md:px-3">Documentos Enviados</TabsTrigger>
            </TabsList>

            <TabsContent value="enviar">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center mt-4">
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
                    <Label>Salón</Label>
                    <Select value={salon} onValueChange={handleSalonChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el salón" />
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

                {/* Estudiante - solo si se eligió salón específico */}
                {salon && salon !== "Todos" && (
                  <div className="space-y-2">
                    <Label>Estudiante</Label>
                    <Select value={estudiante} onValueChange={setEstudiante}>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingEstudiantes ? "Cargando..." : "Todos los estudiantes"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Todos">Todos</SelectItem>
                        {estudiantes.map((e) => (
                          <SelectItem key={e.codigo} value={e.codigo}>
                            {e.nombre}
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
            </TabsContent>

            <TabsContent value="historial">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center mt-4">
                Documentos Enviados
              </h2>

              {loadingHistorial ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cargando...
                </div>
              ) : historial.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No has enviado documentos aún.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por destinatario o mensaje..."
                      className="pl-9"
                    />
                  </div>
                  {historial.filter((c) => {
                    if (!busqueda.trim()) return true;
                    const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const term = normalize(busqueda);
                    return normalize(c.destinatarios).includes(term) || normalize(c.mensaje).includes(term);
                  }).map((c) => (
                    <div key={c.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatFecha(c.fecha)}
                        </div>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium text-foreground">Para:</span>{" "}
                        {c.destinatarios}
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                        {c.mensaje}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Diálogo de confirmación */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envío</DialogTitle>
            <DialogDescription asChild>
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
                    <p className="whitespace-pre-wrap bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                      {mensaje}
                    </p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setShowConfirm(false)} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
            <button onClick={handleEnviar} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Enviar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar documento</DialogTitle>
            <DialogDescription>
              Este documento se eliminará permanentemente y no se podrá recuperar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
            <button onClick={handleEliminar} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90">
              Eliminar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnviarDocumento;
