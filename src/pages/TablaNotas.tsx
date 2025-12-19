import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import { Plus, MoreVertical, Pencil, Trash2, Send, Calendar } from "lucide-react";
import { getSession, clearSession } from "@/hooks/useSession";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import NotaCelda from "@/components/notas/NotaCelda";
import FinalPeriodoCelda from "@/components/notas/FinalPeriodoCelda";
import ComentarioModal from "@/components/notas/ComentarioModal";
import NotificacionModal, { TipoNotificacion } from "@/components/notas/NotificacionModal";

// Configuración del webhook de n8n
const N8N_WEBHOOK_URL = 'https://n8n.srv966880.hstgr.cloud/webhook-test/notificar-notas';

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

// Estructura para comentarios: { [codigo_estudiantil]: { [periodo]: { [actividad_id]: comentario } } }
type ComentariosEstudiantes = {
  [codigoEstudiantil: string]: {
    [periodo: number]: {
      [actividadId: string]: string | null;
    };
  };
};

interface CeldaEditando {
  codigoEstudiantil: string;
  actividadId: string;
  periodo: number;
}

interface ComentarioEditando {
  codigoEstudiantil: string;
  nombreEstudiante: string;
  actividadId: string;
  nombreActividad: string;
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
  const [comentarios, setComentarios] = useState<ComentariosEstudiantes>({});
  
  // Estado para período activo (pestañas)
  const [periodoActivo, setPeriodoActivo] = useState<number>(1);
  
  // Modal state para crear/editar actividad
  const [modalOpen, setModalOpen] = useState(false);
  const [periodoActual, setPeriodoActual] = useState<number>(1);
  const [nombreActividad, setNombreActividad] = useState("");
  const [porcentajeActividad, setPorcentajeActividad] = useState("");
  const [actividadEditando, setActividadEditando] = useState<Actividad | null>(null);
  
  // Modal state para confirmar eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actividadAEliminar, setActividadAEliminar] = useState<Actividad | null>(null);
  
  // Modal state para comentarios
  const [comentarioModalOpen, setComentarioModalOpen] = useState(false);
  const [comentarioEditando, setComentarioEditando] = useState<ComentarioEditando | null>(null);
  
  // Modal state para notificaciones
  const [notificacionModalOpen, setNotificacionModalOpen] = useState(false);
  const [notificacionPendiente, setNotificacionPendiente] = useState<{
    tipo: TipoNotificacion;
    descripcion: string;
    nombreEstudiante?: string;
    datos: any[];
  } | null>(null);
  
  // Estado para celda en edición
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [valorEditando, setValorEditando] = useState("");
  
  // Ref para almacenar las celdas y flag para evitar doble guardado
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const isNavigating = useRef(false);

