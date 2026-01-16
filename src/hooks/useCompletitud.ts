import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DetalleIncompleto {
  tipo: "nota_faltante" | "porcentaje_incompleto" | "sin_actividades";
  descripcion: string;
  materia?: string;
  profesor?: string;
  grado?: string;
  salon?: string;
  estudiante?: string;
  periodo?: number;
  actividad?: string;
  porcentajeFaltante?: number;
}

export interface ResumenIncompletitud {
  materiasIncompletas: number;
  profesoresPendientes: string[];
  gradosAfectados: string[];
  salonesAfectados: string[];
}

export interface ResumenCompleto {
  totalEstudiantes: number;
  totalAsignacionesVerificadas: number;
  totalSalones: number;
  totalProfesores: number;
  materiasPorSalon: Map<string, number>;
}

export interface ResultadoCompletitud {
  completo: boolean;
  detalles: DetalleIncompleto[];
  resumen: ResumenIncompletitud;
  resumenCompleto?: ResumenCompleto;
}

interface AsignacionProfesor {
  id: string;
  codigo: string;
  nombre: string;
  materias: string[];
  grados: string[];
  salones: string[];
}

interface ActividadRegistrada {
  materia: string;
  grado: string;
  salon: string;
  periodo: number;
  nombre_actividad: string;
  porcentaje: number | null;
  codigo_profesor: string;
}

interface NotaRegistrada {
  codigo_estudiantil: string;
  materia: string;
  grado: string;
  salon: string;
  periodo: number;
  nombre_actividad: string;
  porcentaje: number | null;
  nota: number;
}

interface Estudiante {
  codigo_estudiantil: string;
  nombre_estudiante: string;
  apellidos_estudiante: string;
  grado_estudiante: string;
  salon_estudiante: string;
}

