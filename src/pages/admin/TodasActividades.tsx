import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search, Calendar as CalendarIcon } from "lucide-react";
import { getSession, isAdmin } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Actividad {
  column_id: number;
  id_profesor: string;
  Nombres: string;
  Apellidos: string;
  Asignatura: string;
  Grado: string;
  Salon: string;
  Descripción: string;
  fecha_de_presentacion: string;
  archivo_url: string | null;
}

const formatearFecha = (date: Date): string => {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parsearFecha = (fechaStr: string): Date | null => {
  if (!fechaStr) return null;
  const iso = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const dmy = fechaStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) return new Date(+dmy[3], +dmy[2] - 1, +dmy[1]);
  return null;
};

const mostrarFecha = (fechaStr: string): string => {
  const d = parsearFecha(fechaStr);
  if (!d) return fechaStr;
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} (${dias[d.getDay()]})`;
};

const TodasActividades = () => {
  const navigate = useNavigate();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editing, setEditing] = useState<Actividad | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | undefined>();
  const [guardando, setGuardando] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session.codigo || !isAdmin()) {
      navigate("/");
      return;
    }
    cargar();
  }, [navigate]);

  const cargar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('Calendario Actividades')
      .select('*')
      .order('fecha_de_presentacion', { ascending: false });
    if (!error && data) setActividades(data as Actividad[]);
    setLoading(false);
  };

  const handleEditar = (a: Actividad) => {
    setEditing(a);
    setDescripcion(a.Descripción || "");
    setFechaSeleccionada(parsearFecha(a.fecha_de_presentacion) || undefined);
    setEditModalOpen(true);
  };

  const handleGuardar = async () => {
    if (!editing || !descripcion.trim() || !fechaSeleccionada) {
      toast({ title: "Error", description: "Completa descripción y fecha", variant: "destructive" });
      return;
    }
    setGuardando(true);
    const { error } = await supabase
      .from('Calendario Actividades')
      .update({
        Descripción: descripcion.trim(),
        fecha_de_presentacion: formatearFecha(fechaSeleccionada),
      })
      .eq('column_id', editing.column_id);
    setGuardando(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Actividad actualizada" });
    setEditModalOpen(false);
    setEditing(null);
    cargar();
  };

  const handleEliminar = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from('Calendario Actividades')
      .delete()
      .eq('column_id', deleteId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Actividad eliminada" });
    setDeleteId(null);
    cargar();
  };

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtradas = actividades.filter((a) => {
    if (!busqueda.trim()) return true;
    const t = normalize(busqueda);
    return [a.Nombres, a.Apellidos, a.Asignatura, a.Grado, a.Salon, a.Descripción].some(v =>
      v && normalize(String(v)).includes(t)
    );
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-admin" />
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-admin")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Todas las Actividades</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            Todas las Actividades
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Todas las actividades programadas por los profesores. Puedes editarlas o eliminarlas.
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por profesor, asignatura, grado, salón o descripción..."
              className="pl-9"
            />
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-8">Cargando...</p>
          ) : filtradas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay actividades.</p>
          ) : (
            <div className="space-y-3">
              {filtradas.map((a) => (
                <div key={a.column_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs text-muted-foreground">
                      📅 {mostrarFecha(a.fecha_de_presentacion)} · {a.Asignatura} · {a.Grado} {a.Salon}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEditar(a)}>
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteId(a.column_id)}>
                        <Trash2 className="w-4 h-4 mr-1" /> Eliminar
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Profesor(a):</span> {a.Nombres} {a.Apellidos}
                  </p>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                    {a.Descripción}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar actividad</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {editing.Asignatura} · {editing.Grado} {editing.Salon} · Profesor(a): {editing.Nombres} {editing.Apellidos}
              </div>
              <div className="space-y-2">
                <Label>Fecha de presentación</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {fechaSeleccionada
                        ? format(fechaSeleccionada, "PPP", { locale: es })
                        : "Selecciona fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={fechaSeleccionada}
                      onSelect={setFechaSeleccionada}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TodasActividades;
