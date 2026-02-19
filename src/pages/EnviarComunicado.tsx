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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSession, isRectorOrCoordinador } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Loader2, Send, Clock, Trash2, Search, Users, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL =
  "https://n8n.srv966880.hstgr.cloud/webhook/ae459f1c-7e94-45f4-9909-aaddc82a7552";

const WEBHOOK_MASIVO_URL =
  "https://n8n.srv966880.hstgr.cloud/webhook/masivo-personalizado";

const NIVELES_GRADOS: Record<string, string[]> = {
  Preescolar: ["Prejardín", "Jardín", "Transición"],
  Primaria: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  Secundaria: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  Media: ["Décimo", "Undécimo"],
};

const SALONES = ["1", "2", "3", "4", "5", "6"];

interface ComunicadoEnviado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
}

const EnviarComunicado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Mensaje
  const [mensaje, setMensaje] = useState("");

  // Masivo personalizado
  const [datosMasivos, setDatosMasivos] = useState("");
  const [plantillaMasivo, setPlantillaMasivo] = useState("");
  const [filasParsed, setFilasParsed] = useState<Record<string, string>[]>([]);
  const [headersMasivo, setHeadersMasivo] = useState<string[]>([]);
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [showConfirmMasivo, setShowConfirmMasivo] = useState(false);

  // Historial
  const [historial, setHistorial] = useState<ComunicadoEnviado[]>([]);
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
      .order("fecha", { ascending: false });
    setHistorial((data as ComunicadoEnviado[]) || []);
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
      // Estudiante específico - pasar código para búsqueda directa
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
          codigo_remitente: codigoRemitente,
          perfil: perfil || null,
          nivel: (nivel && nivel !== "Todos") ? nivel : null,
          grado: grado || null,
          salon: (salon && salon !== "Todos") ? salon : null,
          codigo_estudiantil: (estudiante && estudiante !== "Todos") ? estudiante : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      toast({
        title: "Comunicado enviado",
        description: "El comunicado se está enviando por WhatsApp.",
      });

      // Limpiar solo el mensaje, mantener destinatarios
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

  // Parsear datos pegados del Excel (tab-separated)
  const parsearDatos = (texto: string) => {
    setDatosMasivos(texto);
    const lineas = texto.split("\n").filter((l) => l.trim());
    if (lineas.length < 2) {
      setHeadersMasivo([]);
      setFilasParsed([]);
      return;
    }
    const headers = lineas[0].split("\t").map((h) => h.trim());
    setHeadersMasivo(headers);
    const filas = lineas.slice(1).map((linea) => {
      const valores = linea.split("\t").map((v) => v.trim());
      const fila: Record<string, string> = {};
      headers.forEach((h, i) => {
        fila[h] = valores[i] || "";
      });
      return fila;
    });
    setFilasParsed(filas);
  };

  // Resolver plantilla para una fila
  const resolverPlantilla = (plantilla: string, fila: Record<string, string>) => {
    return plantilla.replace(/\{([^}]+)\}/g, (match, key) => fila[key.trim()] ?? match);
  };

  const handleEnviarMasivo = async () => {
    setShowConfirmMasivo(false);
    setEnviandoMasivo(true);

    try {
      if (!headersMasivo.length || !filasParsed.length) {
        throw new Error("No hay datos para enviar");
      }
      if (!plantillaMasivo.trim()) {
        throw new Error("Escribe una plantilla de mensaje");
      }

      // Primera columna = código del estudiante
      const colCodigo = headersMasivo[0];
      const mensajes = filasParsed.map((fila) => ({
        codigo: fila[colCodigo],
        mensaje: resolverPlantilla(plantillaMasivo, fila),
      }));

      const response = await fetch(WEBHOOK_MASIVO_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remitente,
          codigo_remitente: codigoRemitente,
          mensajes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      // Guardar resumen en Comunicados
      await supabase.from("Comunicados").insert({
        remitente,
        codigo_remitente: codigoRemitente,
        destinatarios: `Envío masivo personalizado a ${mensajes.length} estudiantes`,
        mensaje: plantillaMasivo.trim(),
      });

      toast({
        title: "Envío masivo iniciado",
        description: `Se están enviando ${mensajes.length} mensajes personalizados por WhatsApp.`,
      });

      setDatosMasivos("");
      setPlantillaMasivo("");
      setFilasParsed([]);
      setHeadersMasivo([]);
    } catch (error) {
      console.error("Error enviando masivo:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo enviar. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setEnviandoMasivo(false);
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
            <span className="text-foreground font-medium">Enviar Comunicado</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto">
          <Tabs defaultValue="enviar" onValueChange={(v) => { if (v === "historial") fetchHistorial(); }}>
            <TabsList className="flex w-full">
              <TabsTrigger value="enviar" className="flex-1 text-xs md:text-sm px-2 md:px-3">Enviar</TabsTrigger>
              <TabsTrigger value="masivo" className="flex-1 text-xs md:text-sm px-2 md:px-3">Masivo</TabsTrigger>
              <TabsTrigger value="historial" className="flex-1 text-xs md:text-sm px-2 md:px-3">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="enviar">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center mt-4">
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
            </TabsContent>

            <TabsContent value="masivo">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center mt-4">
                Envío Masivo Personalizado
              </h2>

              {/* Paso 1: Pegar datos */}
              <div className="space-y-2 mb-6">
                <Label className="text-base font-semibold">1. Pegar datos de Excel</Label>
                <p className="text-xs text-muted-foreground">
                  Copia las columnas de Excel y pégalas aquí. La primera fila debe ser los encabezados y la primera columna debe ser el código del estudiante.
                </p>
                <Textarea
                  value={datosMasivos}
                  onChange={(e) => parsearDatos(e.target.value)}
                  placeholder={"codigo\tusuario\tcontraseña\n12345\test12345\tPass123!\n12346\test12346\tPass456!"}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>

              {/* Tabla de vista previa */}
              {filasParsed.length > 0 && (
                <div className="mb-6 space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{filasParsed.length} filas detectadas</span>
                  </div>
                  <div className="border rounded-md overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          {headersMasivo.map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filasParsed.map((fila, i) => (
                          <tr key={i} className="border-t">
                            {headersMasivo.map((h) => (
                              <td key={h} className="px-3 py-1.5 whitespace-nowrap">{fila[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Paso 2: Plantilla */}
              <div className="space-y-2 mb-6">
                <Label className="text-base font-semibold">2. Plantilla del mensaje</Label>
                <p className="text-xs text-muted-foreground">
                  Usa los nombres de las columnas entre llaves como placeholders. Ej: {"{usuario}"}, {"{contraseña}"}
                </p>
                {headersMasivo.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {headersMasivo.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setPlantillaMasivo((prev) => prev + `{${h}}`)}
                        className="px-2 py-0.5 text-xs bg-muted rounded-md hover:bg-muted/80 font-mono"
                      >
                        {`{${h}}`}
                      </button>
                    ))}
                  </div>
                )}
                <Textarea
                  value={plantillaMasivo}
                  onChange={(e) => setPlantillaMasivo(e.target.value)}
                  placeholder="Hola, tu usuario es {usuario} y tu contraseña es {contraseña}. No la compartas con nadie."
                  rows={4}
                />
              </div>

              {/* Vista previa del primer mensaje */}
              {plantillaMasivo && filasParsed.length > 0 && (
                <div className="mb-6 space-y-2">
                  <Label className="text-base font-semibold">Vista previa (primer estudiante)</Label>
                  <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">
                    {resolverPlantilla(plantillaMasivo, filasParsed[0])}
                  </div>
                </div>
              )}

              {/* Botón enviar */}
              <button
                disabled={!filasParsed.length || !plantillaMasivo.trim() || enviandoMasivo}
                onClick={() => setShowConfirmMasivo(true)}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-lg bg-gradient-to-r from-green-500 to-green-600 text-white font-bold text-lg transition-all duration-200 hover:shadow-md hover:scale-[1.01] hover:from-green-600 hover:to-green-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {enviandoMasivo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Enviar {filasParsed.length} mensajes personalizados
                  </>
                )}
              </button>
            </TabsContent>

            <TabsContent value="historial">
              <h2 className="text-2xl font-bold text-foreground mb-6 text-center mt-4">
                Comunicados Enviados
              </h2>

              {loadingHistorial ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cargando...
                </div>
              ) : historial.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No has enviado comunicados aún.
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
                  <span className="font-medium text-foreground">Mensaje:</span>
                </p>
                <p className="whitespace-pre-wrap bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                  {mensaje}
                </p>
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

      {/* Diálogo de confirmación masivo */}
      <Dialog open={showConfirmMasivo} onOpenChange={setShowConfirmMasivo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar envío masivo</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Se enviarán <span className="font-bold text-foreground">{filasParsed.length} mensajes personalizados</span> por WhatsApp.
                </p>
                <p>
                  <span className="font-medium text-foreground">Ejemplo (primer estudiante):</span>
                </p>
                {filasParsed.length > 0 && plantillaMasivo && (
                  <p className="whitespace-pre-wrap bg-muted p-3 rounded-md max-h-48 overflow-y-auto">
                    {resolverPlantilla(plantillaMasivo, filasParsed[0])}
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setShowConfirmMasivo(false)} className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted">
              Cancelar
            </button>
            <button onClick={handleEnviarMasivo} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              Enviar {filasParsed.length} mensajes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar comunicado</DialogTitle>
            <DialogDescription>
              Este comunicado se eliminará permanentemente y no se podrá recuperar.
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

export default EnviarComunicado;
