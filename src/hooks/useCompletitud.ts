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
        // 1. Obtener asignaciones de profesores con sus nombres Y CARGO
        // IMPORTANTE: Solo incluir profesores, NO rectores ni coordinadores
        const { data: internos, error: errorInternos } = await supabase
          .from("Internos")
          .select("id, codigo, nombres, apellidos, cargo");
        
        const { data: asignacionesData, error: errorAsig } = await supabase
          .from("Asignación Profesores")
          .select('*');

        console.log("=== DEBUG ASIGNACIONES ===");
        console.log("Internos encontrados:", internos?.length || 0);
        
        // Filtrar solo profesores (excluir Rector y Coordinador)
        const soloProfeores = internos?.filter((p: any) => p.cargo === 'Profesor(a)') || [];
        console.log("Solo profesores (cargo='Profesor(a)'):", soloProfeores.length);
        
        // Log de cargos encontrados para debug
        const cargosUnicos = [...new Set(internos?.map((p: any) => p.cargo) || [])];
        console.log("Cargos únicos en Internos:", cargosUnicos);
        
        console.log("Asignaciones raw encontradas:", asignacionesData?.length || 0);
        if (errorInternos) console.error("Error internos:", errorInternos);
        if (errorAsig) console.error("Error asignaciones:", errorAsig);

        console.log("=== INICIANDO EXPANSIÓN ===");
        const asignacionesProcesadas: AsignacionProfesor[] = [];
        
        if (asignacionesData) {
          for (let i = 0; i < asignacionesData.length; i++) {
            const asig = asignacionesData[i];
            
            // Buscar profesor en Internos - SOLO si es Profesor(a)
            const profesor = soloProfeores.find((p: any) => p.id === asig.id);
            
            // FILTRO CRÍTICO: Si no es profesor, OMITIR esta asignación
            if (!profesor) {
              // Verificar si existe pero con otro cargo (para log)
              const personaNoProfesor = internos?.find((p: any) => p.id === asig.id);
              if (personaNoProfesor) {
                console.log(`⏭️ Omitiendo asignación de ${personaNoProfesor.nombres} ${personaNoProfesor.apellidos} - cargo: ${personaNoProfesor.cargo} (no es Profesor(a))`);
              }
              continue; // SALTAR - no es profesor
            }
            console.log('Materias raw:', asig["Materia(s)"], '| Tipo:', typeof asig["Materia(s)"]);
            console.log('Grados raw:', asig["Grado(s)"], '| Tipo:', typeof asig["Grado(s)"]);
            console.log('Salones raw:', asig["Salon(es)"], '| Tipo:', typeof asig["Salon(es)"]);
            
            // Extraer arrays - pueden venir como arrays o como strings JSON
            let materias = asig["Materia(s)"] || [];
            let grados = asig["Grado(s)"] || [];
            let salones = asig["Salon(es)"] || [];
            
            // Si son strings, parsear como JSON
            try {
              if (typeof materias === 'string') materias = JSON.parse(materias);
              if (typeof grados === 'string') grados = JSON.parse(grados);
              if (typeof salones === 'string') salones = JSON.parse(salones);
            } catch (e) {
              console.error('❌ Error parseando JSON:', e);
            }
            
            // Asegurar que son arrays
            if (!Array.isArray(materias)) {
              console.error('❌ ERROR: Materia(s) no es un array válido después de parsear');
              materias = [];
            }
            if (!Array.isArray(grados)) {
              console.error('❌ ERROR: Grado(s) no es un array válido después de parsear');
              grados = [];
            }
            if (!Array.isArray(salones)) {
              console.error('❌ ERROR: Salon(es) no es un array válido después de parsear');
              salones = [];
            }
            
            console.log('Materias procesadas:', materias, '| Length:', materias.length);
            console.log('Grados procesados:', grados, '| Length:', grados.length);
            console.log('Salones procesados:', salones, '| Length:', salones.length);

            // Calcular combinaciones potenciales
            const combinacionesPotenciales = materias.length * grados.length * salones.length;
            console.log(`✅ Combinaciones potenciales: ${materias.length} × ${grados.length} × ${salones.length} = ${combinacionesPotenciales}`);

            if (materias.length > 0 && grados.length > 0 && salones.length > 0) {
              const nombreProfesor = profesor ? profesor.nombres : 'Desconocido';
              const apellidoProfesor = profesor ? profesor.apellidos : '';
              
              asignacionesProcesadas.push({
                id: asig.id,
                codigo: profesor?.codigo || asig.id || "desconocido",
                nombres: nombreProfesor,
                apellidos: apellidoProfesor,
                materias,
                grados,
                salones
              });
              console.log(`✅ Asignación agregada para: ${nombreProfesor} ${apellidoProfesor}`);
            } else {
              console.log('⚠️ Asignación omitida - arrays vacíos');
            }
          }
        }
        
        console.log("\n=== FIN EXPANSIÓN ===");
        console.log("Total asignaciones procesadas:", asignacionesProcesadas.length);
        if (asignacionesProcesadas.length > 0) {
          console.log("Ejemplo de asignación procesada:", JSON.stringify(asignacionesProcesadas[0], null, 2));
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
        
        console.log("=== DEBUG ESTUDIANTES ===");
        console.log("Estudiantes encontrados:", estudiantesData?.length || 0);
        if (estudiantesData && estudiantesData.length > 0) {
          const gradosUnicos = [...new Set(estudiantesData.map((e: any) => e.grado_estudiante))];
          const salonesUnicos = [...new Set(estudiantesData.map((e: any) => e.salon_estudiante))];
          console.log("Grados únicos en estudiantes:", gradosUnicos);
          console.log("Salones únicos en estudiantes:", salonesUnicos);
        }
        
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

    console.log("=== EXPANDIENDO COMBINACIONES ===");
    console.log("Asignaciones a expandir:", asignaciones.length);

    for (const asig of asignaciones) {
      const nombreCompleto = `${asig.apellidos} ${asig.nombres}`.trim();
      let countAsig = 0;
      
      for (const materia of asig.materias) {
        for (const grado of asig.grados) {
          for (const salon of asig.salones) {
            combinaciones.push({
              materia,
              grado,
              salon,
              profesor: asig.codigo,
              profesorNombre: nombreCompleto
            });
            countAsig++;
          }
        }
      }
      console.log(`${nombreCompleto}: ${countAsig} combinaciones`);
    }

    console.log("Total combinaciones expandidas:", combinaciones.length);
    return combinaciones;
  };

  /**
   * Verifica la completitud según el nivel y período seleccionados
   * Usa "Asignación Profesores" como FUENTE DE VERDAD
   * 
   * REGLA CRÍTICA: La verificación es ESPECÍFICA al período y nivel seleccionado
   * - Si se selecciona Período 1, SOLO se verifica P1
   * - Si se selecciona "Acumulado Anual", se verifican TODOS los períodos (1,2,3,4)
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

    // CRÍTICO: Definir qué períodos verificar según la selección
    const periodosAVerificar = periodo === "anual" ? [1, 2, 3, 4] : [periodo];
    
    console.log("=== VERIFICACIÓN ESPECÍFICA POR PERÍODO ===");
    console.log("Período seleccionado:", periodo);
    console.log("Períodos a verificar:", periodosAVerificar);
    console.log("Nivel:", nivel, "| Grado:", grado, "| Salón:", salon, "| Materia:", materia);

    // PASO 1: Expandir todas las asignaciones de "Asignación Profesores"
    let todasLasCombinaciones = expandirAsignaciones();

    // PASO 2: Filtrar combinaciones según el nivel de análisis seleccionado
    if (nivel === "grado" && grado) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => 
        String(c.grado).trim() === String(grado).trim()
      );
    }
    if (nivel === "salon" && grado && salon) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => 
        String(c.grado).trim() === String(grado).trim() &&
        String(c.salon).trim() === String(salon).trim()
      );
    }
    if (nivel === "materia" && materia) {
      todasLasCombinaciones = todasLasCombinaciones.filter(c => 
        String(c.materia).trim() === String(materia).trim()
      );
    }

    console.log("Combinaciones después de filtrar por nivel:", todasLasCombinaciones.length);

    // Para conteo de resumen completo
    const salonesVerificados = new Set<string>();
    const profesoresVerificados = new Set<string>();
    const materiasPorSalon = new Map<string, number>();
    let asignacionesVerificadas = 0;

    // Map para rastrear qué profesores tienen pendientes en ESTE período/nivel específico
    const profesoresConPendientesEnPeriodo = new Map<string, boolean>();

    // PASO 3: Para CADA combinación materia-grado-salón, verificar completitud SOLO en los períodos seleccionados
    for (const combo of todasLasCombinaciones) {
      // Obtener estudiantes de este grado-salón (normalizado)
      let estudiantesDelSalon = estudiantes.filter(e => {
        const gradoMatch = String(e.grado_estudiante).trim() === String(combo.grado).trim();
        const salonMatch = String(e.salon_estudiante).trim() === String(combo.salon).trim();
        return gradoMatch && salonMatch;
      });

      // Si se filtró por estudiante específico
      if (codigoEstudiante) {
        estudiantesDelSalon = estudiantesDelSalon.filter(e => e.codigo_estudiantil === codigoEstudiante);
      }

      // Si no hay estudiantes para esta combinación, no es problema del profesor
      // Solo reportamos si es un problema real de configuración
      if (estudiantesDelSalon.length === 0) {
        continue; // Simplemente omitir - no afecta la completitud
      }

      asignacionesVerificadas++;
      salonesVerificados.add(`${combo.grado}-${combo.salon}`);
      profesoresVerificados.add(combo.profesorNombre);
      
      const salonKey = combo.materia;
      materiasPorSalon.set(salonKey, (materiasPorSalon.get(salonKey) || 0) + 1);

      // CRÍTICO: Solo verificar los períodos seleccionados
      for (const per of periodosAVerificar) {
        let tieneProblemaEnEstePeriodo = false;

        // Obtener actividades con porcentaje de esta combinación para ESTE período
        const actividadesPeriodo = actividades.filter(a =>
          a.materia === combo.materia &&
          String(a.grado).trim() === String(combo.grado).trim() &&
          String(a.salon).trim() === String(combo.salon).trim() &&
          a.periodo === per &&
          a.porcentaje !== null && a.porcentaje > 0
        );

        // VERIFICACIÓN 1: ¿Existen actividades para esta combinación en ESTE período?
        if (actividadesPeriodo.length === 0) {
          tieneProblemaEnEstePeriodo = true;
          detalles.push({
            tipo: "sin_actividades",
            descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: No hay actividades`,
            materia: combo.materia,
            profesor: combo.profesorNombre,
            grado: combo.grado,
            salon: combo.salon,
            periodo: per
          });
        } else {
          // VERIFICACIÓN 2: ¿Los porcentajes suman 100%?
          const sumaPorcentajes = actividadesPeriodo.reduce((sum, a) => sum + (a.porcentaje || 0), 0);
          
          if (sumaPorcentajes < 100) {
            tieneProblemaEnEstePeriodo = true;
            detalles.push({
              tipo: "porcentaje_incompleto",
              descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: ${Math.round(sumaPorcentajes)}%`,
              materia: combo.materia,
              profesor: combo.profesorNombre,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per,
              porcentajeFaltante: 100 - Math.round(sumaPorcentajes)
            });
          }

          // VERIFICACIÓN 3: ¿TODOS los estudiantes tienen nota en TODAS las actividades?
          if (sumaPorcentajes === 100) {
            for (const est of estudiantesDelSalon) {
              for (const act of actividadesPeriodo) {
                const tieneNota = notas.some(n =>
                  n.codigo_estudiantil === est.codigo_estudiantil &&
                  n.materia === combo.materia &&
                  String(n.grado).trim() === String(combo.grado).trim() &&
                  String(n.salon).trim() === String(combo.salon).trim() &&
                  n.periodo === per &&
                  n.nombre_actividad === act.nombre_actividad
                );

                if (!tieneNota) {
                  tieneProblemaEnEstePeriodo = true;
                  detalles.push({
                    tipo: "nota_faltante",
                    descripcion: `Nota faltante`,
                    materia: combo.materia,
                    profesor: combo.profesorNombre,
                    grado: combo.grado,
                    salon: combo.salon,
                    estudiante: `${est.apellidos_estudiante} ${est.nombre_estudiante}`,
                    periodo: per,
                    actividad: act.nombre_actividad
                  });
                }
              }
            }
          }
        }

        // Si este profesor tiene problema en ESTE período, marcarlo
        if (tieneProblemaEnEstePeriodo) {
          profesoresConPendientesEnPeriodo.set(combo.profesorNombre, true);
          profesoresPendientes.add(combo.profesorNombre);
          gradosAfectados.add(combo.grado);
          salonesAfectados.add(combo.salon);
          materiasIncompletas.add(combo.materia);
        }

        // Limitar para rendimiento
        if (detalles.length >= 500) break;
      }
      if (detalles.length >= 500) break;
    }

    console.log("=== RESULTADO VERIFICACIÓN ===");
    console.log("Asignaciones verificadas:", asignacionesVerificadas);
    console.log("Profesores con pendientes en período seleccionado:", profesoresPendientes.size);
    console.log("Lista de profesores pendientes:", Array.from(profesoresPendientes));

    // Calcular total de estudiantes únicos verificados
    let estudiantesUnicos = new Set<string>();
    if (grado && salon) {
      estudiantes
        .filter(e => 
          String(e.grado_estudiante).trim() === String(grado).trim() && 
          String(e.salon_estudiante).trim() === String(salon).trim()
        )
        .forEach(e => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (grado) {
      estudiantes
        .filter(e => String(e.grado_estudiante).trim() === String(grado).trim())
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
    // 1. No hay profesores con pendientes para ESTE período/nivel específico
    // 2. Se verificaron al menos algunas asignaciones
    // 3. Hay combinaciones que verificar
    const estaCompleto = profesoresPendientes.size === 0 && 
                         asignacionesVerificadas > 0 && 
                         todasLasCombinaciones.length > 0;

    // Si no hay combinaciones o no se verificó nada, agregar mensaje explicativo
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

    console.log("¿Está completo para período", periodo, "?:", estaCompleto);

    return {
      completo: estaCompleto,
      detalles: detalles.slice(0, 500),
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
