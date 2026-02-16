import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MoreVertical, Pencil, Trash2, Send, Calendar, Download, FileSpreadsheet, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import escudoImg from "@/assets/escudo.png";
import NotaCelda from "@/components/notas/NotaCelda";
import FinalPeriodoCelda from "@/components/notas/FinalPeriodoCelda";
import ComentarioModal from "@/components/notas/ComentarioModal";
import NotificacionModal, { TipoNotificacion } from "@/components/notas/NotificacionModal";

// Configuración del webhook de n8n
const N8N_WEBHOOK_URL = 'https://n8n.srv966880.hstgr.cloud/webhook/notificar-notas';

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
  const [asignaturaSeleccionada, setAsignaturaSeleccionada] = useState("");
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

  // Estado para crear actividad en múltiples salones
  const [otrosSalones, setOtrosSalones] = useState<string[]>([]);
  const [crearParaTodosSalones, setCrearParaTodosSalones] = useState(false);
  const [guardandoMultiple, setGuardandoMultiple] = useState(false);

  // Estado para descargas
  const [descargandoPDF, setDescargandoPDF] = useState(false);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
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
      const storedAsignatura = localStorage.getItem("asignaturaSeleccionada");
      const storedGrado = localStorage.getItem("gradoSeleccionado");
      const storedSalon = localStorage.getItem("salonSeleccionado");

      if (!storedAsignatura) {
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

      setAsignaturaSeleccionada(storedAsignatura);
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
          .eq('asignatura', storedAsignatura)
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
          .eq('asignatura', storedAsignatura)
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

      // Cargar otros salones en background (no bloquea la UI)
      try {
        const { data: profesor } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .maybeSingle();

        if (profesor) {
          const { data: asignaciones } = await supabase
            .from('Asignación Profesores')
            .select('"Asignatura(s)", "Grado(s)", "Salon(es)"')
            .eq('id', profesor.id);

          if (asignaciones) {
            const asignacionesFiltradas = asignaciones.filter(a => {
              const asignaturas = (a['Asignatura(s)'] || []).flat();
              const grados = (a['Grado(s)'] || []).flat();
              return asignaturas.includes(storedAsignatura) && grados.includes(storedGrado);
            });

            const todosSalones = asignacionesFiltradas
              .flatMap(a => a['Salon(es)'] || [])
              .flat();
            const salonesUnicos = [...new Set(todosSalones)].filter(s => s !== storedSalon);
            setOtrosSalones(salonesUnicos);
          }
        }
      } catch (error) {
        console.error('Error obteniendo otros salones:', error);
      }
    };

    inicializar();
  }, [navigate]);

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

  // Verificar si al menos un período tiene porcentaje completo (100%) Y el estudiante tiene TODAS las notas
  const tieneAlMenosUnPeriodoCompletoConTodasNotas = (codigoEstudiantil: string): boolean => {
    for (let periodo = 1; periodo <= 4; periodo++) {
      // 1. Verificar que el período esté al 100%
      const porcentajeUsado = getPorcentajeUsado(periodo);
      if (porcentajeUsado !== 100) continue;
      
      // 2. Verificar que el estudiante tenga Final Periodo calculado
      const finalPeriodo = calcularFinalPeriodo(codigoEstudiantil, periodo);
      if (finalPeriodo === null) continue;
      
      // 3. Verificar que el estudiante tenga TODAS las actividades con porcentaje calificadas
      const actividadesDelPeriodo = getActividadesPorPeriodo(periodo);
      const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
      
      const todasCalificadas = actividadesConPorcentaje.every(actividad => {
        const nota = notas[codigoEstudiantil]?.[periodo]?.[actividad.id];
        return nota !== undefined;
      });
      
      // Si este período cumple TODAS las condiciones, retornar true
      if (todasCalificadas) {
        return true;
      }
    }
    
    // Ningún período cumple todas las condiciones
    return false;
  };

  const handleAbrirModal = (periodo: number) => {
    setPeriodoActual(periodo);
    setNombreActividad("");
    setPorcentajeActividad("");
    setActividadEditando(null);
    setCrearParaTodosSalones(false);
    setModalOpen(true);
  };

  const handleAbrirModalEditar = (actividad: Actividad) => {
    setPeriodoActual(actividad.periodo);
    setNombreActividad(actividad.nombre);
    setPorcentajeActividad(actividad.porcentaje?.toString() || "");
    setActividadEditando(actividad);
    setCrearParaTodosSalones(false);
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
          .eq('asignatura', asignaturaSeleccionada)
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
            .eq('asignatura', asignaturaSeleccionada)
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

      const session = getSession();
      const salonesParaCrear = crearParaTodosSalones && otrosSalones.length > 0
        ? [salonSeleccionado, ...otrosSalones]
        : [salonSeleccionado];

      // Validar porcentaje en otros salones si aplica
      if (crearParaTodosSalones && otrosSalones.length > 0 && porcentaje !== null) {
        setGuardandoMultiple(true);
        try {
          const { data: actividadesOtros, error: errorOtros } = await supabase
            .from('Nombre de Actividades')
            .select('salon, porcentaje')
            .eq('codigo_profesor', session.codigo)
            .eq('asignatura', asignaturaSeleccionada)
            .eq('grado', gradoSeleccionado)
            .in('salon', otrosSalones)
            .eq('periodo', periodoActual)
            .not('porcentaje', 'is', null);

          if (errorOtros) {
            console.error('Error verificando porcentajes:', errorOtros);
            setGuardandoMultiple(false);
            toast({ title: "Error", description: "No se pudo verificar los porcentajes de otros salones", variant: "destructive" });
            return;
          }

          // Calcular porcentaje usado por salón
          const porcentajePorSalon: { [salon: string]: number } = {};
          (actividadesOtros || []).forEach(a => {
            porcentajePorSalon[a.salon] = (porcentajePorSalon[a.salon] || 0) + (a.porcentaje || 0);
          });

          const salonesExcedidos = otrosSalones.filter(s => {
            const usado = porcentajePorSalon[s] || 0;
            return usado + porcentaje > 100;
          });

          if (salonesExcedidos.length > 0) {
            setGuardandoMultiple(false);
            toast({
              title: "Error de porcentaje",
              description: `El porcentaje superaría 100% en: ${salonesExcedidos.join(', ')}`,
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          console.error('Error:', error);
          setGuardandoMultiple(false);
          toast({ title: "Error", description: "Error de conexión al verificar porcentajes", variant: "destructive" });
          return;
        }
      }

      // Construir filas para insertar
      const filasParaInsertar = salonesParaCrear.map(salon => ({
        codigo_profesor: session.codigo,
        asignatura: asignaturaSeleccionada,
        grado: gradoSeleccionado,
        salon: salon,
        periodo: periodoActual,
        nombre_actividad: nombreTrimmed,
        porcentaje: porcentaje,
      }));

      try {
        const { error } = await supabase
          .from('Nombre de Actividades')
          .insert(filasParaInsertar);

        if (error) {
          console.error('Error guardando actividad:', error);
          toast({
            title: "Error",
            description: "No se pudo guardar la actividad",
            variant: "destructive",
          });
          setGuardandoMultiple(false);
          return;
        }

        console.log(`✅ Actividad guardada en ${salonesParaCrear.length} salón(es)`);
      } catch (error) {
        console.error('Error:', error);
        toast({
          title: "Error",
          description: "Error de conexión al guardar la actividad",
          variant: "destructive",
        });
        setGuardandoMultiple(false);
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
      setGuardandoMultiple(false);

      if (salonesParaCrear.length > 1) {
        toast({
          title: "Actividad creada",
          description: `"${nuevaActividad.nombre}" creada en ${salonesParaCrear.length} salones del ${periodos[periodoActual - 1].nombre}`,
        });
      } else {
        toast({
          title: "Actividad creada",
          description: `"${nuevaActividad.nombre}" agregada al ${periodos[periodoActual - 1].nombre}`,
        });
      }
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
        .eq('asignatura', asignaturaSeleccionada)
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
        .eq('asignatura', asignaturaSeleccionada)
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

  // Verificar si un estudiante tiene AL MENOS UNA NOTA registrada en un período
  // Independientemente de si la actividad tiene porcentaje asignado o no
  const tieneAlgunaNotaEnPeriodo = useCallback((codigoEstudiantil: string, periodo: number): boolean => {
    const notasEstudiante = notas[codigoEstudiantil]?.[periodo];
    if (!notasEstudiante) return false;
    
    // Verificar si hay al menos una nota definida (diferente de undefined)
    return Object.values(notasEstudiante).some(nota => nota !== undefined);
  }, [notas]);

  // Verificar si un estudiante tiene AL MENOS UNA NOTA en CUALQUIER período del año
  const tieneAlgunaNotaEnAnio = useCallback((codigoEstudiantil: string): boolean => {
    return [1, 2, 3, 4].some(periodo => tieneAlgunaNotaEnPeriodo(codigoEstudiantil, periodo));
  }, [tieneAlgunaNotaEnPeriodo]);

  // === Funciones de descarga ===

  const getNombreArchivo = () => {
    const periodoNombre = esFinalDefinitiva
      ? "Final Definitiva"
      : periodos[periodoActivo - 1].nombre;
    return `${asignaturaSeleccionada} - ${gradoSeleccionado} ${salonSeleccionado} - ${periodoNombre}`;
  };

  const descargarExcel = async () => {
    setDescargandoExcel(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Notas");

      const headers: string[] = ["Código", "Apellidos", "Nombre"];
      const rows: (string | number | null)[][] = [];

      if (esFinalDefinitiva) {
        periodos.forEach(p => headers.push(p.nombre));
        headers.push("Final Definitiva");

        estudiantes.forEach(est => {
          const fila: (string | number | null)[] = [
            est.codigo_estudiantil,
            est.apellidos_estudiante,
            est.nombre_estudiante,
          ];
          periodos.forEach(p => {
            const fp = calcularFinalPeriodo(est.codigo_estudiantil, p.numero);
            fila.push(fp !== null ? fp : null);
          });
          const fd = calcularFinalDefinitiva(est.codigo_estudiantil);
          fila.push(fd !== null ? fd : null);
          rows.push(fila);
        });
      } else {
        const actividadesPeriodo = getActividadesPorPeriodo(periodoActivo);
        actividadesPeriodo.forEach(a => {
          headers.push(a.porcentaje !== null ? `${a.nombre} (${a.porcentaje}%)` : a.nombre);
        });
        headers.push("Final Periodo");

        estudiantes.forEach(est => {
          const fila: (string | number | null)[] = [
            est.codigo_estudiantil,
            est.apellidos_estudiante,
            est.nombre_estudiante,
          ];
          actividadesPeriodo.forEach(a => {
            const nota = notas[est.codigo_estudiantil]?.[periodoActivo]?.[a.id];
            fila.push(nota !== undefined ? nota : null);
          });
          const fp = calcularFinalPeriodo(est.codigo_estudiantil, periodoActivo);
          fila.push(fp !== null ? fp : null);
          rows.push(fila);
        });
      }

      // Header row con estilo verde
      const headerRow = ws.addRow(headers);
      headerRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16A34A" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, bottom: { style: "thin" },
          left: { style: "thin" }, right: { style: "thin" },
        };
      });
      headerRow.height = 22;

      // Data rows
      rows.forEach(row => {
        const dataRow = ws.addRow(row);
        dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          };
          if (colNumber >= 4) {
            cell.alignment = { horizontal: "center" };
          }
        });
      });

      // Auto-fit column widths
      ws.columns.forEach((col, idx) => {
        let maxLen = headers[idx]?.length || 10;
        rows.forEach(row => {
          const val = row[idx];
          if (val !== null && val !== undefined) {
            maxLen = Math.max(maxLen, val.toString().length);
          }
        });
        col.width = Math.min(maxLen + 4, 40);
      });

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${getNombreArchivo()}.xlsx`);
    } catch (error) {
      console.error("Error al generar Excel:", error);
    } finally {
      setDescargandoExcel(false);
    }
  };

  const descargarPDF = async () => {
    setDescargandoPDF(true);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;

      // Construir datos
      const headers: string[] = ["Código", "Apellidos", "Nombre"];
      const rows: string[][] = [];

      if (esFinalDefinitiva) {
        periodos.forEach(p => headers.push(p.nombre));
        headers.push("Final Definitiva");

        estudiantes.forEach(est => {
          const fila: string[] = [
            est.codigo_estudiantil,
            est.apellidos_estudiante,
            est.nombre_estudiante,
          ];
          periodos.forEach(p => {
            const fp = calcularFinalPeriodo(est.codigo_estudiantil, p.numero);
            fila.push(fp !== null ? fp.toString() : "—");
          });
          const fd = calcularFinalDefinitiva(est.codigo_estudiantil);
          fila.push(fd !== null ? fd.toString() : "—");
          rows.push(fila);
        });
      } else {
        const actividadesPeriodo = getActividadesPorPeriodo(periodoActivo);
        actividadesPeriodo.forEach(a => {
          headers.push(a.porcentaje !== null ? `${a.nombre} (${a.porcentaje}%)` : a.nombre);
        });
        headers.push("Final Periodo");

        estudiantes.forEach(est => {
          const fila: string[] = [
            est.codigo_estudiantil,
            est.apellidos_estudiante,
            est.nombre_estudiante,
          ];
          actividadesPeriodo.forEach(a => {
            const nota = notas[est.codigo_estudiantil]?.[periodoActivo]?.[a.id];
            fila.push(nota !== undefined ? nota.toString() : "—");
          });
          const fp = calcularFinalPeriodo(est.codigo_estudiantil, periodoActivo);
          fila.push(fp !== null ? fp.toString() : "—");
          rows.push(fila);
        });
      }

      // Función helper para construir tabla HTML
      const session = getSession();
      const nombreProfesor = `${session.nombres || ""} ${session.apellidos || ""}`.trim();

      const buildTableHTML = (dataRows: string[], showTitle: boolean) => {
        const container = document.createElement("div");
        container.style.cssText = "position:absolute;left:-9999px;top:0;background:white;padding:24px;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;";

        if (showTitle) {
          // Encabezado institucional: escudo + nombre
          const headerDiv = document.createElement("div");
          headerDiv.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:8px;";

          const img = document.createElement("img");
          img.src = escudoImg;
          img.style.cssText = "width:48px;height:48px;object-fit:contain;";
          headerDiv.appendChild(img);

          const instName = document.createElement("div");
          instName.style.cssText = "font-size:18px;font-weight:700;color:#1a1a1a;";
          instName.textContent = "I.E. Normal Superior de Corozal";
          headerDiv.appendChild(instName);

          container.appendChild(headerDiv);

          // Profesor
          if (nombreProfesor) {
            const profDiv = document.createElement("div");
            profDiv.style.cssText = "font-size:13px;color:#444;margin-bottom:4px;font-weight:500;";
            profDiv.textContent = `Profesor(a): ${nombreProfesor}`;
            container.appendChild(profDiv);
          }

          // Título de la tabla (asignatura - grado - periodo)
          const titulo = document.createElement("div");
          titulo.style.cssText = "margin:0 0 12px 0;font-size:15px;color:#333;font-weight:600;";
          titulo.textContent = getNombreArchivo();
          container.appendChild(titulo);
        }

        const table = document.createElement("table");
        table.style.cssText = "border-collapse:collapse;width:100%;font-size:13px;";

        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headers.forEach(h => {
          const th = document.createElement("th");
          th.style.cssText = "background:#16a34a;color:white;padding:10px 8px;border:1px solid #0d8a35;text-align:center;font-weight:700;white-space:nowrap;font-size:13px;";
          if (h === "Código" || h === "Apellidos" || h === "Nombre") th.style.textAlign = "left";
          th.textContent = h;
          headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");
        dataRows.forEach((rowStr, rowIdx) => {
          const row = JSON.parse(rowStr) as string[];
          const tr = document.createElement("tr");
          tr.style.backgroundColor = rowIdx % 2 === 0 ? "#ffffff" : "#f0fdf4";
          row.forEach((cell, colIdx) => {
            const td = document.createElement("td");
            td.style.cssText = "padding:8px;border:1px solid #d0d0d0;white-space:nowrap;font-size:13px;font-weight:500;color:#1a1a1a;";
            if (colIdx >= 3) td.style.textAlign = "center";
            if (colIdx === row.length - 1 && cell !== "—") td.style.fontWeight = "700";
            td.textContent = cell;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);

        const anchoBase = Math.max(headers.length * 120, 900);
        container.style.width = `${anchoBase}px`;
        return { container, anchoBase };
      };

      // Renderizar tabla completa para medir altura de filas
      const serializedRows = rows.map(r => JSON.stringify(r));
      const { container: measureContainer, anchoBase } = buildTableHTML(serializedRows, true);
      document.body.appendChild(measureContainer);

      // Medir alturas individuales
      const tableEl = measureContainer.querySelector("table")!;
      const theadEl = tableEl.querySelector("thead")!;
      const tbodyEl = tableEl.querySelector("tbody")!;
      // Medir todo lo que va antes de la tabla (escudo, profesor, título)
      const tableTop = tableEl.offsetTop;
      const containerPadding = 48; // 24px top + 24px bottom
      const titleHeight = tableTop; // todo el espacio antes de la tabla
      const headerHeight = theadEl.offsetHeight;
      const rowHeights: number[] = [];
      const tbodyRows = tbodyEl.querySelectorAll("tr");
      tbodyRows.forEach(tr => rowHeights.push((tr as HTMLElement).offsetHeight));

      document.body.removeChild(measureContainer);

      // Calcular páginas sin cortar filas
      const pdf = new jsPDF("l", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidthMM = pdfWidth - margin * 2;
      const pxPerMM = anchoBase / contentWidthMM;
      const pageContentHeightPx = (pdfHeight - margin * 2) * pxPerMM - containerPadding;

      const pages: { rowStart: number; rowEnd: number; isFirst: boolean }[] = [];
      let currentRow = 0;

      while (currentRow < rows.length) {
        const isFirst = currentRow === 0;
        let availableHeight = pageContentHeightPx - headerHeight;
        if (isFirst) availableHeight -= titleHeight;

        let rowEnd = currentRow;
        let usedHeight = 0;
        while (rowEnd < rows.length) {
          const rh = rowHeights[rowEnd] || 30;
          if (usedHeight + rh > availableHeight) break;
          usedHeight += rh;
          rowEnd++;
        }
        if (rowEnd === currentRow) rowEnd = currentRow + 1; // al menos 1 fila

        pages.push({ rowStart: currentRow, rowEnd, isFirst });
        currentRow = rowEnd;
      }

      // Renderizar y agregar cada página al PDF
      for (let p = 0; p < pages.length; p++) {
        const page = pages[p];
        const pageRows = serializedRows.slice(page.rowStart, page.rowEnd);
        const { container: pageContainer, anchoBase: pageAncho } = buildTableHTML(pageRows, page.isFirst);
        document.body.appendChild(pageContainer);

        const canvas = await html2canvas(pageContainer, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: pageAncho,
        });

        document.body.removeChild(pageContainer);

        if (p > 0) pdf.addPage();

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = contentWidthMM / imgWidth;
        const destHeight = imgHeight * ratio;

        pdf.addImage(imgData, "PNG", margin, margin, contentWidthMM, destHeight);
      }

      pdf.save(`${getNombreArchivo()}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
    } finally {
      setDescargandoPDF(false);
    }
  };

  // Guardar nota final en Supabase
  const guardarFinalPeriodo = async (codigoEstudiantil: string, periodo: number, notaFinal: number | null) => {
    console.log('=== INICIANDO guardarFinalPeriodo ===');
    console.log('Parámetros:', { codigoEstudiantil, periodo, notaFinal });
    
    // Primero verificar si existe alguna nota para este estudiante en este periodo
    const { data: notasExistentes } = await supabase
      .from('Notas')
      .select('id')
      .eq('codigo_estudiantil', codigoEstudiantil)
      .eq('asignatura', asignaturaSeleccionada)
      .eq('grado', gradoSeleccionado)
      .eq('salon', salonSeleccionado)
      .eq('periodo', periodo)
      .not('nombre_actividad', 'in', '("Final Periodo","Final Definitiva")')
      .limit(1);
    
    const tieneNotas = notasExistentes && notasExistentes.length > 0;
    
    if (!tieneNotas) {
      // Solo eliminar si NO hay ninguna nota en el periodo
      const { error } = await supabase
        .from('Notas')
        .delete()
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('asignatura', asignaturaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', periodo)
        .eq('nombre_actividad', 'Final Periodo');
      
      console.log('Final Periodo eliminado para:', codigoEstudiantil, 'Error:', error);
    } else {
      // Hay notas, hacer upsert (con nota NULL o con valor)
      const { data: existente } = await supabase
        .from('Notas')
        .select('comentario')
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('asignatura', asignaturaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', periodo)
        .eq('nombre_actividad', 'Final Periodo')
        .maybeSingle();
      
      const comentarioExistente = existente?.comentario || null;
      
      const { data, error } = await supabase
        .from('Notas')
        .upsert({
          codigo_estudiantil: codigoEstudiantil,
          asignatura: asignaturaSeleccionada,
          grado: gradoSeleccionado,
          salon: salonSeleccionado,
          periodo,
          nombre_actividad: 'Final Periodo',
          porcentaje: null,
          nota: notaFinal,  // Puede ser null, eso está bien
          comentario: comentarioExistente,
          notificado: false,
        }, {
          onConflict: 'codigo_estudiantil,asignatura,grado,salon,periodo,nombre_actividad'
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
    console.log('Parámetros:', { codigoEstudiantil, notaFinal, asignatura: asignaturaSeleccionada, grado: gradoSeleccionado, salon: salonSeleccionado });
    
    // Verificar si existe algún Final Periodo para este estudiante
    const { data: finalesPeriodo } = await supabase
      .from('Notas')
      .select('id')
      .eq('codigo_estudiantil', codigoEstudiantil)
      .eq('asignatura', asignaturaSeleccionada)
      .eq('grado', gradoSeleccionado)
      .eq('salon', salonSeleccionado)
      .eq('nombre_actividad', 'Final Periodo')
      .limit(1);
    
    const tienePeriodos = finalesPeriodo && finalesPeriodo.length > 0;
    
    if (!tienePeriodos) {
      // Solo eliminar si NO hay ningún Final Periodo
      const { error } = await supabase
        .from('Notas')
        .delete()
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('asignatura', asignaturaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', 0)
        .eq('nombre_actividad', 'Final Definitiva');
      console.log('Final Definitiva eliminada para:', codigoEstudiantil, 'Error:', error);
    } else {
      // Hay períodos, hacer upsert (con nota NULL o con valor)
      const { data: existente, error: errorConsulta } = await supabase
        .from('Notas')
        .select('comentario')
        .eq('codigo_estudiantil', codigoEstudiantil)
        .eq('asignatura', asignaturaSeleccionada)
        .eq('grado', gradoSeleccionado)
        .eq('salon', salonSeleccionado)
        .eq('periodo', 0)
        .eq('nombre_actividad', 'Final Definitiva')
        .maybeSingle();
      
      console.log('Consulta comentario existente:', { existente, errorConsulta });
      
      const comentarioExistente = existente?.comentario || null;
      
      const datosUpsert = {
        codigo_estudiantil: codigoEstudiantil,
        asignatura: asignaturaSeleccionada,
        grado: gradoSeleccionado,
        salon: salonSeleccionado,
        periodo: 0,
        nombre_actividad: 'Final Definitiva',
        porcentaje: null,
        nota: notaFinal,  // Puede ser null, eso está bien
        comentario: comentarioExistente,
        notificado: false,
      };
      
      console.log('Datos para UPSERT:', datosUpsert);
      
      const { data, error } = await supabase
        .from('Notas')
        .upsert(datosUpsert, {
          onConflict: 'codigo_estudiantil,asignatura,grado,salon,periodo,nombre_actividad'
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
          .eq('asignatura', asignaturaSeleccionada)
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
              asignatura: asignaturaSeleccionada,
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
            .eq('asignatura', asignaturaSeleccionada)
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
          .eq('asignatura', asignaturaSeleccionada)
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
        .eq('asignatura', asignaturaSeleccionada)
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
    
    // Para Final Periodo, SOLO verificar que tenga Final Periodo calculado
    // NO importa si tiene todas las notas o no (unos tendrán reporte completo, otros parcial)
    const estudiantesElegibles = estudiantes.filter(est => {
      const finalPeriodo = calcularFinalPeriodo(est.codigo_estudiantil, periodo);
      return finalPeriodo !== null;
    });
    
    // Calcular estudiantes excluidos (sin ninguna nota)
    const estudiantesExcluidos = estudiantes.length - estudiantesElegibles.length;
    
    // Contar estudiantes con TODAS las actividades completadas (para el mensaje)
    const estudiantesCompletos = estudiantesElegibles.filter(est => {
      return actividadesConPorcentaje.every(act => 
        notas[est.codigo_estudiantil]?.[periodo]?.[act.id] !== undefined
      );
    });
    
    const estudiantesParciales = estudiantesElegibles.length - estudiantesCompletos.length;
    
    const datos = estudiantesElegibles.map(est => {
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
    
    if (esCompleto) {
      if (estudiantesCompletos.length === estudiantesElegibles.length) {
        // Todos tienen todas las notas
        descripcion = `El período está COMPLETO (100%).\n\nSe enviará REPORTE FINAL a ${estudiantesElegibles.length} estudiante(s) sobre:\nFinal ${nombrePeriodo} Periodo`;
      } else if (estudiantesParciales === estudiantesElegibles.length) {
        // Todos tienen notas parciales
        descripcion = `El período está completo (100%).\n\nSe enviará REPORTE PARCIAL a ${estudiantesParciales} estudiante(s) sobre:\nFinal ${nombrePeriodo} Periodo (tienen notas pendientes)`;
      } else {
        // Mezcla de completos y parciales
        descripcion = `El período está completo (100%).\n\nSe enviará notificación a ${estudiantesElegibles.length} estudiante(s):\n• ${estudiantesCompletos.length} recibirá REPORTE FINAL (todas las notas registradas)\n• ${estudiantesParciales} recibirá REPORTE PARCIAL (notas pendientes)`;
      }
      
      // Agregar info de excluidos si hay
      if (estudiantesExcluidos > 0) {
        descripcion += `\n\n⚠️ Se excluirá ${estudiantesExcluidos} estudiante(s) sin ninguna nota registrada.`;
      }
      
      // Agregar sobre qué es la notificación (solo si no es mezcla, porque ya lo tiene)
      if (estudiantesCompletos.length === estudiantesElegibles.length || estudiantesParciales === estudiantesElegibles.length) {
        // Ya tiene el "sobre" incluido en el mensaje
      } else {
        descripcion += `\n\nSobre: Final ${nombrePeriodo} Periodo`;
      }
    } else {
      // Período incompleto
      descripcion = `El período está INCOMPLETO (${porcentajeUsado.toFixed(2)}/100%).\n\nSe enviará REPORTE PARCIAL a ${estudiantesElegibles.length} estudiante(s) sobre:\nFinal ${nombrePeriodo} Periodo`;
      
      // Agregar info de excluidos si hay
      if (estudiantesExcluidos > 0) {
        descripcion += `\n\n⚠️ Se excluirá ${estudiantesExcluidos} estudiante(s) sin ninguna nota registrada.`;
      }
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
    // Verificar completitud de todos los períodos (actividades asignadas)
    const completitudPeriodos = periodos.map(p => ({
      periodo: p.numero,
      porcentaje: getPorcentajeUsado(p.numero)
    }));
    const todosConActividadesCompletas = completitudPeriodos.every(p => p.porcentaje === 100);
    
    // Filtrar SOLO estudiantes que cumplen los requisitos:
    // 1. Tienen Final Definitiva calculada
    // 2. Tienen al menos un período completo (100%) con TODAS las notas
    const estudiantesElegibles = estudiantes.filter(est => {
      const finalDef = calcularFinalDefinitiva(est.codigo_estudiantil);
      if (finalDef === null) return false;
      
      // Verificar que tenga al menos un período completo con todas las notas
      return tieneAlMenosUnPeriodoCompletoConTodasNotas(est.codigo_estudiantil);
    });
    
    if (estudiantesElegibles.length === 0) {
      toast({
        title: "Sin estudiantes elegibles",
        description: "Ningún estudiante tiene al menos un período completo (100% con todas las notas registradas)",
        variant: "destructive",
      });
      return;
    }
    
    // Contar estudiantes excluidos (total menos elegibles)
    const estudiantesExcluidos = estudiantes.length - estudiantesElegibles.length;
    
    // Clasificar estudiantes por tipo de reporte:
    // Completo = tiene los 4 períodos al 100% con TODAS las notas en cada uno
    const estudiantesCompletos = estudiantesElegibles.filter(est => {
      for (let p = 1; p <= 4; p++) {
        const porcentaje = getPorcentajeUsado(p);
        if (porcentaje !== 100) return false;
        
        const finalPeriodo = calcularFinalPeriodo(est.codigo_estudiantil, p);
        if (finalPeriodo === null) return false;
        
        const actividadesDelPeriodo = getActividadesPorPeriodo(p);
        const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
        const todasCalificadas = actividadesConPorcentaje.every(act => 
          notas[est.codigo_estudiantil]?.[p]?.[act.id] !== undefined
        );
        
        if (!todasCalificadas) return false;
      }
      return true;
    });
    
    const estudiantesParciales = estudiantesElegibles.length - estudiantesCompletos.length;
    
    const datos = estudiantesElegibles.map(est => {
      const finalesPeriodos = periodos.map(p => ({
        periodo: p.nombre,
        nota: calcularFinalPeriodo(est.codigo_estudiantil, p.numero),
      }));
      
      // Verificar si este estudiante tiene todos los períodos completos con notas
      const esteEstudianteCompleto = (() => {
        for (let p = 1; p <= 4; p++) {
          const porcentaje = getPorcentajeUsado(p);
          if (porcentaje !== 100) return false;
          
          const finalPeriodo = calcularFinalPeriodo(est.codigo_estudiantil, p);
          if (finalPeriodo === null) return false;
          
          const actividadesDelPeriodo = getActividadesPorPeriodo(p);
          const actividadesConPorcentaje = actividadesDelPeriodo.filter(a => a.porcentaje !== null && a.porcentaje > 0);
          const todasCalificadas = actividadesConPorcentaje.every(act => 
            notas[est.codigo_estudiantil]?.[p]?.[act.id] !== undefined
          );
          
          if (!todasCalificadas) return false;
        }
        return true;
      })();

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
        razon_parcial: !esteEstudianteCompleto ? "notas_faltantes_periodo" : null,
      };
    });

    // Construir mensaje detallado según completitud
    let descripcion = "";
    
    if (todosConActividadesCompletas) {
      descripcion = "Todos los períodos tienen actividades asignadas al 100%.\n\n";
      
      if (estudiantesCompletos.length > 0 && estudiantesParciales === 0) {
        // Todos recibirán reporte completo
        descripcion += `Se enviará REPORTE FINAL COMPLETO a ${estudiantesCompletos.length} estudiante(s) sobre:\nFinal Definitiva (4 períodos completados)`;
      } else if (estudiantesCompletos.length > 0 && estudiantesParciales > 0) {
        // Mezcla de completos y parciales
        descripcion += `Se enviará notificación a ${estudiantesElegibles.length} estudiante(s):\n`;
        descripcion += `• ${estudiantesCompletos.length} recibirá(n) REPORTE FINAL COMPLETO (4 períodos)\n`;
        descripcion += `• ${estudiantesParciales} recibirá(n) REPORTE PARCIAL (períodos completados individualmente)`;
      } else {
        // Solo parciales
        descripcion += `Se enviará REPORTE PARCIAL a ${estudiantesParciales} estudiante(s) sobre:\nFinal Definitiva (períodos completados individualmente)`;
      }
      
      if (estudiantesExcluidos > 0) {
        descripcion += `\n\n⚠️ Se excluirá(n) ${estudiantesExcluidos} estudiante(s) que no tiene(n) ningún período completado al 100%.`;
      }
    } else {
      // No todos los períodos tienen actividades al 100%
      const promedioCompletitud = Math.round((completitudPeriodos.reduce((sum, p) => sum + p.porcentaje, 0) / 4));
      
      descripcion = `Los períodos NO tienen todas las actividades asignadas (promedio: ${promedioCompletitud}%).\n\n`;
      descripcion += `Se enviará REPORTE PARCIAL a ${estudiantesElegibles.length} estudiante(s) sobre:\nFinal Definitiva (períodos con actividades completadas)`;
      
      if (estudiantesExcluidos > 0) {
        descripcion += `\n\n⚠️ Se excluirá(n) ${estudiantesExcluidos} estudiante(s) sin períodos elegibles.`;
      }
    }

    setNotificacionPendiente({
      tipo: todosConActividadesCompletas && estudiantesCompletos.length === estudiantesElegibles.length 
        ? "definitiva_completa" 
        : "definitiva_parcial",
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

    // Detectar el período real desde el nombre de la actividad
    let periodoReal = periodoActivo;
    if (esDefinitiva) {
      periodoReal = 0;
    } else if (esActividadFinal && nombreActividad) {
      if (nombreActividad.includes("1er")) periodoReal = 1;
      else if (nombreActividad.includes("2do")) periodoReal = 2;
      else if (nombreActividad.includes("3er")) periodoReal = 3;
      else if (nombreActividad.includes("4to")) periodoReal = 4;
      else if (nombreActividad.includes("Final Definitiva")) periodoReal = 0;
    }

    // Preparar payload SIMPLE para n8n
    const payload = {
      tipo_boton: tipoBoton,
      profesor: {
        codigo: session.codigo,
        nombres: session.nombres,
        apellidos: session.apellidos,
      },
      contexto: {
        asignatura: asignaturaSeleccionada,
        grado: gradoSeleccionado,
        salon: salonSeleccionado,
        periodo: periodoReal
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
            .eq('asignatura', asignaturaSeleccionada)
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

  // Verificar si hay al menos un estudiante que pueda recibir notificación de Final Definitiva
  // (debe tener al menos un período completo al 100%)
  const hayFinalDefinitiva = (): boolean => {
    return estudiantes.some(est => tieneAlMenosUnPeriodoCompletoConTodasNotas(est.codigo_estudiantil));
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
          .eq('asignatura', asignaturaSeleccionada)
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
            
            // Si ya no hay nota final, eliminar el comentario del Final Periodo del estado local
            if (notaFinal === null) {
              setComentarios(prev => {
                const nuevosComentarios = { ...prev };
                const finalPeriodoId = `${periodo}-Final Periodo`;
                if (nuevosComentarios[codigoEstudiantil]?.[periodo]?.[finalPeriodoId] !== undefined) {
                  delete nuevosComentarios[codigoEstudiantil][periodo][finalPeriodoId];
                }
                return nuevosComentarios;
              });
            }
            
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
              // Eliminar comentario del Final Definitiva del estado local
              setComentarios(prev => {
                const nuevosComentarios = { ...prev };
                const finalDefId = '0-Final Definitiva';
                if (nuevosComentarios[codigoEstudiantil]?.[0]?.[finalDefId] !== undefined) {
                  delete nuevosComentarios[codigoEstudiantil][0][finalDefId];
                }
                return nuevosComentarios;
              });
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
          asignatura: asignaturaSeleccionada,
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
            asignatura: asignaturaSeleccionada,
            grado: gradoSeleccionado,
            salon: salonSeleccionado,
            periodo,
            nombre_actividad: actividad.nombre,
            porcentaje: actividad.porcentaje,
            nota: notaRedondeada,
            comentario: comentarios[codigoEstudiantil]?.[periodo]?.[actividadId] || null,
            notificado: false,
          }, {
            onConflict: 'codigo_estudiantil,asignatura,grado,salon,periodo,nombre_actividad'
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
      <HeaderNormy backLink="/dashboard" />

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
                Asignaturas
              </button>
              <span className="text-muted-foreground">→</span>
              <button 
                onClick={() => navigate("/seleccionar-grado")}
                className="text-primary hover:underline"
              >
                {asignaturaSeleccionada}
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
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/actividades-calendario")}
                className="gap-2"
              >
                <Calendar className="h-4 w-4" />
                Ver Actividades Asignadas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={descargarExcel}
                disabled={descargandoExcel}
                className="gap-2"
              >
                {descargandoExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {descargandoExcel ? "Generando..." : "Descargar Excel"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={descargarPDF}
                disabled={descargandoPDF}
                className="gap-2"
              >
                {descargandoPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {descargandoPDF ? "Generando..." : "Descargar PDF"}
              </Button>
            </div>
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
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors relative
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {/* Mobile: solo número y porcentaje */}
                  <span className="md:hidden">
                    {periodo.numero}° ({porcentajeUsado}%)
                  </span>
                  {/* Desktop: texto completo */}
                  <span className="hidden md:inline">
                    {periodo.nombre}
                    <span className={`ml-2 text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      ({porcentajeUsado}%)
                    </span>
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
                  className={`flex-1 px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium transition-colors relative
                    ${esFinalDefinitiva 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {/* Mobile: abreviado */}
                  <span className="md:hidden flex items-center justify-center gap-1">
                    Final ({porcentajePromedio}%)
                    {estaCompleto && <span>✓</span>}
                  </span>
                  {/* Desktop: texto completo */}
                  <span className="hidden md:flex items-center justify-center gap-1">
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
            <div className="overflow-x-auto border-l border-t border-border">
              <table className="w-full border-separate border-spacing-0 table-fixed">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    {/* Columnas fijas en desktop, normales en móvil */}
                    <th className="md:sticky md:left-0 z-20 bg-primary border-r border-b border-border/30 w-[80px] md:w-[100px] min-w-[80px] md:min-w-[100px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Código
                    </th>
                    <th className="md:sticky md:left-[100px] z-20 bg-primary border-r border-b border-border/30 w-[120px] md:w-[180px] min-w-[120px] md:min-w-[180px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Apellidos
                    </th>
                    <th className="md:sticky md:left-[280px] z-20 bg-primary border-r border-b border-border/30 w-[100px] md:w-[150px] min-w-[100px] md:min-w-[150px] p-2 md:p-3 text-left font-semibold text-xs md:text-sm">
                      Nombre
                    </th>
                    
                    {/* Vista Final Definitiva */}
                    {esFinalDefinitiva ? (
                      <>
                        {periodos.map((periodo) => (
                          <th 
                            key={periodo.numero}
                            className="border-r border-b border-border/30 p-2 text-center text-xs font-medium w-[120px] bg-primary/80"
                          >
                            {periodo.nombre}
                          </th>
                        ))}
                        <th className="border-r border-b border-border/30 p-2 text-center text-xs font-semibold w-[130px] bg-primary" id="col-final-definitiva">
                          Final Definitiva
                        </th>
                      </>
                    ) : (
                      <>
                        {/* Columnas de actividades del período activo */}
                        {getActividadesPorPeriodo(periodoActivo).map((actividad) => (
                          <th 
                            key={actividad.id}
                            className="border-r border-b border-border/30 p-2 text-center text-xs font-medium w-[120px] bg-primary/90"
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
                        <th className="border-r border-b border-border/30 p-2 text-center w-[100px] bg-primary/90">
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
                            <th className="border-r border-b border-border/30 p-2 text-center text-xs font-medium w-[130px] bg-primary">
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
                        {/* Fixed columns on desktop, normal on mobile - with solid background */}
                        <td className={`md:sticky md:left-0 z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.codigo_estudiantil}
                        </td>
                        <td className={`md:sticky md:left-[100px] z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm font-medium ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.apellidos_estudiante}
                        </td>
                        <td className={`md:sticky md:left-[280px] z-10 border-r border-b border-border p-2 md:p-3 text-xs md:text-sm ${studentIndex % 2 === 0 ? 'bg-background' : 'bg-muted'}`}>
                          {estudiante.nombre_estudiante}
                        </td>
                        
                        {/* Vista Final Definitiva */}
                        {esFinalDefinitiva ? (
                          <>
                            {periodos.map((periodo) => {
                              const finalPeriodo = calcularFinalPeriodo(estudiante.codigo_estudiantil, periodo.numero);
                              const comentario = comentarios[estudiante.codigo_estudiantil]?.[periodo.numero]?.[`${periodo.numero}-Final Periodo`] || null;
                              const tieneNotas = tieneAlgunaNotaEnPeriodo(estudiante.codigo_estudiantil, periodo.numero);
                              return (
                                <FinalPeriodoCelda
                                  key={periodo.numero}
                                  notaFinal={finalPeriodo}
                                  comentario={comentario}
                                  tieneAlgunaNota={tieneNotas}
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
                                  onNotificarPadre={tieneNotas ? () => handleNotificarFinalPeriodoIndividual(estudiante, periodo.numero, finalPeriodo) : undefined}
                                />
                              );
                            })}
                            {/* Celda Final Definitiva */}
                            {(() => {
                              const finalDef = calcularFinalDefinitiva(estudiante.codigo_estudiantil);
                              const comentario = comentarios[estudiante.codigo_estudiantil]?.[0]?.['0-Final Definitiva'] || null;
                              const tieneNotas = tieneAlgunaNotaEnAnio(estudiante.codigo_estudiantil);
                              return (
                                <td className="border-r border-b border-border p-1 text-center text-sm w-[130px] bg-primary/20 font-bold relative group">
                                  <div className="relative flex items-center justify-center h-8">
                                    <span className={finalDef !== null ? "" : "text-muted-foreground"}>
                                      {finalDef !== null ? finalDef.toFixed(2) : "—"}
                                    </span>
                                    {comentario && (
                                      <div className="absolute top-0 right-6 w-2 h-2 bg-amber-500 rounded-full" title={comentario} />
                                    )}
                                    {/* Menú solo visible si tiene al menos una nota en cualquier período (always visible on mobile) */}
                                    {tieneNotas && (
                                      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
                                            {tieneAlMenosUnPeriodoCompletoConTodasNotas(estudiante.codigo_estudiantil) && (
                                              <DropdownMenuItem onClick={() => handleNotificarFinalDefinitivaIndividual(estudiante, finalDef)}>
                                                <Send className="w-4 h-4 mr-2" />
                                                Notificar a padre(s)
                                              </DropdownMenuItem>
                                            )}
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
                            <td className="border-r border-b border-border p-3 text-center text-sm text-muted-foreground/50 w-[100px]">
                              
                            </td>
                            {/* Celda Final Periodo */}
                            {(() => {
                              const notaFinal = calcularFinalPeriodo(estudiante.codigo_estudiantil, periodoActivo);
                              const tieneNotas = tieneAlgunaNotaEnPeriodo(estudiante.codigo_estudiantil, periodoActivo);
                              return (
                                <FinalPeriodoCelda
                                  notaFinal={notaFinal}
                                  comentario={comentarios[estudiante.codigo_estudiantil]?.[periodoActivo]?.[`${periodoActivo}-Final Periodo`] || null}
                                  tieneAlgunaNota={tieneNotas}
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
                                  onNotificarPadre={tieneNotas ? () => handleNotificarFinalPeriodoIndividual(estudiante, periodoActivo, notaFinal) : undefined}
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
                  <tr className="bg-muted">
                    {/* Celdas fijas vacías - sticky solo en desktop con fondo sólido */}
                    <td className="md:sticky md:left-0 z-10 bg-muted border-r border-b border-border p-1"></td>
                    <td className="md:sticky md:left-[100px] z-10 bg-muted border-r border-b border-border p-1"></td>
                    <td className="md:sticky md:left-[280px] z-10 bg-muted border-r border-b border-border p-1"></td>
                    
                    {esFinalDefinitiva ? (
                      <>
                        {/* Botones Notificar para cada período */}
                        {periodos.map((periodo) => (
                          <td key={periodo.numero} className="border-r border-b border-border p-1 text-center">
                            {periodoTieneFinal(periodo.numero) && (
                              <button
                                onClick={() => handleNotificarPeriodoCompleto(periodo.numero)}
                                className="w-full px-1 py-1 text-xs rounded-md bg-green-100 hover:bg-green-200 text-green-800 transition-colors flex flex-col items-center justify-center h-10"
                              >
                                <span className="text-[10px]">📱 Notificar</span>
                                <span className="font-semibold text-[10px] leading-tight">Final Periodo</span>
                              </button>
                            )}
                          </td>
                        ))}
                        {/* Botón Final Definitiva */}
                        <td className="border-r border-b border-border p-1 text-center">
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
                          <td key={actividad.id} className="border-r border-b border-border p-1 text-center">
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
                        <td className="border-r border-b border-border p-1 w-[100px]"></td>
                        {/* Botón Final Periodo */}
                        <td className="border-r border-b border-border p-1 text-center">
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
            {!actividadEditando && otrosSalones.length > 0 && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="crearParaTodos"
                  checked={crearParaTodosSalones}
                  onCheckedChange={(checked) => setCrearParaTodosSalones(checked === true)}
                />
                <div className="grid gap-1">
                  <Label htmlFor="crearParaTodos" className="text-sm font-normal cursor-pointer">
                    Crear en todos los salones de este grado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    También se creará en: {otrosSalones.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={guardandoMultiple}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarActividad}
              className="bg-primary hover:bg-primary/90"
              disabled={guardandoMultiple}
            >
              {guardandoMultiple ? "Creando..." : actividadEditando ? "Guardar cambios" : "Crear Actividad"}
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