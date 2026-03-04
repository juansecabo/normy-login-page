import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { subirArchivo } from "@/lib/storage";
import { getSession, isProfesor } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Calendar, Paperclip, FileText, X, Loader2 } from "lucide-react";
import { es } from "date-fns/locale";

const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const formatearFecha = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const mostrarFecha = (fechaStr: string): string => {
  const matchISO = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!matchISO) return fechaStr;
  const [, year, month, day] = matchISO;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const dia = diasSemana[date.getDay()];
  return `${day}/${month}/${year} (${dia})`;
};

const TIPOS_ACTIVIDAD = ["Tarea", "Evaluación", "Taller", "Quiz", "Otro"] as const;

interface AsignacionRow {
  'Asignatura(s)': string[] | string[][];
  'Grado(s)': string[] | string[][];
  'Salon(es)': string[] | string[][];
}

const ProgramarActividad = () => {
  const navigate = useNavigate();

  // Profesor info
  const [profesorIdReal, setProfesorIdReal] = useState("");
  const [profesorNombres, setProfesorNombres] = useState("");
  const [profesorApellidos, setProfesorApellidos] = useState("");
  const [profesorCargo, setProfesorCargo] = useState("");

  // Asignaciones raw data
  const [asignaciones, setAsignaciones] = useState<AsignacionRow[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);

  // Cascade selectors
  const [asignaturas, setAsignaturas] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<string[]>([]);

  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");

  // Form fields
  const [descripcion, setDescripcion] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([]);

  // Submit state
  const [guardando, setGuardando] = useState(false);

  // Load profesor data and asignaciones
  useEffect(() => {
    const inicializar = async () => {
      const session = getSession();

      if (!session.codigo || !isProfesor()) {
        navigate("/");
        return;
      }

      setProfesorNombres(session.nombres || "");
      setProfesorApellidos(session.apellidos || "");
      setProfesorCargo(session.cargo || "Profesor(a)");

      try {
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          toast({ title: "Error", description: "No se pudo obtener la información del profesor", variant: "destructive" });
          navigate('/dashboard');
          return;
        }

        setProfesorIdReal(profesor.id);

        const { data: asignacionesData, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Asignatura(s)", "Grado(s)", "Salon(es)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignacionesData) {
          setLoadingAsignaciones(false);
          return;
        }

        setAsignaciones(asignacionesData as AsignacionRow[]);

        // Extract unique asignaturas
        const todasAsignaturas = asignacionesData
          .flatMap(a => (a as AsignacionRow)['Asignatura(s)'] || [])
          .flat() as string[];
        const asignaturasUnicas = [...new Set(todasAsignaturas)].sort((a, b) => a.localeCompare(b, 'es'));
        setAsignaturas(asignaturasUnicas);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoadingAsignaciones(false);
      }
    };

    inicializar();
  }, [navigate]);

  // When asignatura changes → compute grados
  useEffect(() => {
    if (!asignaturaSeleccionada) {
      setGrados([]);
      return;
    }

    const asignacionesFiltradas = asignaciones.filter(a => {
      const asigs = (a['Asignatura(s)'] || []).flat() as string[];
      return asigs.includes(asignaturaSeleccionada);
    });

    const todosGrados = asignacionesFiltradas
      .flatMap(a => a['Grado(s)'] || [])
      .flat() as string[];
    setGrados([...new Set(todosGrados)]);
  }, [asignaturaSeleccionada, asignaciones]);

  // When grado changes → compute salones
  useEffect(() => {
    if (!asignaturaSeleccionada || !gradoSeleccionado) {
      setSalones([]);
      return;
    }

    const asignacionesFiltradas = asignaciones.filter(a => {
      const asigs = (a['Asignatura(s)'] || []).flat() as string[];
      const grads = (a['Grado(s)'] || []).flat() as string[];
      return asigs.includes(asignaturaSeleccionada) && grads.includes(gradoSeleccionado);
    });

    const todosSalones = asignacionesFiltradas
      .flatMap(a => a['Salon(es)'] || [])
      .flat() as string[];
    setSalones([...new Set(todosSalones)]);
  }, [gradoSeleccionado, asignaturaSeleccionada, asignaciones]);

  // Cascade reset handlers
  const handleAsignaturaChange = (value: string) => {
    setAsignaturaSeleccionada(value);
    setGradoSeleccionado("");
    setSalonSeleccionado("");
    setTipoSeleccionado("");
    setDescripcion("");
    setFechaSeleccionada(undefined);
    setArchivosSeleccionados([]);
  };

  const handleGradoChange = (value: string) => {
    setGradoSeleccionado(value);
    setSalonSeleccionado("");
    setTipoSeleccionado("");
    setDescripcion("");
    setFechaSeleccionada(undefined);
    setArchivosSeleccionados([]);
  };

  const handleSalonChange = (value: string) => {
    setSalonSeleccionado(value);
    setTipoSeleccionado("");
    setDescripcion("");
    setFechaSeleccionada(undefined);
    setArchivosSeleccionados([]);
  };

  const handleTipoChange = (value: string) => {
    setTipoSeleccionado(value);
    setDescripcion("");
    setFechaSeleccionada(undefined);
    setArchivosSeleccionados([]);
  };

  const handleProgramar = async () => {
    if (!descripcion.trim()) {
      toast({ title: "Error", description: "La descripción es requerida", variant: "destructive" });
      return;
    }
    if (!fechaSeleccionada) {
      toast({ title: "Error", description: "La fecha de presentación es requerida", variant: "destructive" });
      return;
    }

    // Validate date is not in the past
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaNorm = new Date(fechaSeleccionada);
    fechaNorm.setHours(0, 0, 0, 0);
    if (fechaNorm < hoy) {
      toast({ title: "Fecha inválida", description: "No se puede programar actividades en fechas pasadas.", variant: "destructive" });
      return;
    }

    setGuardando(true);

    try {
      // Upload files
      let archivoUrlFinal: string | null = null;
      if (archivosSeleccionados.length > 0) {
        const urls: string[] = [];
        for (const file of archivosSeleccionados) {
          const resultado = await subirArchivo(file);
          urls.push(resultado.url);
        }
        archivoUrlFinal = urls.join('\n');
      }

      // Build description with type prefix
      let descripcionFinal = descripcion.trim();
      if (tipoSeleccionado && tipoSeleccionado !== "Otro") {
        descripcionFinal = `${tipoSeleccionado}: ${descripcionFinal}`;
      }

      const fechaFormateada = formatearFecha(fechaSeleccionada);

      // Insert into Calendario Actividades
      const insertData: Record<string, unknown> = {
        id_profesor: profesorIdReal,
        Nombres: profesorNombres,
        Apellidos: profesorApellidos,
        Asignatura: asignaturaSeleccionada,
        Grado: gradoSeleccionado,
        Salon: salonSeleccionado,
        Descripción: descripcionFinal,
        fecha_de_presentacion: fechaFormateada,
      };
      if (archivoUrlFinal) {
        insertData.archivo_url = archivoUrlFinal;
      }

      const { error } = await supabase
        .from('Calendario Actividades')
        .insert(insertData);

      if (error) {
        console.error('Error creando actividad:', error);
        toast({ title: "Error", description: "No se pudo programar la actividad", variant: "destructive" });
        setGuardando(false);
        return;
      }

      // Fire & forget webhook notification
      try {
        await fetch('https://n8n.srv966880.hstgr.cloud/webhook/notificar-actividades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profesor_nombre: `${profesorNombres} ${profesorApellidos}`.trim(),
            profesor_cargo: profesorCargo,
            grado: gradoSeleccionado,
            salon: salonSeleccionado,
            asignatura: asignaturaSeleccionada,
            descripcion: descripcionFinal,
            fecha: mostrarFecha(fechaFormateada),
            ...(archivoUrlFinal ? { archivo_url: archivoUrlFinal } : {}),
          }),
        });
      } catch (err) {
        console.error('Error enviando notificación:', err);
      }

      toast({
        title: "Actividad programada",
        description: "La actividad se ha programado correctamente y se notificó a estudiantes y padres",
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: "Error", description: error.message || "Error de conexión", variant: "destructive" });
    } finally {
      setGuardando(false);
    }
  };

  const selectClassName = "w-full p-3 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 max-w-2xl mx-auto mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Programar Actividad</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-2xl mx-auto space-y-5">
          <h2 className="text-xl font-bold text-foreground text-center mb-2">
            Programar Actividad
          </h2>

          {loadingAsignaciones ? (
            <div className="text-center text-muted-foreground py-8">Cargando asignaturas...</div>
          ) : asignaturas.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No tienes asignaturas asignadas</div>
          ) : (
            <>
              {/* 1. Asignatura */}
              <div className="space-y-2">
                <Label>Asignatura</Label>
                <select
                  value={asignaturaSeleccionada}
                  onChange={(e) => handleAsignaturaChange(e.target.value)}
                  className={selectClassName}
                >
                  <option value="">Seleccionar asignatura</option>
                  {asignaturas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* 2. Grado */}
              {asignaturaSeleccionada && (
                <div className="space-y-2">
                  <Label>Grado</Label>
                  <select
                    value={gradoSeleccionado}
                    onChange={(e) => handleGradoChange(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Seleccionar grado</option>
                    {grados.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Salón */}
              {gradoSeleccionado && (
                <div className="space-y-2">
                  <Label>Salón</Label>
                  <select
                    value={salonSeleccionado}
                    onChange={(e) => handleSalonChange(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Seleccionar salón</option>
                    {salones.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4. Tipo */}
              {salonSeleccionado && (
                <div className="space-y-2">
                  <Label>Tipo de actividad</Label>
                  <select
                    value={tipoSeleccionado}
                    onChange={(e) => handleTipoChange(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Seleccionar tipo</option>
                    {TIPOS_ACTIVIDAD.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 5-7. Description, Date, Files — appear after selecting type */}
              {tipoSeleccionado && (
                <>
                  {/* 5. Descripción */}
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Ej: Resolver ejercicios de la página 45"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value.slice(0, 500))}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {descripcion.length}/500 caracteres
                    </p>
                  </div>

                  {/* 6. Fecha */}
                  <div className="space-y-2">
                    <Label>Fecha de presentación</Label>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !fechaSeleccionada && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {fechaSeleccionada ? mostrarFecha(formatearFecha(fechaSeleccionada)) : "Seleccionar fecha"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={fechaSeleccionada}
                          onSelect={(date) => {
                            setFechaSeleccionada(date);
                            setPopoverOpen(false);
                          }}
                          disabled={(date) => {
                            const hoy = new Date();
                            hoy.setHours(0, 0, 0, 0);
                            return date < hoy;
                          }}
                          initialFocus
                          locale={es}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* 7. Archivos */}
                  <div className="space-y-2">
                    <Label>Archivos adjuntos (opcional)</Label>
                    {archivosSeleccionados.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate flex-1">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setArchivosSeleccionados(prev => prev.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-destructive"
                          title="Quitar archivo"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center gap-2 p-3 border-2 border-dashed border-muted-foreground/30 rounded-md cursor-pointer hover:border-primary/50 transition-colors">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {archivosSeleccionados.length > 0 ? 'Agregar otro archivo' : 'Seleccionar archivo'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setArchivosSeleccionados(prev => [...prev, file]);
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>

                  {/* 8. Botón Programar */}
                  <Button
                    onClick={handleProgramar}
                    disabled={guardando || !descripcion.trim() || !fechaSeleccionada}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {guardando ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Programando...
                      </>
                    ) : (
                      "Programar"
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProgramarActividad;
