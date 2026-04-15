import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSession, isAdmin, puedeAccederDashboard } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Loader2, Send, Clock, Trash2, Search, Users, Eye, Paperclip, X, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const WEBHOOK_URL =
  "https://n8n.notasnormy.com/webhook/ae459f1c-7e94-45f4-9909-aaddc82a7552";

const WEBHOOK_RECTOR_URL =
  "https://n8n.notasnormy.com/webhook/enviar-comunicado-rector-coordinadores";

type PerfilKey = 'Estudiantes' | 'Padres' | 'Profesores' | 'Coordinadores' | 'Rector' | 'Administrativos' | 'Secretaria';

const PERFILES_UI: { key: PerfilKey; label: string }[] = [
  { key: 'Estudiantes', label: 'Estudiantes' },
  { key: 'Padres', label: 'Padres de familia' },
  { key: 'Profesores', label: 'Profesores' },
  { key: 'Coordinadores', label: 'Coordinadores' },
  { key: 'Rector', label: 'Rector' },
  { key: 'Administrativos', label: 'Administrativos' },
  { key: 'Secretaria', label: 'Secretaria General' },
];

const WEBHOOK_MASIVO_URL =
  "https://n8n.notasnormy.com/webhook/masivo-personalizado";

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
  archivo_url: string | null;
  fecha: string;
}

const getCleanFilename = (url: string) =>
  decodeURIComponent((url.split('/').pop() || '').replace(/^\d+-[a-z0-9]+-/, ''));

const getFileExt = (url: string) =>
  (url.split('.').pop() || '').toLowerCase().split('?')[0];

const handleVerArchivoHist = (url: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const ext = getFileExt(url);
  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
  if (officeExts.includes(ext)) {
    window.open(`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`, '_blank');
  } else {
    window.open(url, '_blank');
  }
};

const handleDescargarArchivoHist = async (url: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = getCleanFilename(url);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
};

