import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface Estudiante {
  codigo_estudiantil: string;
  apellidos_estudiante: string;
  nombre_estudiante: string;
}

interface Actividad {
  id: string;
  periodo: number;
  nombre: string;
  porcentaje: number | null;
}

// Estructura: { [codigo_estudiantil]: { [periodo]: { [actividad_id]: nota } } }
type NotasEstudiantes = {
  [codigoEstudiantil: string]: {
    [periodo: number]: {
      [actividadId: string]: number;
    };
  };
};

interface CeldaEditando {
  codigoEstudiantil: string;
  actividadId: string;
  periodo: number;
}

const TablaNotas = () => {
  const navigate = useNavigate();
  const [materiaSeleccionada, setMateriaSeleccionada] = useState("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState("");
  const [salonSeleccionado, setSalonSeleccionado] = useState("");
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [notas, setNotas] = useState<NotasEstudiantes>({});
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [periodoActual, setPeriodoActual] = useState<number>(1);
  const [nombreActividad, setNombreActividad] = useState("");
  const [porcentajeActividad, setPorcentajeActividad] = useState("");
  
  // Estado para celda en edición
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [valorEditando, setValorEditando] = useState("");

  useEffect(() => {
    const storedCodigo = localStorage.getItem("codigo");
    const storedMateria = localStorage.getItem("materiaSeleccionada");
    const storedGrado = localStorage.getItem("gradoSeleccionado");
    const storedSalon = localStorage.getItem("salonSeleccionado");

    if (!storedCodigo) {
      navigate("/");
      return;
    }

    if (!storedMateria) {
      navigate("/dashboard");
      return;
    }

    if (!storedGrado) {
      navigate("/seleccionar-grado");
      return;
    }

    if (!storedSalon) {
      navigate("/seleccionar-salon");
      return;
    }

    setMateriaSeleccionada(storedMateria);
    setGradoSeleccionado(storedGrado);
    setSalonSeleccionado(storedSalon);

    const fetchEstudiantes = async () => {
      try {
        console.log("=== DEBUG FILTRO ESTUDIANTES ===");
        console.log("Grado desde localStorage:", storedGrado);
        console.log("Salón desde localStorage:", storedSalon);
        console.log("Tipo de grado:", typeof storedGrado);
        console.log("Tipo de salón:", typeof storedSalon);

        const { data, error } = await supabase
          .from('Estudiantes')
          .select('codigo_estudiantil, apellidos_estudiante, nombre_estudiante')
          .eq('grado_estudiante', storedGrado)
          .eq('salon_estudiante', storedSalon)
          .order('apellidos_estudiante', { ascending: true })
          .order('nombre_estudiante', { ascending: true });

        console.log("Estudiantes encontrados:", data?.length || 0);
        console.log("Datos:", data);

        if (error) {
          console.error('Error fetching estudiantes:', error);
          setLoading(false);
          return;
        }

        setEstudiantes(data || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudiantes();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("codigo");
    localStorage.removeItem("nombres");
    localStorage.removeItem("apellidos");
    localStorage.removeItem("materiaSeleccionada");
    localStorage.removeItem("gradoSeleccionado");
    localStorage.removeItem("salonSeleccionado");
    navigate("/");
  };

  const periodos = [
    { numero: 1, nombre: "1er Periodo" },
    { numero: 2, nombre: "2do Periodo" },
    { numero: 3, nombre: "3er Periodo" },
    { numero: 4, nombre: "4to Periodo" },
  ];

  const getActividadesPorPeriodo = (periodo: number) => {
    return actividades.filter(a => a.periodo === periodo);
  };

  const getPorcentajeUsado = (periodo: number) => {
    return actividades
      .filter(a => a.periodo === periodo && a.porcentaje !== null)
      .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
  };

  const handleAbrirModal = (periodo: number) => {
    setPeriodoActual(periodo);
    setNombreActividad("");
    setPorcentajeActividad("");
    setModalOpen(true);
  };

  const handleCrearActividad = () => {
    // Validar nombre
    if (!nombreActividad.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la actividad es requerido",
        variant: "destructive",
      });
      return;
    }

    if (nombreActividad.length > 100) {
      toast({
        title: "Error",
        description: "El nombre no puede superar 100 caracteres",
        variant: "destructive",
      });
      return;
    }

    // Validar porcentaje si existe
    let porcentaje: number | null = null;
    if (porcentajeActividad.trim()) {
      porcentaje = parseFloat(porcentajeActividad);
      if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        toast({
          title: "Error",
          description: "El porcentaje debe estar entre 0 y 100",
          variant: "destructive",
        });
        return;
      }

      const porcentajeUsado = getPorcentajeUsado(periodoActual);
      if (porcentajeUsado + porcentaje > 100) {
        toast({
          title: "Error",
          description: `El porcentaje total del período no puede superar 100%. Actualmente usado: ${porcentajeUsado}%`,
          variant: "destructive",
        });
        return;
      }
    }

    // Crear actividad
    const nuevaActividad: Actividad = {
      id: crypto.randomUUID(),
      periodo: periodoActual,
      nombre: nombreActividad.trim(),
      porcentaje,
    };

    setActividades([...actividades, nuevaActividad]);
    setModalOpen(false);
    
    toast({
      title: "Actividad creada",
      description: `"${nuevaActividad.nombre}" agregada al ${periodos[periodoActual - 1].nombre}`,
    });
  };

  // Calcular el ancho mínimo de cada período basado en sus actividades
  const getAnchoMinimoPeriodo = (periodo: number) => {
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    // Mínimo 200px para el botón, más 120px por cada actividad
    return Math.max(200, 80 + (actividadesDelPeriodo.length * 120));
  };

  // Handlers para edición de notas
  const handleClickCelda = (codigoEstudiantil: string, actividadId: string, periodo: number, notaActual: number | undefined) => {
    setCeldaEditando({ codigoEstudiantil, actividadId, periodo });
    setValorEditando(notaActual !== undefined ? notaActual.toString() : "");
  };

  const handleCambioNota = (valor: string) => {
    // Convertir coma a punto
    const valorNormalizado = valor.replace(",", ".");
    
    // Permitir vacío, números y un punto decimal
    if (valorNormalizado === "" || /^\d*\.?\d{0,2}$/.test(valorNormalizado)) {
      setValorEditando(valorNormalizado);
    }
  };

  const handleGuardarNota = () => {
    if (!celdaEditando) return;

    const { codigoEstudiantil, actividadId, periodo } = celdaEditando;

    if (valorEditando.trim() === "") {
      // Si está vacío, eliminar la nota
      setNotas(prev => {
        const nuevasNotas = { ...prev };
        if (nuevasNotas[codigoEstudiantil]?.[periodo]?.[actividadId] !== undefined) {
          delete nuevasNotas[codigoEstudiantil][periodo][actividadId];
        }
        return nuevasNotas;
      });
    } else {
      const nota = parseFloat(valorEditando);
      
      // Validar rango
      if (isNaN(nota) || nota < 0 || nota > 5) {
        toast({
          title: "Error",
          description: "La nota debe estar entre 0 y 5",
          variant: "destructive",
        });
        setCeldaEditando(null);
        setValorEditando("");
        return;
      }

      // Guardar la nota
      setNotas(prev => ({
        ...prev,
        [codigoEstudiantil]: {
          ...prev[codigoEstudiantil],
          [periodo]: {
            ...prev[codigoEstudiantil]?.[periodo],
            [actividadId]: Math.round(nota * 100) / 100, // Redondear a 2 decimales
          },
        },
      }));
    }

    setCeldaEditando(null);
    setValorEditando("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold">Notas Normy</h1>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button 
              onClick={() => navigate("/dashboard")}
              className="text-primary hover:underline"
            >
              Materias
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/seleccionar-grado")}
              className="text-primary hover:underline"
            >
              {materiaSeleccionada}
            </button>
            <span className="text-muted-foreground">→</span>
            <button 
              onClick={() => navigate("/seleccionar-salon")}
              className="text-primary hover:underline"
            >
              {gradoSeleccionado}
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">{salonSeleccionado}</span>
          </div>
        </div>

        {/* Tabla de Notas */}
        <div className="bg-card rounded-lg shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Cargando estudiantes...
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay estudiantes en este salón
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${430 + periodos.reduce((sum, p) => sum + getAnchoMinimoPeriodo(p.numero), 0)}px` }}>
                {/* Table */}
                <table className="w-full border-collapse">
                  {/* Header Row - Periods */}
                  <thead>
                    {/* Primera fila: Títulos de período */}
                    <tr className="bg-primary text-primary-foreground">
                      <th className="sticky left-0 z-20 bg-primary border border-border/30 w-[100px] min-w-[100px] p-3 text-left font-semibold" rowSpan={2}>
                        Código
                      </th>
                      <th className="sticky left-[100px] z-20 bg-primary border border-border/30 w-[180px] min-w-[180px] p-3 text-left font-semibold" rowSpan={2}>
                        Apellidos
                      </th>
                      <th className="sticky left-[280px] z-20 bg-primary border border-border/30 w-[150px] min-w-[150px] p-3 text-left font-semibold" rowSpan={2}>
                        Nombre
                      </th>
                      {/* Period headers */}
                      {periodos.map((periodo) => {
                        const actividadesDelPeriodo = getActividadesPorPeriodo(periodo.numero);
                        const colSpan = actividadesDelPeriodo.length + 1; // +1 para el botón
                        return (
                          <th 
                            key={periodo.numero}
                            colSpan={colSpan}
                            className="border border-border/30 p-3 text-center font-semibold"
                            style={{ minWidth: `${getAnchoMinimoPeriodo(periodo.numero)}px` }}
                          >
                            {periodo.nombre}
                          </th>
                        );
                      })}
                    </tr>
                    {/* Segunda fila: Actividades + botón agregar */}
                    <tr className="bg-primary/90 text-primary-foreground">
                      {periodos.map((periodo) => {
                        const actividadesDelPeriodo = getActividadesPorPeriodo(periodo.numero);
                        return (
                          <>
                            {actividadesDelPeriodo.map((actividad) => (
                              <th 
                                key={actividad.id}
                                className="border border-border/30 p-2 text-center text-xs font-medium min-w-[120px]"
                              >
                                <div className="truncate" title={actividad.nombre}>
                                  {actividad.nombre}
                                </div>
                                {actividad.porcentaje !== null && (
                                  <div className="text-primary-foreground/70 text-xs">
                                    ({actividad.porcentaje}%)
                                  </div>
                                )}
                              </th>
                            ))}
                            <th 
                              key={`btn-${periodo.numero}`}
                              className="border border-border/30 p-2 text-center min-w-[80px]"
                            >
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                                onClick={() => handleAbrirModal(periodo.numero)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Agregar
                              </Button>
                            </th>
                          </>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((estudiante, index) => (
                      <tr 
                        key={estudiante.codigo_estudiantil}
                        className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}
                      >
                        {/* Fixed columns */}
                        <td className={`sticky left-0 z-10 border border-border p-3 text-sm ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.codigo_estudiantil}
                        </td>
                        <td className={`sticky left-[100px] z-10 border border-border p-3 text-sm font-medium ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.apellidos_estudiante}
                        </td>
                        <td className={`sticky left-[280px] z-10 border border-border p-3 text-sm ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                          {estudiante.nombre_estudiante}
                        </td>
                        {/* Period cells with activities */}
                        {periodos.map((periodo) => {
                          const actividadesDelPeriodo = getActividadesPorPeriodo(periodo.numero);
                          return (
                            <>
                              {actividadesDelPeriodo.map((actividad) => {
                                const nota = notas[estudiante.codigo_estudiantil]?.[periodo.numero]?.[actividad.id];
                                const estaEditando = celdaEditando?.codigoEstudiantil === estudiante.codigo_estudiantil 
                                  && celdaEditando?.actividadId === actividad.id;
                                
                                return (
                                  <td 
                                    key={`${estudiante.codigo_estudiantil}-${actividad.id}`}
                                    className="border border-border p-1 text-center text-sm min-w-[120px]"
                                  >
                                    {estaEditando ? (
                                      <input
                                        type="text"
                                        className="w-full h-8 text-center border border-primary rounded px-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        value={valorEditando}
                                        onChange={(e) => handleCambioNota(e.target.value)}
                                        onBlur={handleGuardarNota}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleGuardarNota();
                                          } else if (e.key === 'Escape') {
                                            setCeldaEditando(null);
                                            setValorEditando("");
                                          }
                                        }}
                                        autoFocus
                                        placeholder="0-5"
                                      />
                                    ) : (
                                      <button
                                        className="w-full h-8 hover:bg-muted/50 rounded cursor-pointer transition-colors flex items-center justify-center"
                                        onClick={() => handleClickCelda(estudiante.codigo_estudiantil, actividad.id, periodo.numero, nota)}
                                      >
                                        {nota !== undefined ? nota.toFixed(2) : <span className="text-muted-foreground">—</span>}
                                      </button>
                                    )}
                                  </td>
                                );
                              })}
                              <td 
                                key={`${estudiante.codigo_estudiantil}-empty-${periodo.numero}`}
                                className="border border-border p-3 text-center text-sm text-muted-foreground/50 min-w-[80px]"
                              >
                                
                              </td>
                            </>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal para crear actividad */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Nueva Actividad - {periodos[periodoActual - 1]?.nombre}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nombre">Nombre de la actividad *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Evaluación 1, Taller, Exposición"
                value={nombreActividad}
                onChange={(e) => setNombreActividad(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground text-right">
                {nombreActividad.length}/100 caracteres
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="porcentaje">Porcentaje (opcional)</Label>
              <Input
                id="porcentaje"
                type="number"
                placeholder="Ej: 25"
                min={0}
                max={100}
                value={porcentajeActividad}
                onChange={(e) => setPorcentajeActividad(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Porcentaje usado: {getPorcentajeUsado(periodoActual)}% / 100%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearActividad} className="bg-primary hover:bg-primary/90">
              Crear Actividad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TablaNotas;