export const useCompletitud = () => {
  const [asignaciones, setAsignaciones] = useState<AsignacionProfesor[]>([]);
  const [actividades, setActividades] = useState<ActividadRegistrada[]>([]);
  const [notas, setNotas] = useState<NotaRegistrada[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Obtener asignaciones de profesores con sus nombres
        const { data: internos } = await supabase.from("Internos").select("id, codigo, nombre");
        const { data: asignacionesData } = await supabase
          .from("Asignación Profesores")
          .select('id, "Materia(s)", "Grado(s)", "Salon(es)"');

        const asignacionesProcesadas: AsignacionProfesor[] = [];
        if (asignacionesData && internos) {
          for (const asig of asignacionesData) {
            const profesor = internos.find((p: any) => p.id === asig.id);
            if (profesor) {
              asignacionesProcesadas.push({
                id: asig.id,
                codigo: profesor.codigo,
                nombre: profesor.nombre,
                materias: (asig as any)["Materia(s)"] || [],
                grados: (asig as any)["Grado(s)"] || [],
                salones: (asig as any)["Salon(es)"] || []
              });
            }
          }
        }
        setAsignaciones(asignacionesProcesadas);

        // 2. Obtener actividades únicas de "Nombre de Actividades"
        const { data: actividadesData } = await supabase
          .from("Nombre de Actividades")
          .select("materia, grado, salon, periodo, nombre, porcentaje, codigo_profesor");
        
        if (actividadesData) {
          setActividades(actividadesData.map((a: any) => ({
            materia: a.materia,
            grado: a.grado,
            salon: a.salon,
            periodo: a.periodo,
            nombre_actividad: a.nombre,
            porcentaje: a.porcentaje,
            codigo_profesor: a.codigo_profesor
          })));
        }

        // 3. Obtener todas las notas
        const { data: notasData } = await supabase
          .from("Notas")
          .select("*")
          .not("nombre_actividad", "in", '("Final Periodo","Final Definitiva")');
        
        setNotas(notasData || []);

        // 4. Obtener todos los estudiantes
        const { data: estudiantesData } = await supabase
          .from("Estudiantes")
          .select("*")
          .order("apellidos_estudiante");
        
        setEstudiantes(estudiantesData || []);

      } catch (error) {
        console.error("Error fetching completitud data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Expande las asignaciones de profesores a combinaciones individuales materia-grado-salón
   */
  const expandirAsignaciones = () => {
    const combinaciones: Array<{
      materia: string;
      grado: string;
      salon: string;
      profesor: string;
      profesorNombre: string;
    }> = [];

    for (const asig of asignaciones) {
      for (const materia of asig.materias) {
        for (const grado of asig.grados) {
          for (const salon of asig.salones) {
            combinaciones.push({
              materia,
              grado,
              salon,
              profesor: asig.codigo,
              profesorNombre: asig.nombre
            });
          }
        }
      }
    }

    return combinaciones;
  };

  /**
   * Verifica la completitud según el nivel y período seleccionados
   * Usa "Asignación Profesores" como FUENTE DE VERDAD
   */
  const verificarCompletitud = (
    nivel: "institucion" | "grado" | "salon" | "materia" | "estudiante",
    periodo: number | "anual",
    grado?: string,
    salon?: string,
    materia?: string,
    codigoEstudiante?: string
  ): ResultadoCompletitud => {
    const detalles: DetalleIncompleto[] = [];
    const profesoresPendientes = new Set<string>();
    const gradosAfectados = new Set<string>();
    const salonesAfectados = new Set<string>();
    const materiasIncompletas = new Set<string>();

    const periodos = periodo === "anual" ? [1, 2, 3, 4] : [periodo];

    // PASO 1: Expandir todas las asignaciones de "Asignación Profesores"
    let todasLasCombinaciones = expandirAsignaciones();

    // Filtrar combinaciones según el nivel seleccionado
    if (grado) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => c.grado === grado);
    }
    if (salon) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => c.salon === salon);
    }
    if (materia) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => c.materia === materia);
    }

    // Para conteo de resumen completo
    const salonesVerificados = new Set<string>();
    const profesoresVerificados = new Set<string>();
    const materiasPorSalon = new Map<string, number>();
    let asignacionesVerificadas = 0;

    // DEBUG: Log para verificar qué está pasando
    console.log("=== VERIFICACIÓN DE COMPLETITUD ===");
    console.log("Total asignaciones expandidas:", todasLasCombinaciones.length);
    console.log("Total estudiantes en sistema:", estudiantes.length);
    console.log("Muestra de combinaciones:", todasLasCombinaciones.slice(0, 3));
    console.log("Muestra de estudiantes:", estudiantes.slice(0, 3).map(e => ({
      grado: e.grado_estudiante,
      salon: e.salon_estudiante
    })));

    // PASO 2: Para CADA combinación materia-grado-salón, verificar completitud
    for (const combo of todasLasCombinaciones) {
      // Obtener estudiantes de este grado-salón
      let estudiantesDelSalon = estudiantes.filter(
        e => e.grado_estudiante === combo.grado && e.salon_estudiante === combo.salon
      );

      // Si se filtró por estudiante específico
      if (codigoEstudiante) {
        estudiantesDelSalon = estudiantesDelSalon.filter(e => e.codigo_estudiantil === codigoEstudiante);
      }

      // IMPORTANTE: Si no hay estudiantes para esta combinación, es un problema
      // La asignación existe pero no hay estudiantes - esto indica incompletitud
      if (estudiantesDelSalon.length === 0) {
        // Agregar como detalle de incompletitud - no hay estudiantes para esta asignación
        detalles.push({
          tipo: "sin_actividades",
          descripcion: `${combo.materia} (${combo.grado} - ${combo.salon}): No hay estudiantes registrados en este salón`,
          materia: combo.materia,
          profesor: combo.profesorNombre,
          grado: combo.grado,
          salon: combo.salon
        });

        profesoresPendientes.add(combo.profesorNombre);
        gradosAfectados.add(combo.grado);
        salonesAfectados.add(combo.salon);
        materiasIncompletas.add(combo.materia);
        continue;
      }

      asignacionesVerificadas++;
      salonesVerificados.add(`${combo.grado}-${combo.salon}`);
      profesoresVerificados.add(combo.profesorNombre);
      
      const salonKey = combo.materia;
      materiasPorSalon.set(salonKey, (materiasPorSalon.get(salonKey) || 0) + 1);

      // Para cada período a verificar
      for (const per of periodos) {
        // Obtener actividades con porcentaje de esta combinación
        const actividadesPeriodo = actividades.filter(a =>
          a.materia === combo.materia &&
          a.grado === combo.grado &&
          a.salon === combo.salon &&
          a.periodo === per &&
          a.porcentaje !== null && a.porcentaje > 0
        );

        // VERIFICACIÓN 1: ¿Existen actividades para esta combinación?
        if (actividadesPeriodo.length === 0) {
          detalles.push({
            tipo: "sin_actividades",
            descripcion: `${combo.materia} (${combo.grado} - ${combo.salon}) P${per}: No hay actividades registradas`,
            materia: combo.materia,
            profesor: combo.profesorNombre,
            grado: combo.grado,
            salon: combo.salon,
            periodo: per
          });

          profesoresPendientes.add(combo.profesorNombre);
          gradosAfectados.add(combo.grado);
          salonesAfectados.add(combo.salon);
          materiasIncompletas.add(combo.materia);
          continue;
        }

        // VERIFICACIÓN 2: ¿Los porcentajes suman 100%?
        const sumaPorcentajes = actividadesPeriodo.reduce((sum, a) => sum + (a.porcentaje || 0), 0);
        
        if (sumaPorcentajes < 100) {
          const porcentajeFaltante = 100 - Math.round(sumaPorcentajes);
          
          detalles.push({
            tipo: "porcentaje_incompleto",
            descripcion: `${combo.materia} (${combo.grado} - ${combo.salon}) P${per}: Las actividades solo suman ${Math.round(sumaPorcentajes)}%, faltan ${porcentajeFaltante}%`,
            materia: combo.materia,
            profesor: combo.profesorNombre,
            grado: combo.grado,
            salon: combo.salon,
            periodo: per,
            porcentajeFaltante
          });

          profesoresPendientes.add(combo.profesorNombre);
          gradosAfectados.add(combo.grado);
          salonesAfectados.add(combo.salon);
          materiasIncompletas.add(combo.materia);
        }

        // VERIFICACIÓN 3: ¿TODOS los estudiantes tienen nota en TODAS las actividades?
        for (const est of estudiantesDelSalon) {
          const nombreCompleto = `${est.apellidos_estudiante} ${est.nombre_estudiante}`;
          
          for (const act of actividadesPeriodo) {
            const tieneNota = notas.some(n =>
              n.codigo_estudiantil === est.codigo_estudiantil &&
              n.materia === combo.materia &&
              n.grado === combo.grado &&
              n.salon === combo.salon &&
              n.periodo === per &&
              n.nombre_actividad === act.nombre_actividad
            );

            if (!tieneNota) {
              detalles.push({
                tipo: "nota_faltante",
                descripcion: `${combo.materia} (${combo.grado} - ${combo.salon}) P${per}: ${nombreCompleto} sin nota en "${act.nombre_actividad}" (${act.porcentaje}%)`,
                materia: combo.materia,
                profesor: combo.profesorNombre,
                grado: combo.grado,
                salon: combo.salon,
                estudiante: nombreCompleto,
                periodo: per,
                actividad: act.nombre_actividad
              });

              profesoresPendientes.add(combo.profesorNombre);
              gradosAfectados.add(combo.grado);
              salonesAfectados.add(combo.salon);
              materiasIncompletas.add(combo.materia);
            }
          }
        }

        // Limitar para rendimiento (pero seguir contando)
        if (detalles.length >= 200) break;
      }
      if (detalles.length >= 200) break;
    }

    console.log("Asignaciones verificadas:", asignacionesVerificadas);
    console.log("Detalles de incompletitud encontrados:", detalles.length);

    // Calcular total de estudiantes únicos verificados
    let estudiantesUnicos = new Set<string>();
    if (grado && salon) {
      estudiantes
        .filter(e => e.grado_estudiante === grado && e.salon_estudiante === salon)
        .forEach(e => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (grado) {
      estudiantes
        .filter(e => e.grado_estudiante === grado)
        .forEach(e => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (codigoEstudiante) {
      estudiantesUnicos.add(codigoEstudiante);
    } else {
      estudiantes.forEach(e => estudiantesUnicos.add(e.codigo_estudiantil));
    }

    const resumenCompleto: ResumenCompleto = {
      totalEstudiantes: estudiantesUnicos.size,
      totalAsignacionesVerificadas: asignacionesVerificadas,
      totalSalones: salonesVerificados.size,
      totalProfesores: profesoresVerificados.size,
      materiasPorSalon: materiasPorSalon
    };

    // REGLA CRÍTICA: Solo puede estar "Completo" si:
    // 1. No hay detalles de incompletitud
    // 2. Se verificaron al menos algunas asignaciones (no puede ser 0)
    // 3. Hay combinaciones que verificar
    const estaCompleto = detalles.length === 0 && 
                         asignacionesVerificadas > 0 && 
                         todasLasCombinaciones.length > 0;

    console.log("¿Está completo?", estaCompleto, {
      detallesCount: detalles.length,
      asignacionesVerificadas,
      combinacionesTotal: todasLasCombinaciones.length
    });

    return {
      completo: estaCompleto,
      detalles: detalles.slice(0, 200),
      resumen: {
        materiasIncompletas: materiasIncompletas.size,
        profesoresPendientes: Array.from(profesoresPendientes),
        gradosAfectados: Array.from(gradosAfectados),
        salonesAfectados: Array.from(salonesAfectados)
      },
      resumenCompleto
    };
  };

  return {
    loading,
    verificarCompletitud,
    asignaciones,
    estudiantes
  };
};