const EnviarComunicado = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [remitente, setRemitente] = useState("");
  const [codigoRemitente, setCodigoRemitente] = useState("");
  const [cargo, setCargo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Destinatarios state — perfiles (multi-select con checkboxes)
  const [perfilesMarcados, setPerfilesMarcados] = useState<Record<PerfilKey, boolean>>({
    Estudiantes: false, Padres: false, Profesores: false,
    Coordinadores: false, Rector: false, Administrativos: false, Secretaria: false,
  });

  // Filtros compartidos para Estudiantes/Padres/Profesores
  const [nivel, setNivel] = useState("");
  const [grado, setGrado] = useState("");
  const [salon, setSalon] = useState("");

  // Selección específica de internos (por cargo)
  const [listaCoordinadores, setListaCoordinadores] = useState<{ id: string; nombre: string }[]>([]);
  const [listaAdministrativos, setListaAdministrativos] = useState<{ id: string; nombre: string }[]>([]);
  const [listaSecretarias, setListaSecretarias] = useState<{ id: string; nombre: string }[]>([]);
  const [coordinadoresSeleccionados, setCoordinadoresSeleccionados] = useState<string[]>([]);
  const [administrativosSeleccionados, setAdministrativosSeleccionados] = useState<string[]>([]);
  const [secretariasSeleccionadas, setSecretariasSeleccionadas] = useState<string[]>([]);
  const [loadingInternos, setLoadingInternos] = useState(false);

  // Mensaje y archivos
  const [mensaje, setMensaje] = useState("");
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const [selectedHistorial, setSelectedHistorial] = useState<ComunicadoEnviado | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo) {
      navigate("/");
      return;
    }
    setRemitente(`${session.cargo} ${session.nombres} ${session.apellidos}`);
    setCodigoRemitente(session.codigo!);
    setCargo(session.cargo || "");
  }, [navigate]);

  // Cargar las 3 listas de internos (Coordinadores, Administrativos, Secretaria General)
  useEffect(() => {
    const necesitaLista =
      perfilesMarcados.Coordinadores || perfilesMarcados.Administrativos || perfilesMarcados.Secretaria;
    if (!necesitaLista) return;
    if (listaCoordinadores.length || listaAdministrativos.length || listaSecretarias.length) return;

    const fetchInternos = async () => {
      setLoadingInternos(true);
      const { data } = await supabase
        .from("Internos")
        .select("codigo, nombres, apellidos, cargo")
        .in("cargo", ["Coordinador(a)", "Administrativo(a)", "Secretaria General"])
        .order("apellidos", { ascending: true })
        .order("nombres", { ascending: true });
      const rows = data || [];
      setListaCoordinadores(rows.filter(r => r.cargo === "Coordinador(a)").map(r => ({ id: String(r.codigo), nombre: `${r.apellidos} ${r.nombres}` })));
      setListaAdministrativos(rows.filter(r => r.cargo === "Administrativo(a)").map(r => ({ id: String(r.codigo), nombre: `${r.apellidos} ${r.nombres}` })));
      setListaSecretarias(rows.filter(r => r.cargo === "Secretaria General").map(r => ({ id: String(r.codigo), nombre: `${r.apellidos} ${r.nombres}` })));
      setLoadingInternos(false);
    };
    fetchInternos();
  }, [perfilesMarcados, listaCoordinadores.length, listaAdministrativos.length, listaSecretarias.length]);

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

  const togglePerfil = (key: PerfilKey) => {
    setPerfilesMarcados(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleInterno = (lista: string[], id: string, setter: (v: string[]) => void) => {
    setter(lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]);
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

  const buildSufijoGrado = (): string => {
    if (!nivel || nivel === "Todos") return "";
    if (!grado) return ` de ${nivel}`;
    let s = ` de ${grado}`;
    if (salon && salon !== "Todos") s += ` ${salon}`;
    return s;
  };

  const listaANombres = (ids: string[], lista: { id: string; nombre: string }[]) =>
    ids.map(id => lista.find(x => x.id === id)?.nombre).filter(Boolean) as string[];

  const buildDestinatarios = (): string => {
    const sel = perfilesMarcados;
    const sufijo = buildSufijoGrado();
    const partes: string[] = [];

    if (sel.Estudiantes) partes.push(`Estudiantes${sufijo}`);
    if (sel.Padres) partes.push(`Padres de familia${sufijo}`);
    if (sel.Profesores) partes.push(`Profesores${sufijo}`);

    if (sel.Coordinadores) {
      if (coordinadoresSeleccionados.length === 0) partes.push("Coordinadores");
      else listaANombres(coordinadoresSeleccionados, listaCoordinadores).forEach(n => partes.push(`Coordinador(a) ${n}`));
    }
    if (sel.Rector) partes.push("Rector");
    if (sel.Administrativos) {
      if (administrativosSeleccionados.length === 0) partes.push("Administrativos");
      else listaANombres(administrativosSeleccionados, listaAdministrativos).forEach(n => partes.push(`Administrativo(a) ${n}`));
    }
    if (sel.Secretaria) {
      if (secretariasSeleccionadas.length === 0) partes.push("Secretaria General");
      else listaANombres(secretariasSeleccionadas, listaSecretarias).forEach(n => partes.push(`Secretaria ${n}`));
    }

    return partes.join(" y ");
  };

  const destinatariosTexto = buildDestinatarios();
  const algunPerfilMarcado = Object.values(perfilesMarcados).some(Boolean);

  const canSend = algunPerfilMarcado && (mensaje.trim() || archivosSeleccionados.length > 0);

  const handleEnviar = async () => {
    setShowConfirm(false);
    setEnviando(true);

    try {
      // Upload files if any
      let archivoUrl: string | null = null;
      if (archivosSeleccionados.length > 0) {
        const urls: string[] = [];
        for (const archivo of archivosSeleccionados) {
          const timestamp = Date.now();
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

          const { data: urlData } = supabase.storage
            .from("documentos")
            .getPublicUrl(fileName);

          urls.push(urlData.publicUrl);
        }
        archivoUrl = urls.join("\n");
      }

      const webhookUrl = ['Rector', 'Coordinador(a)'].includes(cargo) ? WEBHOOK_RECTOR_URL : WEBHOOK_URL;
      const response = await fetch(webhookUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remitente,
          destinatarios: destinatariosTexto,
          mensaje: mensaje.trim(),
          codigo_remitente: codigoRemitente,
          perfil: null,
          nivel: (nivel && nivel !== "Todos") ? nivel : null,
          grado: grado || null,
          salon: (salon && salon !== "Todos") ? salon : null,
          codigo_estudiantil: null,
          ...(archivoUrl ? { archivo_url: archivoUrl } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      toast({
        title: "Comunicado enviado",
        description: "El comunicado se está enviando por WhatsApp.",
      });

      // Limpiar mensaje y archivos, mantener destinatarios
      setMensaje("");
      setArchivosSeleccionados([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error enviando comunicado:", error);
      const errorMsg = error instanceof Error ? error.message : "No se pudo enviar el comunicado. Intenta de nuevo.";
      toast({
        title: "Error",
        description: errorMsg,
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

  const backLink = isAdmin() ? "/dashboard-admin" : puedeAccederDashboard() ? "/dashboard-rector" : "/dashboard";

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
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6 text-center">Envía un mensaje o documento a cualquier grupo o individuo dentro de la institución.</p>

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

                {/* Perfiles (multi-check) */}
                <div className="space-y-2">
                  <Label>Perfiles</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERFILES_UI.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 cursor-pointer select-none text-sm">
                        <input
                          type="checkbox"
                          checked={perfilesMarcados[p.key]}
                          onChange={() => togglePerfil(p.key)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <span>{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {(perfilesMarcados.Estudiantes || perfilesMarcados.Padres || perfilesMarcados.Profesores) && (
                  <div className="border-l-2 border-primary/30 pl-4 space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Filtros aplican a Estudiantes, Padres y Profesores marcados
                    </p>
                    <div className="space-y-2">
                      <Label>Nivel</Label>
                      <ResponsiveSelect
                        value={nivel}
                        onValueChange={handleNivelChange}
                        placeholder="Selecciona el nivel"
                        options={[
                          { value: "Todos", label: "Todos los niveles" },
                          ...Object.keys(NIVELES_GRADOS).map((n) => ({ value: n, label: n })),
                        ]}
                      />
                    </div>
                    {nivel && nivel !== "Todos" && (
                      <div className="space-y-2">
                        <Label>Grado</Label>
                        <ResponsiveSelect
                          value={grado}
                          onValueChange={handleGradoChange}
                          placeholder="Selecciona el grado"
                          options={(NIVELES_GRADOS[nivel] || []).map((g) => ({ value: g, label: g }))}
                        />
                      </div>
                    )}
                    {grado && (
                      <div className="space-y-2">
                        <Label>Salón</Label>
                        <ResponsiveSelect
                          value={salon}
                          onValueChange={setSalon}
                          placeholder="Selecciona el salón"
                          options={[
                            { value: "Todos", label: "Todos" },
                            ...SALONES.map((s) => ({ value: s, label: s })),
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}

                {[
                  { on: perfilesMarcados.Coordinadores, label: "Coordinadores", lista: listaCoordinadores, sel: coordinadoresSeleccionados, setter: setCoordinadoresSeleccionados },
                  { on: perfilesMarcados.Administrativos, label: "Administrativos", lista: listaAdministrativos, sel: administrativosSeleccionados, setter: setAdministrativosSeleccionados },
                  { on: perfilesMarcados.Secretaria, label: "Secretaria General", lista: listaSecretarias, sel: secretariasSeleccionadas, setter: setSecretariasSeleccionadas },
                ].filter(x => x.on).map((grupo) => (
                  <div key={grupo.label} className="border-l-2 border-primary/30 pl-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {grupo.label} específicos (vacío = todos)
                    </p>
                    {loadingInternos && grupo.lista.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Cargando...</p>
                    ) : grupo.lista.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay personas con este cargo</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {grupo.lista.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={grupo.sel.includes(p.id)}
                              onChange={() => toggleInterno(grupo.sel, p.id, grupo.setter)}
                              className="w-4 h-4 accent-primary cursor-pointer"
                            />
                            <span>{p.nombre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {algunPerfilMarcado && (
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

              {/* Archivos adjuntos */}
              <div className="space-y-2 mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Archivos adjuntos <span className="text-sm font-normal text-muted-foreground">(opcional)</span>
                </h3>
                {archivosSeleccionados.length > 0 && (
                  <div className="space-y-2">
                    {archivosSeleccionados.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm overflow-hidden">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={() => setArchivosSeleccionados(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-muted-foreground hover:text-destructive shrink-0 ml-auto"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  Adjuntar archivos
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setArchivosSeleccionados(prev => [...prev, ...Array.from(files)]);
                    }
                    e.target.value = '';
                  }}
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
                    <div key={c.id} className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedHistorial(c)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatFecha(c.fecha)}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
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
                      {c.mensaje && (
                        <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                          {c.mensaje}
                        </p>
                      )}
                      {c.archivo_url && c.archivo_url.split("\n").filter(u => u.trim()).map((url, i) => (
                        <div key={i} className="mt-2 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm text-foreground truncate">{getCleanFilename(url)}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={(e) => handleVerArchivoHist(url, e)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1.5">
                              <Eye className="h-4 w-4" /> Ver
                            </button>
                            <button onClick={(e) => handleDescargarArchivoHist(url, e)} className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 flex items-center gap-1.5">
                              <Download className="h-4 w-4" /> Descargar
                            </button>
                          </div>
                        </div>
                      ))}
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
                {archivosSeleccionados.length > 0 && (
                  <p>
                    <span className="font-medium text-foreground">Archivos adjuntos:</span>{" "}
                    {archivosSeleccionados.length} archivo{archivosSeleccionados.length > 1 ? "s" : ""}
                  </p>
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

      {/* Modal para ver comunicado completo */}
      <Dialog open={!!selectedHistorial} onOpenChange={(open) => !open && setSelectedHistorial(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedHistorial && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  Para: {selectedHistorial.destinatarios}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatFecha(selectedHistorial.fecha)}
                </div>
              </DialogHeader>
              {selectedHistorial.mensaje && (
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {selectedHistorial.mensaje}
                </p>
              )}
              {selectedHistorial.archivo_url && selectedHistorial.archivo_url.split("\n").filter(u => u.trim()).map((url, i) => (
                <div key={i} className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate">{getCleanFilename(url)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => handleVerArchivoHist(url, e)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 flex items-center gap-1.5">
                      <Eye className="h-4 w-4" /> Ver
                    </button>
                    <button onClick={(e) => handleDescargarArchivoHist(url, e)} className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md hover:bg-green-100 flex items-center gap-1.5">
                      <Download className="h-4 w-4" /> Descargar
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnviarComunicado;
