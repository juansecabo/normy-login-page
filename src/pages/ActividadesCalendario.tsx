import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Pencil, Trash2, ArrowLeft, Calendar } from "lucide-react";
import { getSession } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ActividadCalendario {
  column_id: number;
  id_profesor: string;
  Nombres: string;
  Apellidos: string;
  Materia: string;
  Grado: string;
  Salon: string;
  Descripción: string;
  fecha_de_presentacion: string;
}

const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const formatearFecha = (date: Date): string => {
  const dia = diasSemana[date.getDay()];
  const fechaFormateada = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} (${dia})`;
  return fechaFormateada;
};

const parsearFecha = (fechaStr: string): Date | null => {
  // Formato esperado: "DD/MM/YYYY (día)"
  const match = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
};

const ActividadesCalendario = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [profesorCodigo, setProfesorCodigo] = useState("");
  const [profesorIdReal, setProfesorIdReal] = useState(""); // ID real (celular) del profesor
  const [profesorNombres, setProfesorNombres] = useState("");
  const [profesorApellidos, setProfesorApellidos] = useState("");
  const [actividades, setActividades] = useState<ActividadCalendario[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>(undefined);
  const [actividadEditando, setActividadEditando] = useState<ActividadCalendario | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actividadAEliminar, setActividadAEliminar] = useState<ActividadCalendario | null>(null);

  useEffect(() => {
    const inicializar = async () => {
      const session = getSession();
      
      if (!session.codigo) {
        navigate('/');
        return;
      }

      setProfesorCodigo(session.codigo);
      setProfesorNombres(session.nombres);
      setProfesorApellidos(session.apellidos);

      // Buscar el ID real (celular) del profesor desde la tabla Internos
      const { data: profesorData, error: profesorError } = await supabase
        .from('Internos')
        .select('id')
        .eq('codigo', session.codigo)
        .single();

      if (profesorError || !profesorData) {
        console.error('Error obteniendo ID del profesor:', profesorError);
        toast({
          title: "Error",
          description: "No se pudo obtener la información del profesor",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      const idProfesor = profesorData.id;
      setProfesorIdReal(idProfesor);

      const storedMateria = localStorage.getItem("materiaSeleccionada");
      const storedGrado = localStorage.getItem("gradoSeleccionado");
      const storedSalon = localStorage.getItem("salonSeleccionado");

      if (!storedMateria || !storedGrado || !storedSalon) {
        navigate('/dashboard');
        return;
      }

      setMateriaSeleccionada(storedMateria);
      setGradoSeleccionado(storedGrado);
      setSalonSeleccionado(storedSalon);

      await cargarActividades(idProfesor, storedMateria, storedGrado, storedSalon);
    };

    inicializar();
  }, [navigate]);

  const cargarActividades = async (
    profIdReal: string,
    materia: string,
    grado: string,
    salon: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Calendario Actividades')
        .select('*')
        .eq('id_profesor', profIdReal)
        .eq('Materia', materia)
        .eq('Grado', grado)
        .eq('Salon', salon)
        .order('fecha_de_presentacion', { ascending: true });

      if (error) {
        console.error('Error cargando actividades:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar las actividades",
          variant: "destructive",
        });
      } else {
        setActividades(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVolverNotas = () => {
    navigate("/tabla-notas");
  };

  const handleAbrirModalCrear = () => {
    setDescripcion("");
    setFechaSeleccionada(undefined);
    setActividadEditando(null);
    setModalOpen(true);
  };

  const handleAbrirModalEditar = (actividad: ActividadCalendario) => {
    setDescripcion(actividad.Descripción);
    const fecha = parsearFecha(actividad.fecha_de_presentacion);
    setFechaSeleccionada(fecha || undefined);
    setActividadEditando(actividad);
    setModalOpen(true);
  };

  const handleGuardarActividad = async () => {
    if (!descripcion.trim()) {
      toast({
        title: "Error",
        description: "La descripción es requerida",
        variant: "destructive",
      });
      return;
    }

    if (!fechaSeleccionada) {
      toast({
        title: "Error",
        description: "La fecha de presentación es requerida",
        variant: "destructive",
      });
      return;
    }

    // Validar que la fecha no sea pasada
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSeleccionadaNormalizada = new Date(fechaSeleccionada);
    fechaSeleccionadaNormalizada.setHours(0, 0, 0, 0);

    if (fechaSeleccionadaNormalizada < hoy) {
      toast({
        title: "Fecha inválida",
        description: "No se puede asignar actividades en fechas pasadas. Por favor selecciona una fecha actual o futura.",
        variant: "destructive",
      });
      return;
    }

    const fechaFormateada = formatearFecha(fechaSeleccionada);

    try {
      if (actividadEditando) {
        // Editar actividad existente
        const { error } = await supabase
          .from('Calendario Actividades')
          .update({
            Descripción: descripcion.trim(),
            fecha_de_presentacion: fechaFormateada,
          })
          .eq('column_id', actividadEditando.column_id);

        if (error) {
          console.error('Error editando actividad:', error);
          toast({
            title: "Error",
            description: "No se pudo editar la actividad",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Actividad actualizada",
          description: "La actividad se ha actualizado correctamente",
        });
      } else {
        // Crear nueva actividad
        const { error } = await supabase
          .from('Calendario Actividades')
          .insert({
            id_profesor: profesorIdReal,
            Nombres: profesorNombres,
            Apellidos: profesorApellidos,
            Materia: materiaSeleccionada,
            Grado: gradoSeleccionado,
            Salon: salonSeleccionado,
            Descripción: descripcion.trim(),
            fecha_de_presentacion: fechaFormateada,
          });

        if (error) {
          console.error('Error creando actividad:', error);
          toast({
            title: "Error",
            description: "No se pudo crear la actividad",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Actividad creada",
          description: "La actividad se ha creado correctamente",
        });
      }

      setModalOpen(false);
      await cargarActividades(profesorIdReal, materiaSeleccionada, gradoSeleccionado, salonSeleccionado);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  const handleConfirmarEliminar = (actividad: ActividadCalendario) => {
    setActividadAEliminar(actividad);
    setDeleteDialogOpen(true);
  };

  const handleEliminarActividad = async () => {
    if (!actividadAEliminar) return;

    try {
      const { error } = await supabase
        .from('Calendario Actividades')
        .delete()
        .eq('column_id', actividadAEliminar.column_id);

      if (error) {
        console.error('Error eliminando actividad:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar la actividad",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Actividad eliminada",
        description: "La actividad se ha eliminado correctamente",
      });

      setDeleteDialogOpen(false);
      setActividadAEliminar(null);
      await cargarActividades(profesorIdReal, materiaSeleccionada, gradoSeleccionado, salonSeleccionado);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Header de página */}
        <div className="bg-card rounded-lg shadow-soft p-4 md:p-6 mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                Actividades Asignadas
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {materiaSeleccionada} - {gradoSeleccionado} {salonSeleccionado}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                onClick={handleVolverNotas}
                className="gap-2 text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Notas
              </Button>
              <Button
                onClick={handleAbrirModalCrear}
                className="gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Agregar Actividad
              </Button>
            </div>
          </div>
        </div>

        {/* Lista de actividades */}
        <div className="bg-card rounded-lg shadow-soft p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando actividades...
            </div>
          ) : actividades.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No hay actividades asignadas</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Haz clic en "Agregar Actividad" para crear una nueva
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {actividades.map((actividad) => (
                <div
                  key={actividad.column_id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-foreground font-medium">
                        {actividad.Descripción}
                      </p>
                      <p className="text-sm text-primary mt-1 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {actividad.fecha_de_presentacion}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAbrirModalEditar(actividad)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleConfirmarEliminar(actividad)}
                        className="gap-1"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear/Editar Actividad */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actividadEditando ? "Editar Actividad" : "Agregar Actividad"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción de la actividad</Label>
              <Textarea
                id="descripcion"
                placeholder="Ej: Entrega de taller sobre fracciones"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value.slice(0, 500))}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground text-right">
                {descripcion.length}/500 caracteres
              </p>
            </div>

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
                    {fechaSeleccionada ? formatearFecha(fechaSeleccionada) : "Seleccionar fecha"}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarActividad}>
              Guardar Actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              {actividadAEliminar && (
                <>
                  ¿Estás seguro de que deseas eliminar la actividad "{actividadAEliminar.Descripción}"?
                  <br />
                  Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarActividad}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActividadesCalendario;
