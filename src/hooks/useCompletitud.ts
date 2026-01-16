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
  nombres: string;
  apellidos: string;
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
  nota: number | null;
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
        // 1. Obtener internos con cargo
        const { data: internos, error: errorInternos } = await supabase
          .from("Internos")
          .select("id, codigo, nombres, apellidos, cargo");
        
        const { data: asignacionesData, error: errorAsig } = await supabase
          .from("Asignación Profesores")
          .select('*');

        console.log("=== DEBUG ASIGNACIONES ===");
        console.log("Internos encontrados:", internos?.length || 0);
        
        // Filtrar SOLO profesores (excluir Rector y Coordinador)
        const soloProfeores = internos?.filter((p: any) => p.cargo === 'Profesor(a)') || [];
        console.log("Solo profesores (cargo='Profesor(a)'):", soloProfeores.length);
        
        // Crear mapa de internos para búsqueda rápida por ID
        const internosMap = new Map<string, any>();
        internos?.forEach((p: any) => internosMap.set(String(p.id), p));
        
        // Crear mapa de profesores para búsqueda rápida
        const profesoresMap = new Map<string, any>();
        soloProfeores.forEach((p: any) => profesoresMap.set(String(p.id), p));
        
        console.log("Asignaciones raw encontradas:", asignacionesData?.length || 0);
        if (errorInternos) console.error("Error internos:", errorInternos);
        if (errorAsig) console.error("Error asignaciones:", errorAsig);

        const asignacionesProcesadas: AsignacionProfesor[] = [];
        
        if (asignacionesData) {
          for (const asig of asignacionesData) {
            // Buscar en el mapa de profesores
            const profesor = profesoresMap.get(String(asig.id));
            
            // FILTRO CRÍTICO: Si no es profesor, OMITIR
            if (!profesor) {
              const personaNoProfesor = internosMap.get(String(asig.id));
              if (personaNoProfesor) {
                console.log(`⏭️ Omitiendo: ${personaNoProfesor.nombres} ${personaNoProfesor.apellidos} - cargo: ${personaNoProfesor.cargo}`);
              }
              continue;
            }
            
            // Extraer arrays
            let materias = asig["Materia(s)"] || [];
            let grados = asig["Grado(s)"] || [];
            let salones = asig["Salon(es)"] || [];
            
            // Parsear si son strings
            try {
              if (typeof materias === 'string') materias = JSON.parse(materias);
              if (typeof grados === 'string') grados = JSON.parse(grados);
              if (typeof salones === 'string') salones = JSON.parse(salones);
            } catch (e) {
              console.error('❌ Error parseando JSON:', e);
            }
            
            // Asegurar que son arrays
            if (!Array.isArray(materias)) materias = [];
            if (!Array.isArray(grados)) grados = [];
            if (!Array.isArray(salones)) salones = [];

            if (materias.length > 0 && grados.length > 0 && salones.length > 0) {
              asignacionesProcesadas.push({
                id: asig.id,
                codigo: String(profesor.codigo), // CRÍTICO: usar codigo del profesor
                nombres: profesor.nombres,
                apellidos: profesor.apellidos,
                materias: materias.map((m: string) => String(m).trim()),
                grados: grados.map((g: string) => String(g).trim()),
                salones: salones.map((s: string) => String(s).trim())
              });
            }
          }
        }
        
        console.log("Total asignaciones de profesores:", asignacionesProcesadas.length);
        setAsignaciones(asignacionesProcesadas);

        // 2. Obtener TODAS las actividades (sin filtrar por porcentaje)
        const { data: actividadesData } = await supabase
          .from("Nombre de Actividades")
          .select("materia, grado, salon, periodo, nombre, porcentaje, codigo_profesor");
        
        console.log("Actividades raw de BD:", actividadesData?.length || 0);
        
        if (actividadesData) {
          setActividades(actividadesData.map((a: any) => ({
            materia: String(a.materia || '').trim(),
            grado: String(a.grado || '').trim(),
            salon: String(a.salon || '').trim(),
            periodo: Number(a.periodo),
            nombre_actividad: String(a.nombre || '').trim(),
            porcentaje: a.porcentaje,
            codigo_profesor: String(a.codigo_profesor || '')
          })));
        }

        // 3. Obtener todas las notas
        const { data: notasData } = await supabase
          .from("Notas")
          .select("*")
          .not("nombre_actividad", "in", '("Final Periodo","Final Definitiva")');
        
        console.log("Notas raw de BD:", notasData?.length || 0);
        setNotas(notasData?.map((n: any) => ({
          codigo_estudiantil: String(n.codigo_estudiantil || ''),
          materia: String(n.materia || '').trim(),
          grado: String(n.grado || '').trim(),
          salon: String(n.salon || '').trim(),
          periodo: Number(n.periodo),
          nombre_actividad: String(n.nombre_actividad || '').trim(),
          porcentaje: n.porcentaje,
          nota: n.nota
        })) || []);

        // 4. Obtener todos los estudiantes
        const { data: estudiantesData } = await supabase
          .from("Estudiantes")
          .select("*")
          .order("apellidos_estudiante");
        
        console.log("Estudiantes encontrados:", estudiantesData?.length || 0);
        
        setEstudiantes(estudiantesData?.map((e: any) => ({
          codigo_estudiantil: String(e.codigo_estudiantil || ''),
          nombre_estudiante: e.nombre_estudiante || '',
          apellidos_estudiante: e.apellidos_estudiante || '',
          grado_estudiante: String(e.grado_estudiante || '').trim(),
          salon_estudiante: String(e.salon_estudiante || '').trim()
        })) || []);

      } catch (error) {
        console.error("Error fetching completitud data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Expande las asignaciones de profesores a combinaciones individuales
   */
  const expandirAsignaciones = () => {
    const combinaciones: Array<{
      materia: string;
      grado: string;
      salon: string;
      profesor: string; // codigo del profesor
      profesorNombre: string; // Apellidos Nombres
    }> = [];

    for (const asig of asignaciones) {
      const nombreCompleto = `${asig.apellidos} ${asig.nombres}`.trim();
      
      for (const materia of asig.materias) {
        for (const grado of asig.grados) {
          for (const salon of asig.salones) {
            combinaciones.push({
              materia: String(materia).trim(),
              grado: String(grado).trim(),
              salon: String(salon).trim(),
              profesor: asig.codigo, // codigo (BIGINT) del profesor
              profesorNombre: nombreCompleto
            });
          }
        }
      }
    }

    return combinaciones;
  };

  /**
   * Verifica la completitud según el nivel y período seleccionados
   * 
   * REGLAS CRÍTICAS:
   * 1. Actividades SIEMPRE se filtran por codigo_profesor
   * 2. Suma de porcentajes con tolerancia decimal (99.99-100.01)
   * 3. Cada estudiante debe tener nota en CADA actividad
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

    // Períodos a verificar
    const periodosAVerificar = periodo === "anual" ? [1, 2, 3, 4] : [periodo];
    
    console.log("=== VERIFICACIÓN DE COMPLETITUD ===");
    console.log("Nivel:", nivel, "| Período:", periodo);
    console.log("Filtros - Grado:", grado, "| Salón:", salon, "| Materia:", materia);

    // PASO 1: Expandir asignaciones
    let todasLasCombinaciones = expandirAsignaciones();
    console.log("Total combinaciones expandidas:", todasLasCombinaciones.length);

    // PASO 2: Filtrar por nivel de análisis
    if (nivel === "grado" && grado) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => c.grado === grado);
    }
    if (nivel === "salon" && grado && salon) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => 
        c.grado === grado && c.salon === salon
      );
    }
    if (nivel === "materia" && materia) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => c.materia === materia);
    }

    console.log("Combinaciones después de filtrar por nivel:", todasLasCombinaciones.length);

    // PASO 3: Crear índices en memoria para rendimiento
    // Índice de actividades: profesor|materia|grado|salon|periodo -> actividades[]
    const actividadesIndex = new Map<string, ActividadRegistrada[]>();
    for (const act of actividades) {
      const key = `${act.codigo_profesor}|${act.materia}|${act.grado}|${act.salon}|${act.periodo}`;
      if (!actividadesIndex.has(key)) {
        actividadesIndex.set(key, []);
      }
      actividadesIndex.get(key)!.push(act);
    }
    console.log("Índice de actividades creado, keys:", actividadesIndex.size);

    // Índice de notas: estudiante|materia|grado|salon|periodo|actividad -> nota
    const notasIndex = new Map<string, NotaRegistrada>();
    for (const n of notas) {
      const key = `${n.codigo_estudiantil}|${n.materia}|${n.grado}|${n.salon}|${n.periodo}|${n.nombre_actividad}`;
      notasIndex.set(key, n);
    }
    console.log("Índice de notas creado, keys:", notasIndex.size);

    // Índice de estudiantes por grado-salon
    const estudiantesPorSalon = new Map<string, Estudiante[]>();
    for (const est of estudiantes) {
      const key = `${est.grado_estudiante}|${est.salon_estudiante}`;
      if (!estudiantesPorSalon.has(key)) {
        estudiantesPorSalon.set(key, []);
      }
      estudiantesPorSalon.get(key)!.push(est);
    }

    // Para conteo de resumen
    const salonesVerificados = new Set<string>();
    const profesoresVerificados = new Set<string>();
    const materiasPorSalon = new Map<string, number>();
    let asignacionesVerificadas = 0;

    // PASO 4: Verificar cada combinación
    for (const combo of todasLasCombinaciones) {
      // Obtener estudiantes del salón
      const salonKey = `${combo.grado}|${combo.salon}`;
      let estudiantesDelSalon = estudiantesPorSalon.get(salonKey) || [];

      // Si se filtró por estudiante específico
      if (codigoEstudiante) {
        estudiantesDelSalon = estudiantesDelSalon.filter(e => 
          e.codigo_estudiantil === codigoEstudiante
        );
      }

      // Si no hay estudiantes, omitir
      if (estudiantesDelSalon.length === 0) {
        continue;
      }

      asignacionesVerificadas++;
      salonesVerificados.add(`${combo.grado}-${combo.salon}`);
      profesoresVerificados.add(combo.profesorNombre);
      materiasPorSalon.set(combo.materia, (materiasPorSalon.get(combo.materia) || 0) + 1);

      // Verificar cada período seleccionado
      for (const per of periodosAVerificar) {
        let tieneProblema = false;

        // FIX CRÍTICO: Filtrar actividades por codigo_profesor
        const actKey = `${combo.profesor}|${combo.materia}|${combo.grado}|${combo.salon}|${per}`;
        const actividadesPeriodo = actividadesIndex.get(actKey) || [];

        // VERIFICACIÓN 1: ¿Existen actividades?
        if (actividadesPeriodo.length === 0) {
          tieneProblema = true;
          if (detalles.length < 500) {
            detalles.push({
              tipo: "sin_actividades",
              descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: Sin actividades`,
              materia: combo.materia,
              profesor: combo.profesorNombre,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per
            });
          }
        } else {
          // VERIFICACIÓN 2: ¿Suma de porcentajes = 100% (con tolerancia)?
          const sumaPorcentajes = actividadesPeriodo.reduce(
            (sum, a) => sum + (Number(a.porcentaje) || 0), 
            0
          );
          
          // Tolerancia decimal: 99.99 - 100.01
          const porcentajeCompleto = Math.abs(sumaPorcentajes - 100) <= 0.01;

          if (!porcentajeCompleto) {
            tieneProblema = true;
            if (detalles.length < 500) {
              detalles.push({
                tipo: "porcentaje_incompleto",
                descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: ${Math.round(sumaPorcentajes)}%`,
                materia: combo.materia,
                profesor: combo.profesorNombre,
                grado: combo.grado,
                salon: combo.salon,
                periodo: per,
                porcentajeFaltante: Math.round(100 - sumaPorcentajes)
              });
            }
          } else {
            // VERIFICACIÓN 3: ¿Todos los estudiantes tienen notas en TODAS las actividades?
            // Solo verificar actividades con porcentaje > 0
            const actividadesConPeso = actividadesPeriodo.filter(a => 
              a.porcentaje !== null && a.porcentaje > 0
            );

            for (const est of estudiantesDelSalon) {
              for (const act of actividadesConPeso) {
                const notaKey = `${est.codigo_estudiantil}|${combo.materia}|${combo.grado}|${combo.salon}|${per}|${act.nombre_actividad}`;
                const notaRegistrada = notasIndex.get(notaKey);

                // Debe existir el registro Y tener nota no null
                if (!notaRegistrada || notaRegistrada.nota === null) {
                  tieneProblema = true;
                  if (detalles.length < 500) {
                    detalles.push({
                      tipo: "nota_faltante",
                      descripcion: `Falta nota`,
                      materia: combo.materia,
                      profesor: combo.profesorNombre,
                      grado: combo.grado,
                      salon: combo.salon,
                      estudiante: `${est.apellidos_estudiante} ${est.nombre_estudiante}`,
                      periodo: per,
                      actividad: act.nombre_actividad
                    });
                  }
                  // Optimización: si ya encontramos un problema, no necesitamos seguir buscando
                  break;
                }
              }
              if (tieneProblema) break;
            }
          }
        }

        // Si hay problema, marcar al profesor
        if (tieneProblema) {
          profesoresPendientes.add(combo.profesorNombre);
          gradosAfectados.add(combo.grado);
          salonesAfectados.add(combo.salon);
          materiasIncompletas.add(combo.materia);
          break; // No necesitamos verificar más períodos para este combo
        }
      }
    }

    console.log("=== RESULTADO VERIFICACIÓN ===");
    console.log("Asignaciones verificadas:", asignacionesVerificadas);
    console.log("Profesores con pendientes:", profesoresPendientes.size);
    console.log("Lista:", Array.from(profesoresPendientes).sort());

    // Calcular estudiantes únicos verificados
    let estudiantesUnicos = new Set<string>();
    if (grado && salon) {
      const key = `${grado}|${salon}`;
      (estudiantesPorSalon.get(key) || []).forEach(e => 
        estudiantesUnicos.add(e.codigo_estudiantil)
      );
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
      materiasPorSalon
    };

    // Ordenar profesores pendientes alfabéticamente
    const profesoresPendientesOrdenados = Array.from(profesoresPendientes).sort((a, b) => 
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    );

    // Determinar si está completo
    const estaCompleto = profesoresPendientes.size === 0 && 
                         asignacionesVerificadas > 0 && 
                         todasLasCombinaciones.length > 0;

    if (todasLasCombinaciones.length === 0) {
      detalles.push({
        tipo: "sin_actividades",
        descripcion: "No hay asignaciones de profesores configuradas para este nivel",
        materia: "Sin asignaciones"
      });
    } else if (asignacionesVerificadas === 0 && estudiantes.length > 0) {
      detalles.push({
        tipo: "sin_actividades",
        descripcion: "Las asignaciones no coinciden con los estudiantes registrados",
        materia: "Problema de configuración"
      });
    }

    console.log("¿Está completo?:", estaCompleto);

    return {
      completo: estaCompleto,
      detalles: detalles.slice(0, 500),
      resumen: {
        materiasIncompletas: materiasIncompletas.size,
        profesoresPendientes: profesoresPendientesOrdenados,
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