  // useEffect UNIFICADO: Verificar sesión y cargar datos
  useEffect(() => {
    const inicializar = async () => {
      // 1. Verificar sesión
      const session = getSession();
      
      console.log('🔐 Verificando sesión en TablaNotas:', { 
        codigo: session.codigo,
        nombres: session.nombres 
      });
      
      if (!session.codigo) {
        console.log('❌ No hay sesión, redirigiendo a login');
        navigate('/');
        return;
      }
      
      console.log('✅ Sesión válida');
      
      // 2. Verificar datos de navegación
      const storedMateria = localStorage.getItem("materiaSeleccionada");
      const storedGrado = localStorage.getItem("gradoSeleccionado");
      const storedSalon = localStorage.getItem("salonSeleccionado");

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

      // 3. Cargar datos
      const codigoProfesor = session.codigo;
      
      try {
        console.log("=== DEBUG FILTRO ESTUDIANTES ===");
        console.log("Grado desde localStorage:", storedGrado);
        console.log("Salón desde localStorage:", storedSalon);

        // Fetch estudiantes
        const { data: estudiantesData, error: estudiantesError } = await supabase
          .from('Estudiantes')
          .select('codigo_estudiantil, apellidos_estudiante, nombre_estudiante')
          .eq('grado_estudiante', storedGrado)
          .eq('salon_estudiante', storedSalon)
          .order('apellidos_estudiante', { ascending: true })
          .order('nombre_estudiante', { ascending: true });

        console.log("Estudiantes encontrados:", estudiantesData?.length || 0);

        if (estudiantesError) {
          console.error('Error fetching estudiantes:', estudiantesError);
          setLoading(false);
          return;
        }

        setEstudiantes(estudiantesData || []);

        // PRIMERO: Cargar actividades desde "Nombre de Actividades"
        console.log("=== CARGANDO ACTIVIDADES DESDE NOMBRE DE ACTIVIDADES ===");
        const { data: actividadesData, error: actividadesError } = await supabase
          .from('Nombre de Actividades')
          .select('*')
          .eq('codigo_profesor', codigoProfesor)
          .eq('materia', storedMateria)
          .eq('grado', storedGrado)
          .eq('salon', storedSalon)
          .order('fecha_creacion', { ascending: true });

        if (actividadesError) {
          console.error('Error fetching actividades:', actividadesError);
        } else if (actividadesData && actividadesData.length > 0) {
          console.log("Actividades encontradas:", actividadesData.length);
          const actividadesCargadas: Actividad[] = actividadesData.map(act => ({
            id: `${act.periodo}-${act.nombre_actividad}`,
            periodo: act.periodo,
            nombre: act.nombre_actividad,
            porcentaje: act.porcentaje,
          }));
          setActividades(actividadesCargadas);
          console.log("Actividades cargadas:", actividadesCargadas);
        }

        // LUEGO: Fetch notas existentes
        console.log("=== CARGANDO NOTAS EXISTENTES ===");
        const { data: notasData, error: notasError } = await supabase
          .from('Notas')
          .select('*')
          .eq('materia', storedMateria)
          .eq('grado', storedGrado)
          .eq('salon', storedSalon);

        if (notasError) {
          console.error('Error fetching notas:', notasError);
        } else if (notasData && notasData.length > 0) {
          console.log("Notas encontradas:", notasData.length);
          
          // Convertir notas de Supabase al formato local
          const notasFormateadas: NotasEstudiantes = {};
          const comentariosFormateados: ComentariosEstudiantes = {};
          
          notasData.forEach((nota) => {
            const { codigo_estudiantil, periodo, nombre_actividad, nota: valorNota, comentario } = nota;
            
            // Cargar comentarios de Final Definitiva (periodo = 0)
            if (nombre_actividad === "Final Definitiva" && periodo === 0) {
              if (comentario) {
                const actividadId = '0-Final Definitiva';
                if (!comentariosFormateados[codigo_estudiantil]) {
                  comentariosFormateados[codigo_estudiantil] = {};
                }
                if (!comentariosFormateados[codigo_estudiantil][0]) {
                  comentariosFormateados[codigo_estudiantil][0] = {};
                }
                comentariosFormateados[codigo_estudiantil][0][actividadId] = comentario;
              }
              return;
            }
            
            // Ignorar las notas de "Final Periodo" para las actividades
            if (nombre_actividad === "Final Periodo") {
              // Solo cargar el comentario si existe
              if (comentario) {
                const actividadId = `${periodo}-Final Periodo`;
                if (!comentariosFormateados[codigo_estudiantil]) {
                  comentariosFormateados[codigo_estudiantil] = {};
                }
                if (!comentariosFormateados[codigo_estudiantil][periodo]) {
                  comentariosFormateados[codigo_estudiantil][periodo] = {};
                }
                comentariosFormateados[codigo_estudiantil][periodo][actividadId] = comentario;
              }
              return;
            }
            
            // Crear ID único para la actividad basado en periodo y nombre
            const actividadId = `${periodo}-${nombre_actividad}`;
            
            // Agregar nota al estado
            if (!notasFormateadas[codigo_estudiantil]) {
              notasFormateadas[codigo_estudiantil] = {};
            }
            if (!notasFormateadas[codigo_estudiantil][periodo]) {
              notasFormateadas[codigo_estudiantil][periodo] = {};
            }
            notasFormateadas[codigo_estudiantil][periodo][actividadId] = valorNota;
            
            // Agregar comentario al estado si existe
            if (comentario) {
              if (!comentariosFormateados[codigo_estudiantil]) {
                comentariosFormateados[codigo_estudiantil] = {};
              }
              if (!comentariosFormateados[codigo_estudiantil][periodo]) {
                comentariosFormateados[codigo_estudiantil][periodo] = {};
              }
              comentariosFormateados[codigo_estudiantil][periodo][actividadId] = comentario;
            }
          });
          
          setNotas(notasFormateadas);
          setComentarios(comentariosFormateados);
          console.log("Notas cargadas:", notasFormateadas);
          console.log("Comentarios cargados:", comentariosFormateados);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    inicializar();
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const periodos = [
    { numero: 1, nombre: "1er Periodo" },
    { numero: 2, nombre: "2do Periodo" },
    { numero: 3, nombre: "3er Periodo" },
    { numero: 4, nombre: "4to Periodo" },
  ];
  
  // Verificar si estamos en la pestaña Final Definitiva
  const esFinalDefinitiva = periodoActivo === 0;

  const getActividadesPorPeriodo = (periodo: number) => {
    return actividades.filter(a => a.periodo === periodo);
  };

  const getPorcentajeUsado = (periodo: number) => {
    return actividades
      .filter(a => a.periodo === periodo && a.porcentaje !== null)
      .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
  };

  // Calcular porcentaje promedio anual (promedio de los 4 períodos)
  const getPorcentajePromedioAnual = () => {
    const porcentajes = [1, 2, 3, 4].map(p => getPorcentajeUsado(p));
    const suma = porcentajes.reduce((acc, val) => acc + val, 0);
    const promedio = suma / 4;
    // Redondear a 2 decimales
    return Math.round(promedio * 100) / 100;
  };

  const handleAbrirModal = (periodo: number) => {
    setPeriodoActual(periodo);
    setNombreActividad("");
    setPorcentajeActividad("");
    setActividadEditando(null);
    setModalOpen(true);
  };

  const handleAbrirModalEditar = (actividad: Actividad) => {
    setPeriodoActual(actividad.periodo);
    setNombreActividad(actividad.nombre);
    setPorcentajeActividad(actividad.porcentaje?.toString() || "");
    setActividadEditando(actividad);
    setModalOpen(true);
  };

  const handleGuardarActividad = async () => {
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

      // Calcular porcentaje usado excluyendo la actividad que se está editando
      const porcentajeUsado = actividades
        .filter(a => a.periodo === periodoActual && a.porcentaje !== null && a.id !== actividadEditando?.id)
        .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
      
      if (porcentajeUsado + porcentaje > 100) {
        toast({
          title: "Error",
          description: `El porcentaje total del período no puede superar 100%. Actualmente usado: ${porcentajeUsado}%`,
          variant: "destructive",
        });
        return;
      }
    }

    if (actividadEditando) {
      // EDITAR actividad existente
      const nombreAntiguo = actividadEditando.nombre;
      const nombreNuevo = nombreActividad.trim();
      
      // Actualizar en tabla "Nombre de Actividades" (el trigger de Supabase actualizará "Notas" automáticamente)
      const session = getSession();
      try {
        const { error } = await supabase
          .from('Nombre de Actividades')
          .update({ 
            nombre_actividad: nombreNuevo,
            porcentaje: porcentaje 
          })
          .eq('codigo_profesor', session.codigo)
          .eq('materia', materiaSeleccionada)
          .eq('grado', gradoSeleccionado)
          .eq('salon', salonSeleccionado)
          .eq('periodo', actividadEditando.periodo)
          .eq('nombre_actividad', nombreAntiguo);
        
        if (error) {
          console.error('Error actualizando actividad en Nombre de Actividades:', error);
          toast({
            title: "Error",
            description: "No se pudo actualizar la actividad",
            variant: "destructive",
          });
          return;
        }
        console.log('✅ Actividad actualizada en Nombre de Actividades');
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Error de conexión al actualizar",
          variant: "destructive",
        });
        return;
      }
      
      // Si cambió el porcentaje, actualizar todas las notas en Supabase
      if (actividadEditando.porcentaje !== porcentaje) {
        try {
          const { error } = await supabase
            .from('Notas')
            .update({ porcentaje: porcentaje })
            .eq('nombre_actividad', nombreNuevo)
            .eq('materia', materiaSeleccionada)
            .eq('grado', gradoSeleccionado)
            .eq('salon', salonSeleccionado)
            .eq('periodo', actividadEditando.periodo);

          if (error) {
            console.error('Error actualizando porcentaje:', error);
            // No es crítico, continuar
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }

      // Actualizar en el estado local - crear nuevo ID si cambió el nombre
      const nuevoId = nombreAntiguo !== nombreNuevo 
        ? `${actividadEditando.periodo}-${nombreNuevo}` 
        : actividadEditando.id;

      setActividades(prev => prev.map(a => 
        a.id === actividadEditando.id 
          ? { ...a, id: nuevoId, nombre: nombreNuevo, porcentaje } 
          : a
      ));

      // Actualizar las notas locales si cambió el nombre
      if (nombreAntiguo !== nombreNuevo) {
        setNotas(prev => {
          const nuevasNotas = { ...prev };
          Object.keys(nuevasNotas).forEach(codigo => {
            if (nuevasNotas[codigo]?.[actividadEditando.periodo]?.[actividadEditando.id] !== undefined) {
              const valorNota = nuevasNotas[codigo][actividadEditando.periodo][actividadEditando.id];
              delete nuevasNotas[codigo][actividadEditando.periodo][actividadEditando.id];
              nuevasNotas[codigo][actividadEditando.periodo][nuevoId] = valorNota;
            }
          });
          return nuevasNotas;
        });
      }

      setModalOpen(false);
      toast({
        title: "Actividad actualizada",
        description: `"${nombreNuevo}" ha sido actualizada`,
      });
    } else {
      // CREAR nueva actividad
      const nombreTrimmed = nombreActividad.trim();
      const actividadId = `${periodoActual}-${nombreTrimmed}`;
      
      // Guardar en tabla "Nombre de Actividades"
      const session = getSession();
      try {
        const { error } = await supabase
          .from('Nombre de Actividades')
          .insert({
            codigo_profesor: session.codigo,
            materia: materiaSeleccionada,
            grado: gradoSeleccionado,
            salon: salonSeleccionado,
            periodo: periodoActual,
            nombre_actividad: nombreTrimmed,
            porcentaje: porcentaje,
          });
        
        if (error) {
          console.error('Error guardando actividad:', error);
          toast({
            title: "Error",
            description: "No se pudo guardar la actividad",
            variant: "destructive",
          });
          return;
        }
        
        console.log('✅ Actividad guardada en Nombre de Actividades');
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Error de conexión al guardar la actividad",
          variant: "destructive",
        });
        return;
      }
      
      const nuevaActividad: Actividad = {
        id: actividadId,
        periodo: periodoActual,
        nombre: nombreTrimmed,
        porcentaje,
      };

      setActividades([...actividades, nuevaActividad]);
      setModalOpen(false);
      
      toast({
        title: "Actividad creada",
        description: `"${nuevaActividad.nombre}" agregada al ${periodos[periodoActual - 1].nombre}`,
      });
    }
  };

  const handleConfirmarEliminar = (actividad: Actividad) => {
    setActividadAEliminar(actividad);
    setDeleteDialogOpen(true);
  };

  const handleEliminarActividad = async () => {
    if (!actividadAEliminar) return;

    const session = getSession();
    
    try {
      // PRIMERO: Eliminar de "Nombre de Actividades"
      const { error: errorActividad } = await supabase
        .from('Nombre de Actividades')
        .delete()
        .eq('codigo_profesor', session.codigo)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', actividadAEliminar.periodo)
        .eq('nombre_actividad', actividadAEliminar.nombre);
      
      if (errorActividad) {
        console.error('Error eliminando de Nombre de Actividades:', errorActividad);
      } else {
        console.log('✅ Actividad eliminada de Nombre de Actividades');
      }
      
      // LUEGO: Eliminar todas las notas de esta actividad de Supabase
      const { error } = await supabase
        .from('Notas')
        .delete()
        .eq('nombre_actividad', actividadAEliminar.nombre)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', actividadAEliminar.periodo);

      if (error) {
        console.error('Error eliminando notas:', error);
        toast({
          title: "Error",
          description: "No se pudieron eliminar las notas de la actividad",
          variant: "destructive",
        });
        return;
      }

      // Eliminar del estado local de actividades
      const nuevasActividades = actividades.filter(a => a.id !== actividadAEliminar.id);
      setActividades(nuevasActividades);

      // Eliminar del estado local de notas y obtener nuevas notas
      const nuevasNotas = { ...notas };
      Object.keys(nuevasNotas).forEach(codigo => {
        if (nuevasNotas[codigo]?.[actividadAEliminar.periodo]) {
          delete nuevasNotas[codigo][actividadAEliminar.periodo][actividadAEliminar.id];
        }
      });
      setNotas(nuevasNotas);

      setDeleteDialogOpen(false);
      const periodoEliminado = actividadAEliminar.periodo;
      setActividadAEliminar(null);

      toast({
        title: "Actividad eliminada",
        description: `"${actividadAEliminar.nombre}" y todas sus notas han sido eliminadas`,
      });
      
      // Recalcular y guardar Final Periodo y Final Definitiva para todos los estudiantes afectados
      setTimeout(async () => {
        console.log('=== RECALCULANDO FINALES DESPUÉS DE ELIMINAR ACTIVIDAD ===');
        for (const est of estudiantes) {
          // Calcular Final Periodo con las nuevas actividades
          const actividadesDelPeriodo = nuevasActividades.filter(a => a.periodo === periodoEliminado);
          const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
          const notasEstudiante = nuevasNotas[est.codigo_estudiantil]?.[periodoEliminado] || {};
          
          let notaFinal: number | null = null;
          if (actividadesConPorcentaje.length > 0) {
            const actividadesConNotaYPorcentaje = actividadesConPorcentaje.filter(a => notasEstudiante[a.id] !== undefined);
            if (actividadesConNotaYPorcentaje.length > 0) {
              let sumaPonderada = 0;
              actividadesConNotaYPorcentaje.forEach(act => {
                const notaValue = notasEstudiante[act.id];
                if (notaValue !== undefined && act.porcentaje) {
                  sumaPonderada += notaValue * (act.porcentaje / 100);
                }
              });
              notaFinal = Math.round(sumaPonderada * 100) / 100;
            }
          }
          
          await guardarFinalPeriodo(est.codigo_estudiantil, periodoEliminado, notaFinal);
          
          // Recalcular Final Definitiva
          let suma = 0;
          let tieneAlgunaNota = false;
          for (let p = 1; p <= 4; p++) {
            // Usar nuevas actividades para calcular
            const actsPeriodo = nuevasActividades.filter(a => a.periodo === p);
            const actsConPorc = actsPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
            const notasEst = nuevasNotas[est.codigo_estudiantil]?.[p] || {};
            
            let fp: number | null = null;
            if (actsConPorc.length > 0) {
              const actsConNotaYPorc = actsConPorc.filter(a => notasEst[a.id] !== undefined);
              if (actsConNotaYPorc.length > 0) {
                let sumPond = 0;
                actsConNotaYPorc.forEach(act => {
                  const nv = notasEst[act.id];
                  if (nv !== undefined && act.porcentaje) {
                    sumPond += nv * (act.porcentaje / 100);
                  }
                });
                fp = Math.round(sumPond * 100) / 100;
              }
            }
            
            if (fp !== null) {
              suma += fp;
              tieneAlgunaNota = true;
            }
          }
          
          if (tieneAlgunaNota) {
            const finalDef = Math.round((suma / 4) * 100) / 100;
            await guardarFinalDefinitiva(est.codigo_estudiantil, finalDef);
          } else {
            await guardarFinalDefinitiva(est.codigo_estudiantil, null);
          }
        }
        console.log('✅ Finales recalculados después de eliminar actividad');
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión al eliminar",
        variant: "destructive",
      });
    }
  };

  // Calcular porcentaje usado excluyendo la actividad en edición
  const getPorcentajeUsadoParaModal = () => {
    return actividades
      .filter(a => a.periodo === periodoActual && a.porcentaje !== null && a.id !== actividadEditando?.id)
      .reduce((sum, a) => sum + (a.porcentaje || 0), 0);
  };

  // Calcular el ancho mínimo de cada período basado en sus actividades (+ columna Final)
  const getAnchoMinimoPeriodo = (periodo: number) => {
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    // Mínimo 200px para el botón + 100px para Final, más 120px por cada actividad
    return Math.max(300, 180 + (actividadesDelPeriodo.length * 120));
  };

  // Calcular nota final del periodo para un estudiante (usando notas proporcionadas o estado)
  // FÓRMULA: Σ(nota * porcentaje/100) - Solo actividades con porcentaje
  const calcularFinalPeriodoConNotas = useCallback((notasParam: NotasEstudiantes, codigoEstudiantil: string, periodo: number): number | null => {
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    if (actividadesDelPeriodo.length === 0) return null;
    
    const notasEstudiante = notasParam[codigoEstudiantil]?.[periodo] || {};
    
    // Solo considerar actividades que tienen porcentaje asignado
    const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
    if (actividadesConPorcentaje.length === 0) return null;
    
    // Verificar que el estudiante tenga al menos una nota en actividades con porcentaje
    const actividadesConNotaYPorcentaje = actividadesConPorcentaje.filter(a => notasEstudiante[a.id] !== undefined);
    if (actividadesConNotaYPorcentaje.length === 0) return null;
    
    // Calcular: Σ(nota * porcentaje/100)
    let sumaPonderada = 0;
    
    actividadesConNotaYPorcentaje.forEach(actividad => {
      const notaValue = notasEstudiante[actividad.id];
      if (notaValue !== undefined && actividad.porcentaje) {
        sumaPonderada += notaValue * (actividad.porcentaje / 100);
      }
    });
    
    // Redondear a 2 decimales (redondeo matemático estándar)
    return Math.round(sumaPonderada * 100) / 100;
  }, [actividades]);

  // Versión que usa el estado actual
  const calcularFinalPeriodo = useCallback((codigoEstudiantil: string, periodo: number): number | null => {
    return calcularFinalPeriodoConNotas(notas, codigoEstudiantil, periodo);
  }, [calcularFinalPeriodoConNotas, notas]);

  // Calcular Final Definitiva (promedio de los 4 períodos, siempre divide entre 4)
  const calcularFinalDefinitiva = useCallback((codigoEstudiantil: string): number | null => {
    let suma = 0;
    let tieneAlgunaNota = false;
    
    for (let p = 1; p <= 4; p++) {
      const finalPeriodo = calcularFinalPeriodo(codigoEstudiantil, p);
      if (finalPeriodo !== null) {
        suma += finalPeriodo;
        tieneAlgunaNota = true;
      }
      // Si es null, cuenta como 0 (no sumamos nada)
    }
    
    // Si no tiene ninguna nota en ningún período, mostrar "—"
    if (!tieneAlgunaNota) return null;
    
    // Siempre dividir entre 4 (los 4 períodos del año)
    const promedio = suma / 4;
    
    // Redondear a 2 decimales (redondeo matemático estándar)
    return Math.round(promedio * 100) / 100;
  }, [calcularFinalPeriodo]);

  // Guardar nota final en Supabase
  const guardarFinalPeriodo = async (codigoEstudiantil: string, periodo: number, notaFinal: number | null) => {
    console.log('=== INICIANDO guardarFinalPeriodo ===');
    console.log('Parámetros:', { codigoEstudiantil, periodo, notaFinal });
    
    const finalActividadId = `${periodo}-Final Periodo`;
    
    if (notaFinal === null) {
      // Eliminar si no hay nota final
      const { error } = await supabase
        .from('Notas')
        .delete()
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', periodo)
        .eq('nombre_actividad', 'Final Periodo');
      
      console.log('Final Periodo eliminado para:', codigoEstudiantil, 'Error:', error);
    } else {
      // Primero consultar desde Supabase si existe comentario para no perderlo
      const { data: existente } = await supabase
        .from('Notas')
        .select('comentario')
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', periodo)
        .eq('nombre_actividad', 'Final Periodo')
        .maybeSingle();
      
      const comentarioExistente = existente?.comentario || comentarios[codigoEstudiantil]?.[periodo]?.[finalActividadId] || null;
      
      // Upsert la nota final
      const { data, error } = await supabase
        .from('Notas')
        .upsert({
          codigo_estudiantil: codigoEstudiantil,
          materia: materiaSeleccionada,
          grado: gradoSeleccionado,
          salon: salonSeleccionado,
          periodo,
          nombre_actividad: 'Final Periodo',
          porcentaje: null,
          nota: notaFinal,
          comentario: comentarioExistente,
          notificado: false,
        }, {
          onConflict: 'codigo_estudiantil,materia,grado,salon,periodo,nombre_actividad'
        })
        .select();
      
      if (error) {
        console.error('ERROR guardando Final Periodo:', error);
      } else {
        console.log('✅ Final Periodo guardado en Supabase:', codigoEstudiantil, periodo, notaFinal);
      }
    }
  };

  // Guardar Final Definitiva en Supabase (preservando comentario existente)
  const guardarFinalDefinitiva = async (codigoEstudiantil: string, notaFinal: number | null) => {
    console.log('=== INICIANDO guardarFinalDefinitiva ===');
    console.log('Parámetros:', { codigoEstudiantil, notaFinal, materia: materiaSeleccionada, grado: gradoSeleccionado, salon: salonSeleccionado });
    
    if (notaFinal === null) {
      const { error } = await supabase
        .from('Notas')
        .delete()
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', 0)
        .eq('nombre_actividad', 'Final Definitiva');
      console.log('Final Definitiva eliminada para:', codigoEstudiantil, 'Error:', error);
    } else {
      // Primero consultar desde Supabase si existe comentario para no perderlo
      const { data: existente, error: errorConsulta } = await supabase
        .from('Notas')
        .select('comentario')
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', 0)
        .eq('nombre_actividad', 'Final Definitiva')
        .maybeSingle();
      
      console.log('Consulta comentario existente:', { existente, errorConsulta });
      
      const comentarioExistente = existente?.comentario || null;
      
      const datosUpsert = {
        codigo_estudiantil: codigoEstudiantil,
        materia: materiaSeleccionada,
        grado: gradoSeleccionado,
        salon: salonSeleccionado,
        periodo: 0,
        nombre_actividad: 'Final Definitiva',
        porcentaje: null,
        nota: notaFinal,
        comentario: comentarioExistente,
        notificado: false,
      };
      
      console.log('Datos para UPSERT:', datosUpsert);
      
      const { data, error } = await supabase
        .from('Notas')
        .upsert(datosUpsert, {
          onConflict: 'codigo_estudiantil,materia,grado,salon,periodo,nombre_actividad'
        })
        .select();
      
      console.log('=== RESULTADO UPSERT Final Definitiva ===');
      console.log('Data:', data);
      console.log('Error:', error);
      
      if (error) {
        console.error('ERROR guardando Final Definitiva:', error);
      } else {
        console.log('✅ Final Definitiva guardada exitosamente:', codigoEstudiantil, notaFinal);
      }
    }
  };

  // Abrir modal de comentario
  const handleAbrirComentario = (
    codigoEstudiantil: string,
    nombreEstudiante: string,
    actividadId: string,
    nombreActividad: string,
    periodo: number
  ) => {
    setComentarioEditando({
      codigoEstudiantil,
      nombreEstudiante,
      actividadId,
      nombreActividad,
      periodo,
    });
    setComentarioModalOpen(true);
  };

  // Guardar comentario en Supabase
  const handleGuardarComentario = async (nuevoComentario: string | null) => {
    if (!comentarioEditando) return;
    
    const { codigoEstudiantil, actividadId, periodo, nombreActividad } = comentarioEditando;
    
    console.log('=== GUARDANDO COMENTARIO ===');
    console.log('Datos:', { codigoEstudiantil, periodo, nombreActividad, nuevoComentario });
    
    try {
      // Para Final Definitiva (periodo = 0), verificar si existe el registro
      if (periodo === 0 && nombreActividad === 'Final Definitiva') {
        const { data: existe } = await supabase
          .from('Notas')
          .select('id, nota')
          .eq('codigo_estudiantil', codigoEstudiantil)
          .eq('materia', materiaSeleccionada)
          .eq('grado', gradoSeleccionado)
          .eq('salon', salonSeleccionado)
          .eq('periodo', 0)
          .eq('nombre_actividad', 'Final Definitiva')
          .maybeSingle();
        
        console.log('Registro Final Definitiva existe:', existe);
        
        if (!existe) {
          // Calcular la nota actual y crear el registro
          const finalDef = calcularFinalDefinitiva(codigoEstudiantil);
          console.log('Creando registro Final Definitiva con nota:', finalDef);
          
          const { data, error } = await supabase
            .from('Notas')
            .insert({
              codigo_estudiantil: codigoEstudiantil,
              materia: materiaSeleccionada,
              grado: gradoSeleccionado,
              salon: salonSeleccionado,
              periodo: 0,
              nombre_actividad: 'Final Definitiva',
              porcentaje: null,
              nota: finalDef,
              comentario: nuevoComentario,
              notificado: false,
            })
            .select();
          
          console.log('Resultado INSERT Final Definitiva:', { data, error });
          
          if (error) {
            console.error('Error creando Final Definitiva:', error);
            toast({
              title: "Error",
              description: "No se pudo guardar el comentario",
              variant: "destructive",
            });
            return;
          }
        } else {
          // Actualizar solo el comentario
          const { data, error } = await supabase
            .from('Notas')
            .update({ comentario: nuevoComentario })
            .eq('codigo_estudiantil', codigoEstudiantil)
            .eq('materia', materiaSeleccionada)
            .eq('grado', gradoSeleccionado)
            .eq('salon', salonSeleccionado)
            .eq('periodo', 0)
            .eq('nombre_actividad', 'Final Definitiva')
            .select();
          
          console.log('Resultado UPDATE comentario Final Definitiva:', { data, error });
          
          if (error) {
            console.error('Error actualizando comentario:', error);
            toast({
              title: "Error",
              description: "No se pudo guardar el comentario",
              variant: "destructive",
            });
            return;
          }
        }
      } else {
        // Para otras notas, actualizar normalmente
        const { error } = await supabase
          .from('Notas')
          .update({ comentario: nuevoComentario })
          .eq('codigo_estudiantil', codigoEstudiantil)
          .eq('materia', materiaSeleccionada)
          .eq('grado', gradoSeleccionado)
          .eq('salon', salonSeleccionado)
          .eq('periodo', periodo)
          .eq('nombre_actividad', nombreActividad);
        
        if (error) {
          console.error('Error guardando comentario:', error);
          toast({
            title: "Error",
            description: "No se pudo guardar el comentario",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Actualizar estado local
      setComentarios(prev => ({
        ...prev,
        [codigoEstudiantil]: {
          ...prev[codigoEstudiantil],
          [periodo]: {
            ...prev[codigoEstudiantil]?.[periodo],
            [actividadId]: nuevoComentario,
          },
        },
      }));
      
      console.log('✅ Comentario guardado exitosamente');
      toast({
        title: nuevoComentario ? "Comentario guardado" : "Comentario eliminado",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error de conexión",
        variant: "destructive",
      });
    }
  };

  // Eliminar comentario
  const handleEliminarComentario = async (
    codigoEstudiantil: string,
    actividadId: string,
    nombreActividad: string,
    periodo: number
  ) => {
    try {
      const { error } = await supabase
        .from('Notas')
        .update({ comentario: null })
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('materia', materiaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', periodo)
        .eq('nombre_actividad', nombreActividad);
      
      if (error) {
        console.error('Error eliminando comentario:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el comentario",
          variant: "destructive",
        });
        return;
      }
      
      // Actualizar estado local
      setComentarios(prev => {
        const nuevosComentarios = { ...prev };
        if (nuevosComentarios[codigoEstudiantil]?.[periodo]) {
          delete nuevosComentarios[codigoEstudiantil][periodo][actividadId];
        }
        return nuevosComentarios;
      });
      
      toast({
        title: "Comentario eliminado",
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // ========== FUNCIONES DE NOTIFICACIÓN ==========
  
  // Obtener datos del profesor desde la sesión
  const getProfesorData = () => {
    const session = getSession();
    return {
      codigo: session.codigo,
      nombres: session.nombres,
      apellidos: session.apellidos,
    };
  };

  // Preparar notificación para una nota individual
  const handleNotificarNotaIndividual = (
    estudiante: Estudiante,
    actividad: Actividad,
    nota: number,
    periodo: number
  ) => {
    const datos = [{
      estudiante: {
        codigo: estudiante.codigo_estudiantil,
        nombres: estudiante.nombre_estudiante,
        apellidos: estudiante.apellidos_estudiante,
      },
      actividad: actividad.nombre,
      nota,
      porcentaje: actividad.porcentaje,
      comentario: comentarios[estudiante.codigo_estudiantil]?.[periodo]?.[actividad.id] || null,
      notificado: false,
    }];

    setNotificacionPendiente({
      tipo: "nota_individual",
      descripcion: actividad.nombre,
      nombreEstudiante: `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Preparar notificación para Final Periodo individual
  const handleNotificarFinalPeriodoIndividual = (
    estudiante: Estudiante,
    periodo: number,
    notaFinal: number
  ) => {
    const porcentajeUsado = getPorcentajeUsado(periodo);
    const esCompleto = porcentajeUsado === 100;
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
    
    // Verificar si este estudiante tiene todas las notas de actividades con porcentaje
    const estudianteTieneTodasNotas = actividadesConPorcentaje.every(act => 
      notas[estudiante.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined
    );
    
    const nombrePeriodo = periodos.find(p => p.numero === periodo)?.nombre;
    const nombreCompleto = `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`;
    
    // Determinar tipo de reporte y mensaje
    let tipoReporte: "completo" | "parcial";
    let razonParcial: "periodo_incompleto" | "notas_faltantes" | null = null;
    let descripcion = "";
    
    if (esCompleto && estudianteTieneTodasNotas) {
      tipoReporte = "completo";
      descripcion = `El período está COMPLETO (100%). Se enviará REPORTE FINAL al/los padre(s) de ${nombreCompleto} sobre:\nFinal ${nombrePeriodo}`;
    } else if (esCompleto && !estudianteTieneTodasNotas) {
      tipoReporte = "parcial";
      razonParcial = "notas_faltantes";
      descripcion = `El período está completo (100%) pero ${nombreCompleto} tiene notas no registradas. Se enviará REPORTE PARCIAL al/los padre(s) sobre:\nFinal ${nombrePeriodo}`;
    } else {
      tipoReporte = "parcial";
      razonParcial = "periodo_incompleto";
      descripcion = `El período está INCOMPLETO (${porcentajeUsado}/100%). Se enviará REPORTE PARCIAL con las notas individuales al/los padre(s) de ${nombreCompleto} sobre:\nFinal ${nombrePeriodo}`;
    }
    
    // Obtener detalle de actividades si es parcial
    const notasActividades = actividadesDelPeriodo
      .filter(act => notas[estudiante.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined)
      .map(act => ({
        nombre: act.nombre,
        nota: notas[estudiante.codigo_estudiantil][periodo][act.id],
        porcentaje: act.porcentaje,
      }));
    
    const datos = [{
      estudiante: {
        codigo: estudiante.codigo_estudiantil,
        nombres: estudiante.nombre_estudiante,
        apellidos: estudiante.apellidos_estudiante,
      },
      actividad: `Final ${nombrePeriodo}`,
      nota: notaFinal,
      porcentaje: null,
      comentario: comentarios[estudiante.codigo_estudiantil]?.[periodo]?.[`${periodo}-Final Periodo`] || null,
      notificado: false,
      detalleActividades: notasActividades,
      tipo_reporte_estudiante: tipoReporte,
      razon_parcial: razonParcial,
    }];

    setNotificacionPendiente({
      tipo: esCompleto && estudianteTieneTodasNotas ? "periodo_completo_definitivo" : "periodo_parcial",
      descripcion,
      nombreEstudiante: nombreCompleto,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Preparar notificación para Final Definitiva individual
  const handleNotificarFinalDefinitivaIndividual = (
    estudiante: Estudiante,
    notaFinal: number
  ) => {
    // Verificar completitud de todos los períodos
    const completitudPeriodos = periodos.map(p => ({
      periodo: p.numero,
      porcentaje: getPorcentajeUsado(p.numero)
    }));
    const todosCompletos = completitudPeriodos.every(p => p.porcentaje === 100);
    const promedioCompletitud = Math.round((completitudPeriodos.reduce((sum, p) => sum + p.porcentaje, 0) / 4) * 100) / 100;
    
    // Verificar si este estudiante tiene notas en todos los períodos
    const estudianteTieneTodasNotas = todosCompletos && periodos.every(p => 
      calcularFinalPeriodo(estudiante.codigo_estudiantil, p.numero) !== null
    );
    
    const nombreCompleto = `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`;
    
    // Determinar tipo de reporte y mensaje
    let tipoReporte: "completo" | "parcial";
    let razonParcial: "periodo_incompleto" | "notas_faltantes" | null = null;
    let descripcion = "";
    
    if (todosCompletos && estudianteTieneTodasNotas) {
      tipoReporte = "completo";
      descripcion = `Todos los períodos están COMPLETOS (100%). Se enviará REPORTE FINAL ANUAL al/los padre(s) de ${nombreCompleto} sobre:\nFinal Definitiva`;
    } else if (todosCompletos && !estudianteTieneTodasNotas) {
      tipoReporte = "parcial";
      razonParcial = "notas_faltantes";
      descripcion = `Todos los períodos están completos (100%) pero ${nombreCompleto} tiene notas no registradas. Se enviará REPORTE PARCIAL ANUAL al/los padre(s) sobre:\nFinal Definitiva`;
    } else {
      tipoReporte = "parcial";
      razonParcial = "periodo_incompleto";
      descripcion = `Los períodos NO están completos (${promedioCompletitud}/100%). Se enviará REPORTE PARCIAL ANUAL con las notas de cada período al/los padre(s) de ${nombreCompleto} sobre:\nFinal Definitiva`;
    }
    
    // Obtener detalle de períodos
    const finalesPeriodos = periodos.map(p => ({
      periodo: p.nombre,
      nota: calcularFinalPeriodo(estudiante.codigo_estudiantil, p.numero),
    }));
    
    const datos = [{
      estudiante: {
        codigo: estudiante.codigo_estudiantil,
        nombres: estudiante.nombre_estudiante,
        apellidos: estudiante.apellidos_estudiante,
      },
      actividad: "Final Definitiva",
      nota: notaFinal,
      porcentaje: null,
      comentario: comentarios[estudiante.codigo_estudiantil]?.[0]?.['0-Final Definitiva'] || null,
      notificado: false,
      detallePeriodos: finalesPeriodos,
      tipo_reporte_estudiante: tipoReporte,
      razon_parcial: razonParcial,
    }];

    setNotificacionPendiente({
      tipo: todosCompletos && estudianteTieneTodasNotas ? "definitiva_completa" : "definitiva_parcial",
      descripcion,
      nombreEstudiante: nombreCompleto,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Preparar notificación masiva para una actividad
  const handleNotificarActividad = (actividad: Actividad) => {
    // Contar estudiantes con y sin nota
    const estudiantesConNota = estudiantes.filter(est => 
      notas[est.codigo_estudiantil]?.[actividad.periodo]?.[actividad.id] !== undefined
    );
    const estudiantesSinNota = estudiantes.length - estudiantesConNota.length;
    
    const datos = estudiantesConNota.map(est => ({
      estudiante: {
        codigo: est.codigo_estudiantil,
        nombres: est.nombre_estudiante,
        apellidos: est.apellidos_estudiante,
      },
      actividad: actividad.nombre,
      nota: notas[est.codigo_estudiantil][actividad.periodo][actividad.id],
      porcentaje: actividad.porcentaje,
      comentario: comentarios[est.codigo_estudiantil]?.[actividad.periodo]?.[actividad.id] || null,
      notificado: false,
      tipo_reporte_estudiante: "completo",
      razon_parcial: null,
    }));

    if (datos.length === 0) {
      toast({
        title: "Sin notas",
        description: "No hay notas registradas para esta actividad",
        variant: "destructive",
      });
      return;
    }

    // Construir mensaje según completitud
    let descripcion = "";
    if (estudiantesSinNota === 0) {
      descripcion = `Se enviará notificación a todos los padres de familia sobre:\n${actividad.nombre}`;
    } else {
      descripcion = `Hay ${estudiantesSinNota} estudiante(s) sin nota registrada en esta actividad. Solo se enviará notificación a los padres de los ${estudiantesConNota.length} estudiantes que SÍ tienen nota sobre:\n${actividad.nombre}`;
    }

    setNotificacionPendiente({
      tipo: "actividad_individual",
      descripcion,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Preparar notificación masiva para período completo
  const handleNotificarPeriodoCompleto = (periodo: number) => {
    const porcentajeUsado = getPorcentajeUsado(periodo);
    const esCompleto = porcentajeUsado === 100;
    const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
    const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
    
    // Calcular estudiantes con todas las notas vs con notas faltantes
    const estudiantesConFinal = estudiantes.filter(est => calcularFinalPeriodo(est.codigo_estudiantil, periodo) !== null);
    
    // Contar estudiantes con TODAS las actividades con porcentaje completadas
    const estudiantesCompletos = estudiantesConFinal.filter(est => {
      return actividadesConPorcentaje.every(act => 
        notas[est.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined
      );
    });
    
    const estudiantesIncompletos = estudiantesConFinal.length - estudiantesCompletos.length;
    
    const datos = estudiantesConFinal.map(est => {
      const notasActividades = actividadesDelPeriodo
        .filter(act => notas[est.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined)
        .map(act => ({
          nombre: act.nombre,
          nota: notas[est.codigo_estudiantil][periodo][act.id],
          porcentaje: act.porcentaje,
        }));
      
      const esteEstudianteCompleto = actividadesConPorcentaje.every(act => 
        notas[est.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined
      );

      return {
        estudiante: {
          codigo: est.codigo_estudiantil,
          nombres: est.nombre_estudiante,
          apellidos: est.apellidos_estudiante,
        },
        actividad: `Final ${periodos.find(p => p.numero === periodo)?.nombre}`,
        nota: calcularFinalPeriodo(est.codigo_estudiantil, periodo),
        porcentaje: null,
        comentario: comentarios[est.codigo_estudiantil]?.[periodo]?.[`${periodo}-Final Periodo`] || null,
        notificado: false,
        detalleActividades: notasActividades,
        tipo_reporte_estudiante: (esCompleto && esteEstudianteCompleto) ? "completo" : "parcial",
        razon_parcial: !esCompleto ? "periodo_incompleto" : (!esteEstudianteCompleto ? "notas_faltantes" : null),
      };
    });

    if (datos.length === 0) {
      toast({
        title: "Sin notas",
        description: "No hay notas finales de período calculadas",
        variant: "destructive",
      });
      return;
    }

    // Construir mensaje detallado según completitud
    const nombrePeriodo = periodos.find(p => p.numero === periodo)?.nombre;
    let descripcion = "";
    
    if (esCompleto && estudiantesIncompletos === 0) {
      // Todo completo
      descripcion = `El período está COMPLETO (100%). Se enviará el REPORTE FINAL con la nota definitiva a los padres de familia sobre:\nFinal ${nombrePeriodo}`;
    } else if (esCompleto && estudiantesIncompletos > 0) {
      // Porcentaje completo pero hay estudiantes sin notas
      descripcion = `El período está completo (100%) pero hay ${estudiantesIncompletos} estudiante(s) con notas no registradas. Se enviará REPORTE FINAL a los padres de los ${estudiantesCompletos.length} estudiante(s) con notas completas y REPORTE PARCIAL a los padres de ${estudiantesIncompletos} estudiante(s) sobre:\nFinal ${nombrePeriodo}`;
    } else {
      // Período incompleto
      descripcion = `El período está INCOMPLETO (${porcentajeUsado}/100%). Se enviará un REPORTE PARCIAL con las notas individuales de cada actividad a los padres de familia sobre:\nFinal ${nombrePeriodo}`;
    }

    setNotificacionPendiente({
      tipo: esCompleto ? "periodo_completo_definitivo" : "periodo_parcial",
      descripcion,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Preparar notificación masiva para Final Definitiva
  const handleNotificarDefinitivaMasiva = () => {
    // Verificar completitud de todos los períodos
    const completitudPeriodos = periodos.map(p => ({
      periodo: p.numero,
      porcentaje: getPorcentajeUsado(p.numero)
    }));
    const todosCompletos = completitudPeriodos.every(p => p.porcentaje === 100);
    
    // Calcular promedio de completitud
    const promedioCompletitud = Math.round((completitudPeriodos.reduce((sum, p) => sum + p.porcentaje, 0) / 4) * 100) / 100;
    
    // Contar estudiantes con año completo vs incompleto
    const estudiantesConDefinitiva = estudiantes.filter(est => calcularFinalDefinitiva(est.codigo_estudiantil) !== null);
    
    // Un estudiante está completo si tiene nota en todos los períodos Y todos los períodos están al 100%
    const estudiantesCompletos = estudiantesConDefinitiva.filter(est => {
      if (!todosCompletos) return false;
      // Verificar que tenga nota final en todos los períodos
      for (let p = 1; p <= 4; p++) {
        if (calcularFinalPeriodo(est.codigo_estudiantil, p) === null) return false;
      }
      return true;
    });
    
    const estudiantesIncompletos = estudiantesConDefinitiva.length - estudiantesCompletos.length;
    
    const datos = estudiantesConDefinitiva.map(est => {
      const finalesPeriodos = periodos.map(p => ({
        periodo: p.nombre,
        nota: calcularFinalPeriodo(est.codigo_estudiantil, p.numero),
      }));
      
      const esteEstudianteCompleto = todosCompletos && periodos.every(p => 
        calcularFinalPeriodo(est.codigo_estudiantil, p.numero) !== null
      );

      return {
        estudiante: {
          codigo: est.codigo_estudiantil,
          nombres: est.nombre_estudiante,
          apellidos: est.apellidos_estudiante,
        },
        actividad: "Final Definitiva",
        nota: calcularFinalDefinitiva(est.codigo_estudiantil),
        porcentaje: null,
        comentario: comentarios[est.codigo_estudiantil]?.[0]?.['0-Final Definitiva'] || null,
        notificado: false,
        detallePeriodos: finalesPeriodos,
        tipo_reporte_estudiante: esteEstudianteCompleto ? "completo" : "parcial",
        razon_parcial: !todosCompletos ? "periodo_incompleto" : (!esteEstudianteCompleto ? "notas_faltantes" : null),
      };
    });

    if (datos.length === 0) {
      toast({
        title: "Sin notas",
        description: "No hay notas definitivas calculadas",
        variant: "destructive",
      });
      return;
    }

    // Construir mensaje detallado según completitud
    let descripcion = "";
    
    if (todosCompletos && estudiantesIncompletos === 0) {
      // Todo completo
      descripcion = `Todos los períodos están COMPLETOS (100%). Se enviará el REPORTE FINAL ANUAL con la nota definitiva del año a los padres de familia sobre:\nFinal Definitiva`;
    } else if (todosCompletos && estudiantesIncompletos > 0) {
      // Períodos completos pero hay estudiantes con notas faltantes
      descripcion = `Todos los períodos están completos (100%) pero hay ${estudiantesIncompletos} estudiante(s) con notas no registradas. Se enviará REPORTE FINAL ANUAL a los padres de los ${estudiantesCompletos.length} estudiante(s) con notas completas y REPORTE PARCIAL a los padres de ${estudiantesIncompletos} estudiante(s) sobre:\nFinal Definitiva`;
    } else {
      // Períodos incompletos
      descripcion = `Los períodos NO están completos (${promedioCompletitud}/100%). Se enviará un REPORTE PARCIAL ANUAL con las notas de cada período a los padres de familia sobre:\nFinal Definitiva`;
    }

    setNotificacionPendiente({
      tipo: todosCompletos ? "definitiva_completa" : "definitiva_parcial",
      descripcion,
      datos,
    });
    setNotificacionModalOpen(true);
  };

  // Función para enviar datos al webhook de n8n
  const enviarNotificacionN8n = async (payload: any) => {
    try {
      console.log('📤 Enviando a n8n:', payload);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error HTTP ${response.status}: ${errorText}`);
      }

      const resultado = await response.json();
      console.log('✅ Respuesta de n8n:', resultado);
      return { success: true, data: resultado };
    } catch (error) {
      console.error('❌ Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  };

  // Enviar notificación simplificada a n8n
  const handleEnviarNotificacion = async () => {
    if (!notificacionPendiente) return;

    const session = getSession();
    if (!session.codigo) {
      toast({
        title: "Error",
        description: "Código del profesor no encontrado",
        variant: "destructive",
      });
      return;
    }

    const esDefinitiva = notificacionPendiente.tipo === "definitiva_completa" || notificacionPendiente.tipo === "definitiva_parcial";
    
    // Determinar tipo_boton basado en el tipo de notificación y cantidad de estudiantes
    const esIndividual = notificacionPendiente.datos.length === 1;
    let tipoBoton = "";
    
    if (notificacionPendiente.tipo === "actividad_individual" || notificacionPendiente.tipo === "nota_individual") {
      tipoBoton = esIndividual ? "actividad_individual" : "actividad_masiva";
    } else if (notificacionPendiente.tipo === "periodo_completo_definitivo" || notificacionPendiente.tipo === "periodo_parcial") {
      tipoBoton = esIndividual ? "periodo_individual" : "periodo_masivo";
    } else if (notificacionPendiente.tipo === "definitiva_completa" || notificacionPendiente.tipo === "definitiva_parcial") {
      tipoBoton = esIndividual ? "definitiva_individual" : "definitiva_masivo";
    }

    // Extraer nombre de actividad si aplica
    const nombreActividad = notificacionPendiente.datos[0]?.actividad || null;
    const esActividadFinal = nombreActividad?.includes("Final");

    // Preparar payload SIMPLE para n8n
    const payload = {
      tipo_boton: tipoBoton,
      profesor_codigo: session.codigo,
      contexto: {
        materia: materiaSeleccionada,
        grado: gradoSeleccionado,
        salon: salonSeleccionado,
        periodo: esDefinitiva ? 0 : periodoActivo
      },
      actividad: esActividadFinal ? null : nombreActividad,
      estudiantes_codigos: notificacionPendiente.datos.map((d: any) => d.estudiante.codigo)
    };

    // Cerrar modal
    setNotificacionModalOpen(false);

    // Mostrar loading
    const toastId = sonnerToast.loading(
      `Enviando notificaciones a padres de ${payload.estudiantes_codigos.length} estudiante(s)...`
    );

    // Enviar a n8n
    const resultado = await enviarNotificacionN8n(payload);

    // Quitar loading
    sonnerToast.dismiss(toastId);

    // Mostrar resultado
    if (resultado.success) {
      sonnerToast.success(
        `✅ Notificaciones enviadas a padres de ${payload.estudiantes_codigos.length} estudiante(s)`,
        { duration: 5000 }
      );
      
      // Marcar como notificado en Supabase
      try {
        for (const dato of notificacionPendiente.datos) {
          const actividadNombre = dato.actividad;
          
          let periodoReal = periodoActivo;
          if (esDefinitiva) {
            periodoReal = 0;
          } else if (actividadNombre?.includes("Final")) {
            const match = actividadNombre.match(/(\d)/);
            if (match) {
              periodoReal = parseInt(match[1]);
            }
          }

          await supabase
            .from('Notas')
            .update({ notificado: true })
            .eq('codigo_estudiantil', dato.estudiante.codigo)
            .eq('materia', materiaSeleccionada)
            .eq('grado', gradoSeleccionado)
            .eq('salon', salonSeleccionado)
            .eq('periodo', periodoReal)
            .eq('nombre_actividad', actividadNombre === "Final Definitiva" ? "Final Definitiva" : 
              actividadNombre?.includes("Final") ? "Final Periodo" : actividadNombre);
        }
      } catch (error) {
        console.error('Error marcando como notificado:', error);
      }
    } else {
      sonnerToast.error(
        `❌ Error: ${resultado.error}`,
        { duration: 7000 }
      );
    }

    setNotificacionPendiente(null);
  };

  // Verificar si una actividad tiene al menos una nota
  const actividadTieneNotas = (actividad: Actividad): boolean => {
    return estudiantes.some(est => 
      notas[est.codigo_estudiantil]?.[actividad.periodo]?.[actividad.id] !== undefined
    );
  };

  // Verificar si un período tiene al menos un Final calculado
  const periodoTieneFinal = (periodo: number): boolean => {
    return estudiantes.some(est => calcularFinalPeriodo(est.codigo_estudiantil, periodo) !== null);
  };

  // Verificar si hay al menos una Final Definitiva calculada
  const hayFinalDefinitiva = (): boolean => {
    return estudiantes.some(est => calcularFinalDefinitiva(est.codigo_estudiantil) !== null);
  };

  // ========== FIN FUNCIONES DE NOTIFICACIÓN ==========

  // Función para enfocar la siguiente celda (abajo)
  const focusCeldaAbajo = useCallback((currentStudentIndex: number, actividadId: string, periodo: number) => {
    const nextStudentIndex = currentStudentIndex + 1;
    
    // Si no hay más estudiantes, no hacer nada
    if (nextStudentIndex >= estudiantes.length) return;
    
    const nextStudent = estudiantes[nextStudentIndex];
    const nota = notas[nextStudent.codigo_estudiantil]?.[periodo]?.[actividadId];
    
    // Activar edición en la siguiente celda
    setCeldaEditando({ 
      codigoEstudiantil: nextStudent.codigo_estudiantil, 
      actividadId, 
      periodo 
    });
    setValorEditando(nota !== undefined ? nota.toString() : "");
  }, [estudiantes, notas]);

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

  const handleGuardarNota = async () => {
    if (!celdaEditando) return;

    const { codigoEstudiantil, actividadId, periodo } = celdaEditando;
    
    // Encontrar la actividad para obtener nombre y porcentaje
    const actividad = actividades.find(a => a.id === actividadId);
    if (!actividad) {
      console.error("Actividad no encontrada:", actividadId);
      setCeldaEditando(null);
      setValorEditando("");
      return;
    }

    if (valorEditando.trim() === "") {
      // Si está vacío, eliminar la nota de Supabase
      try {
        console.log("=== ELIMINANDO NOTA ===");
        const { error } = await supabase
          .from('Notas')
          .delete()
          .eq('codigo_estudiantil', codigoEstudiantil)
          .eq('materia', materiaSeleccionada)
          .eq('grado', gradoSeleccionado)
          .eq('salon', salonSeleccionado)
          .eq('periodo', periodo)
          .eq('nombre_actividad', actividad.nombre);

        if (error) {
          console.error('Error eliminando nota:', error);
          toast({
            title: "Error",
            description: "No se pudo eliminar la nota",
            variant: "destructive",
          });
        } else {
          // Actualizar estado local de notas
          let nuevasNotas = { ...notas };
          if (nuevasNotas[codigoEstudiantil]?.[periodo]?.[actividadId] !== undefined) {
            delete nuevasNotas[codigoEstudiantil][periodo][actividadId];
          }
          setNotas(nuevasNotas);
          
          // IMPORTANTE: Eliminar comentario del estado local para quitar indicador naranja
          setComentarios(prev => {
            const nuevosComentarios = { ...prev };
            if (nuevosComentarios[codigoEstudiantil]?.[periodo]?.[actividadId] !== undefined) {
              delete nuevosComentarios[codigoEstudiantil][periodo][actividadId];
            }
            return nuevosComentarios;
          });
          
          console.log("Nota eliminada correctamente");
          
          // Recalcular y guardar Final Periodo y Final Definitiva
          setTimeout(async () => {
            const notaFinal = calcularFinalPeriodoConNotas(nuevasNotas, codigoEstudiantil, periodo);
            await guardarFinalPeriodo(codigoEstudiantil, periodo, notaFinal);
            
            // Recalcular y guardar Final Definitiva
            let suma = 0;
            let tieneAlgunaNota = false;
            for (let p = 1; p <= 4; p++) {
              const fp = calcularFinalPeriodoConNotas(nuevasNotas, codigoEstudiantil, p);
              if (fp !== null) {
                suma += fp;
                tieneAlgunaNota = true;
              }
            }
            if (tieneAlgunaNota) {
              const finalDef = Math.round((suma / 4) * 100) / 100;
              await guardarFinalDefinitiva(codigoEstudiantil, finalDef);
            } else {
              await guardarFinalDefinitiva(codigoEstudiantil, null);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Error de conexión al eliminar la nota",
          variant: "destructive",
        });
      }
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

      const notaRedondeada = Math.round(nota * 100) / 100;

      // Guardar en Supabase con UPSERT
      try {
        console.log("=== GUARDANDO NOTA ===");
        console.log("Datos:", {
          codigo_estudiantil: codigoEstudiantil,
          materia: materiaSeleccionada,
          grado: gradoSeleccionado,
          salon: salonSeleccionado,
          periodo,
          nombre_actividad: actividad.nombre,
          porcentaje: actividad.porcentaje,
          nota: notaRedondeada,
        });

        const { error } = await supabase
          .from('Notas')
          .upsert({
            codigo_estudiantil: codigoEstudiantil,
            materia: materiaSeleccionada,
            grado: gradoSeleccionado,
            salon: salonSeleccionado,
            periodo,
            nombre_actividad: actividad.nombre,
            porcentaje: actividad.porcentaje,
            nota: notaRedondeada,
            comentario: comentarios[codigoEstudiantil]?.[periodo]?.[actividadId] || null,
            notificado: false,
          }, {
            onConflict: 'codigo_estudiantil,materia,grado,salon,periodo,nombre_actividad'
          });

        if (error) {
          console.error('Error guardando nota:', error);
          toast({
            title: "Error",
            description: "No se pudo guardar la nota",
            variant: "destructive",
          });
        } else {
          // Actualizar estado local
          const nuevasNotas = {
            ...notas,
            [codigoEstudiantil]: {
              ...notas[codigoEstudiantil],
              [periodo]: {
                ...notas[codigoEstudiantil]?.[periodo],
                [actividadId]: notaRedondeada,
              },
            },
          };
          setNotas(nuevasNotas);
          console.log("Nota guardada correctamente:", notaRedondeada);
          
          // Calcular y guardar Final Periodo y Final Definitiva después de actualizar el estado
          setTimeout(async () => {
            const notaFinal = calcularFinalPeriodoConNotas(nuevasNotas, codigoEstudiantil, periodo);
            await guardarFinalPeriodo(codigoEstudiantil, periodo, notaFinal);
            
            // Recalcular y guardar Final Definitiva (siempre divide entre 4)
            let suma = 0;
            let tieneAlgunaNota = false;
            for (let p = 1; p <= 4; p++) {
              const fp = calcularFinalPeriodoConNotas(nuevasNotas, codigoEstudiantil, p);
              if (fp !== null) {
                suma += fp;
                tieneAlgunaNota = true;
              }
              // Si es null, cuenta como 0
            }
            if (tieneAlgunaNota) {
              const finalDef = Math.round((suma / 4) * 100) / 100;
              await guardarFinalDefinitiva(codigoEstudiantil, finalDef);
            } else {
              await guardarFinalDefinitiva(codigoEstudiantil, null);
            }
          }, 0);
        }
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Error de conexión al guardar la nota",
          variant: "destructive",
        });
      }
    }

    setCeldaEditando(null);
    setValorEditando("");
  };

  // Handler para cuando se presiona Enter (navegar a celda de abajo)
  const handleKeyDownNota = async (e: React.KeyboardEvent<HTMLInputElement>, studentIndex: number, actividadId: string, periodo: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Marcar que estamos navegando (evita doble guardado con onBlur)
      isNavigating.current = true;
      // Primero guardar la nota (esperar a que termine)
      await handleGuardarNota();
      // Luego mover a la siguiente celda
      focusCeldaAbajo(studentIndex, actividadId, periodo);
      // Resetear el flag después de un pequeño delay
      setTimeout(() => {
        isNavigating.current = false;
      }, 100);
    } else if (e.key === 'Escape') {
      setCeldaEditando(null);
      setValorEditando("");
    }
  };

  // Efecto para enfocar el input cuando cambia la celda editando
  useEffect(() => {
    if (celdaEditando) {
      const key = `${celdaEditando.codigoEstudiantil}-${celdaEditando.actividadId}`;
      // Pequeño delay para asegurar que el input se ha renderizado
      setTimeout(() => {
        const input = inputRefs.current[key];
        if (input) {
          input.focus();
          input.select();
        }
      }, 10);
    }
  }, [celdaEditando]);

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
          <div className="flex flex-wrap items-center justify-between gap-4">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/actividades-calendario")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Ver Actividades Asignadas
            </Button>
          </div>
        </div>

        {/* Pestañas de Períodos */}
        <div className="bg-card rounded-lg shadow-soft overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-border">
            {periodos.map((periodo) => {
              const porcentajeUsado = getPorcentajeUsado(periodo.numero);
              const isActive = periodoActivo === periodo.numero;
              return (
                <button
                  key={periodo.numero}
                  onClick={() => setPeriodoActivo(periodo.numero)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span>{periodo.nombre}</span>
                  <span className={`ml-2 text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    ({porcentajeUsado}%)
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                  )}
                </button>
              );
            })}
            {/* Pestaña Final Definitiva */}
            {(() => {
              const porcentajePromedio = getPorcentajePromedioAnual();
              const estaCompleto = porcentajePromedio === 100;
              return (
                <button
                  onClick={() => setPeriodoActivo(0)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative
                    ${esFinalDefinitiva 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    Final Definitiva 
                    <span className={estaCompleto ? 'text-green-300' : ''}>
                      ({porcentajePromedio}/100%)
                    </span>
                    {estaCompleto && <span>✓</span>}
                  </span>
                  {esFinalDefinitiva && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-foreground" />
                  )}
                </button>
              );
            })()}
          </div>

          {/* Tabla de Notas */}
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
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    {/* Columnas fijas */}
                    <th className="sticky left-0 z-20 bg-primary border border-border/30 w-[100px] min-w-[100px] p-3 text-left font-semibold">
                      Código
                    </th>
                    <th className="sticky left-[100px] z-20 bg-primary border border-border/30 w-[180px] min-w-[180px] p-3 text-left font-semibold">
                      Apellidos
                    </th>
                    <th className="sticky left-[280px] z-20 bg-primary border border-border/30 w-[150px] min-w-[150px] p-3 text-left font-semibold">
                      Nombre
                    </th>
                    
                    {/* Vista Final Definitiva */}
                    {esFinalDefinitiva ? (
                      <>
                        {periodos.map((periodo) => (
                          <th 
                            key={periodo.numero}
                            className="border border-border/30 p-2 text-center text-xs font-medium min-w-[120px] bg-primary/80"
                          >
                            {periodo.nombre}
                          </th>
                        ))}
                        <th className="border border-border/30 p-2 text-center text-xs font-semibold min-w-[130px] bg-primary" id="col-final-definitiva">
                          Final Definitiva
                        </th>
                      </>
                    ) : (
                      <>
                        {/* Columnas de actividades del período activo */}
                        {getActividadesPorPeriodo(periodoActivo).map((actividad) => (
                          <th 
                            key={actividad.id}
                            className="border border-border/30 p-2 text-center text-xs font-medium min-w-[120px] bg-primary/90"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <div className="flex-1 min-w-0">
                                <div className="truncate" title={actividad.nombre}>
                                  {actividad.nombre}
                                </div>
                                {actividad.porcentaje !== null && (
                                  <div className="text-primary-foreground/70 text-xs">
                                    ({actividad.porcentaje}%)
                                  </div>
                                )}
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1 hover:bg-primary-foreground/20 rounded transition-colors">
                                    <MoreVertical className="w-3 h-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background z-50">
                                  <DropdownMenuItem onClick={() => handleAbrirModalEditar(actividad)}>
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar actividad
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleConfirmarEliminar(actividad)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar actividad
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </th>
                        ))}
                        {/* Botón Agregar */}
                        <th className="border border-border/30 p-2 text-center min-w-[100px] bg-primary/90">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                            onClick={() => handleAbrirModal(periodoActivo)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Agregar
                          </Button>
                        </th>
                        {/* Header columna Final Periodo con porcentaje */}
                        {(() => {
                          const porcentajeUsado = getPorcentajeUsado(periodoActivo);
                          const isComplete = porcentajeUsado === 100;
                          return (
                            <th className="border border-border/30 p-2 text-center text-xs font-medium min-w-[130px] bg-primary">
                              <div className="flex flex-col items-center">
                                <span>Final Periodo</span>
                                <span className={`text-xs ${isComplete ? 'text-green-300' : 'text-primary-foreground/70'}`}>
                                  ({porcentajeUsado}/100%)
                                  {isComplete && ' ✓'}
                                </span>
                              </div>
                            </th>
                          );
                        })()}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((estudiante, studentIndex) => {
                    const rowBg = studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30';
                    
                    return (
                      <tr 
                        key={estudiante.codigo_estudiantil}
                        className={rowBg}
                      >
                        {/* Fixed columns */}
                        <td className={`sticky left-0 z-10 border border-border p-3 text-sm ${rowBg}`}>
                          {estudiante.codigo_estudiantil}
                        </td>
                        <td className={`sticky left-[100px] z-10 border border-border p-3 text-sm font-medium ${rowBg}`}>
                          {estudiante.apellidos_estudiante}
                        </td>
                        <td className={`sticky left-[280px] z-10 border border-border p-3 text-sm ${rowBg}`}>
                          {estudiante.nombre_estudiante}
                        </td>
                        
                        {/* Vista Final Definitiva */}
                        {esFinalDefinitiva ? (
                          <>
                            {periodos.map((periodo) => {
                              const finalPeriodo = calcularFinalPeriodo(estudiante.codigo_estudiantil, periodo.numero);
                              const comentario = comentarios[estudiante.codigo_estudiantil]?.[periodo.numero]?.[`${periodo.numero}-Final Periodo`] || null;
                              return (
                                <FinalPeriodoCelda
                                  key={periodo.numero}
                                  notaFinal={finalPeriodo}
                                  comentario={comentario}
                                  onAbrirComentario={() => handleAbrirComentario(
                                    estudiante.codigo_estudiantil,
                                    `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`,
                                    `${periodo.numero}-Final Periodo`,
                                    `Final ${periodo.nombre}`,
                                    periodo.numero
                                  )}
                                  onEliminarComentario={() => handleEliminarComentario(
                                    estudiante.codigo_estudiantil,
                                    `${periodo.numero}-Final Periodo`,
                                    'Final Periodo',
                                    periodo.numero
                                  )}
                                  onNotificarPadre={finalPeriodo !== null ? () => handleNotificarFinalPeriodoIndividual(estudiante, periodo.numero, finalPeriodo) : undefined}
                                />
                              );
                            })}
                            {/* Celda Final Definitiva */}
                            {(() => {
                              const finalDef = calcularFinalDefinitiva(estudiante.codigo_estudiantil);
                              const comentario = comentarios[estudiante.codigo_estudiantil]?.[0]?.['0-Final Definitiva'] || null;
                              return (
                                <td className="border border-border p-1 text-center text-sm min-w-[130px] bg-primary/20 font-bold relative group">
                                  <div className="relative flex items-center justify-center h-8">
                                    <span className={finalDef !== null ? "" : "text-muted-foreground"}>
                                      {finalDef !== null ? finalDef.toFixed(2) : "—"}
                                    </span>
                                    {comentario && finalDef !== null && (
                                      <div className="absolute top-0 right-6 w-2 h-2 bg-amber-500 rounded-full" title={comentario} />
                                    )}
                                    {finalDef !== null && (
                                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <button className="p-1 hover:bg-muted rounded transition-colors">
                                              <MoreVertical className="w-3 h-3 text-muted-foreground" />
                                            </button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="bg-background z-50">
                                            <DropdownMenuItem onClick={() => handleAbrirComentario(
                                              estudiante.codigo_estudiantil,
                                              `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`,
                                              '0-Final Definitiva',
                                              'Final Definitiva',
                                              0
                                            )}>
                                              {comentario ? "Editar comentario" : "Agregar comentario"}
                                            </DropdownMenuItem>
                                            {comentario && (
                                              <DropdownMenuItem 
                                                onClick={() => handleEliminarComentario(
                                                  estudiante.codigo_estudiantil,
                                                  '0-Final Definitiva',
                                                  'Final Definitiva',
                                                  0
                                                )}
                                                className="text-destructive focus:text-destructive"
                                              >
                                                Eliminar comentario
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleNotificarFinalDefinitivaIndividual(estudiante, finalDef)}>
                                              <Send className="w-4 h-4 mr-2" />
                                              Notificar a padre(s)
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            {/* Celdas de actividades del período activo */}
                            {getActividadesPorPeriodo(periodoActivo).map((actividad) => {
                              const nota = notas[estudiante.codigo_estudiantil]?.[periodoActivo]?.[actividad.id];
                              const estaEditando = celdaEditando?.codigoEstudiantil === estudiante.codigo_estudiantil 
                                && celdaEditando?.actividadId === actividad.id;
                              const inputKey = `${estudiante.codigo_estudiantil}-${actividad.id}`;
                              
                              return (
                                <NotaCelda
                                  key={inputKey}
                                  nota={nota}
                                  comentario={comentarios[estudiante.codigo_estudiantil]?.[periodoActivo]?.[actividad.id] || null}
                                  estaEditando={estaEditando}
                                  valorEditando={valorEditando}
                                  inputRef={(el) => { inputRefs.current[inputKey] = el; }}
                                  onCambioNota={handleCambioNota}
                                  onBlur={() => {
                                    if (!isNavigating.current) {
                                      handleGuardarNota();
                                    }
                                  }}
                                  onKeyDown={(e) => handleKeyDownNota(e, studentIndex, actividad.id, periodoActivo)}
                                  onClick={() => handleClickCelda(estudiante.codigo_estudiantil, actividad.id, periodoActivo, nota)}
                                  onAbrirComentario={() => handleAbrirComentario(
                                    estudiante.codigo_estudiantil,
                                    `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`,
                                    actividad.id,
                                    actividad.nombre,
                                    periodoActivo
                                  )}
                                  onEliminarComentario={() => handleEliminarComentario(
                                    estudiante.codigo_estudiantil,
                                    actividad.id,
                                    actividad.nombre,
                                    periodoActivo
                                  )}
                                  onNotificarPadre={nota !== undefined ? () => handleNotificarNotaIndividual(estudiante, actividad, nota, periodoActivo) : undefined}
                                />
                              );
                            })}
                            {/* Celda vacía bajo botón Agregar */}
                            <td className="border border-border p-3 text-center text-sm text-muted-foreground/50 min-w-[100px]">
                              
                            </td>
                            {/* Celda Final Periodo */}
                            {(() => {
                              const notaFinal = calcularFinalPeriodo(estudiante.codigo_estudiantil, periodoActivo);
                              return (
                                <FinalPeriodoCelda
                                  notaFinal={notaFinal}
                                  comentario={comentarios[estudiante.codigo_estudiantil]?.[periodoActivo]?.[`${periodoActivo}-Final Periodo`] || null}
                                  onAbrirComentario={() => handleAbrirComentario(
                                    estudiante.codigo_estudiantil,
                                    `${estudiante.nombre_estudiante} ${estudiante.apellidos_estudiante}`,
                                    `${periodoActivo}-Final Periodo`,
                                    'Final Periodo',
                                    periodoActivo
                                  )}
                                  onEliminarComentario={() => handleEliminarComentario(
                                    estudiante.codigo_estudiantil,
                                    `${periodoActivo}-Final Periodo`,
                                    'Final Periodo',
                                    periodoActivo
                                  )}
                                  onNotificarPadre={notaFinal !== null ? () => handleNotificarFinalPeriodoIndividual(estudiante, periodoActivo, notaFinal) : undefined}
                                />
                              );
                            })()}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {/* Fila de botones de notificación integrados en la tabla */}
                <tfoot>
                  <tr className="bg-muted/30">
                    {/* Celdas fijas vacías */}
                    <td className="sticky left-0 z-10 bg-muted/30 border border-border p-1"></td>
                    <td className="sticky left-[100px] z-10 bg-muted/30 border border-border p-1"></td>
                    <td className="sticky left-[280px] z-10 bg-muted/30 border border-border p-1"></td>
                    
                    {esFinalDefinitiva ? (
                      <>
                        {/* Celdas vacías para períodos */}
                        {periodos.map((periodo) => (
                          <td key={periodo.numero} className="border border-border p-1 text-center"></td>
                        ))}
                        {/* Botón Final Definitiva */}
                        <td className="border border-border p-1 text-center">
                          {hayFinalDefinitiva() && (
                            <button
                              onClick={handleNotificarDefinitivaMasiva}
                              className="w-full px-1 py-1 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex flex-col items-center justify-center h-10"
                            >
                              <span className="text-[10px]">📱 Notificar</span>
                              <span className="font-semibold text-[10px] leading-tight">Final Definitiva</span>
                            </button>
                          )}
                        </td>
                      </>
                    ) : (
                      <>
                        {/* Botones para cada actividad */}
                        {getActividadesPorPeriodo(periodoActivo).map((actividad) => (
                          <td key={actividad.id} className="border border-border p-1 text-center">
                            {actividadTieneNotas(actividad) && (
                              <button
                                onClick={() => handleNotificarActividad(actividad)}
                                className="w-full px-1 py-1 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex flex-col items-center justify-center h-10"
                                title={`Notificar ${actividad.nombre}`}
                              >
                                <span className="text-[10px]">📱 Notificar</span>
                                <span className="font-semibold text-[10px] leading-tight truncate max-w-full">{actividad.nombre}</span>
                              </button>
                            )}
                          </td>
                        ))}
                        {/* Celda vacía bajo botón Agregar */}
                        <td className="border border-border p-1 min-w-[100px]"></td>
                        {/* Botón Final Periodo */}
                        <td className="border border-border p-1 text-center">
                          {periodoTieneFinal(periodoActivo) && (
                            <button
                              onClick={() => handleNotificarPeriodoCompleto(periodoActivo)}
                              className="w-full px-1 py-1 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex flex-col items-center justify-center h-10"
                            >
                              <span className="text-[10px]">📱 Notificar</span>
                              <span className="font-semibold text-[10px] leading-tight">Final Periodo</span>
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal para crear/editar actividad */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {actividadEditando ? "Editar Actividad" : "Nueva Actividad"} - {periodos[periodoActual - 1]?.nombre}
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
                Porcentaje usado: {getPorcentajeUsadoParaModal()}% / 100%
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarActividad} className="bg-primary hover:bg-primary/90">
              {actividadEditando ? "Guardar cambios" : "Crear Actividad"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar "{actividadAEliminar?.nombre}"? Se borrarán todas las notas de esta actividad. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEliminarActividad}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para comentarios */}
      <ComentarioModal
        open={comentarioModalOpen}
        onOpenChange={setComentarioModalOpen}
        nombreEstudiante={comentarioEditando?.nombreEstudiante || ""}
        nombreActividad={comentarioEditando?.nombreActividad || ""}
        comentarioActual={comentarioEditando ? (comentarios[comentarioEditando.codigoEstudiantil]?.[comentarioEditando.periodo]?.[comentarioEditando.actividadId] || null) : null}
        onGuardar={handleGuardarComentario}
      />

      {/* Modal para notificaciones */}
      <NotificacionModal
        open={notificacionModalOpen}
        onOpenChange={setNotificacionModalOpen}
        tipoNotificacion={notificacionPendiente?.tipo || "nota_individual"}
        descripcion={notificacionPendiente?.descripcion || ""}
        nombreEstudiante={notificacionPendiente?.nombreEstudiante}
        onConfirmar={handleEnviarNotificacion}
      />
    </div>
  );
};

export default TablaNotas;