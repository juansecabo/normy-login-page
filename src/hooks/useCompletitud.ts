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

interface InternoProfesor {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  cargo: string;
}

interface AsignacionExpandida {
  materia: string;
  grado: string;
  salon: string;
  codigoProfesor: string;
  nombreCompleto: string;
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
  nota: number | null;
}

interface Estudiante {
  codigo_estudiantil: string;
  nombre_estudiante: string;
  apellidos_estudiante: string;
  grado_estudiante: string;
  salon_estudiante: string;
}

// Función de normalización global
const normalize = (x: any): string => {
  return String(x || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

export const useCompletitud = () => {
  const [combinacionesExpandidas, setCombinacionesExpandidas] = useState<AsignacionExpandida[]>([]);
  const [actividades, setActividades] = useState<ActividadRegistrada[]>([]);
  const [notas, setNotas] = useState<NotaRegistrada[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Obtener todos los internos con campos correctos
        const { data: internos, error: errorInternos } = await supabase
          .from("Internos")
          .select("id, codigo, nombres, apellidos, cargo");
        
        if (errorInternos) {
          console.error("❌ Error obteniendo Internos:", errorInternos);
        }

        // 2. Filtrar SOLO profesores (cargo='Profesor(a)')
        const soloProfeores: InternoProfesor[] = (internos || [])
          .filter((p: any) => p.cargo === 'Profesor(a)')
          .map((p: any) => ({
            id: String(p.id || ''),
            codigo: String(p.codigo || ''),
            nombres: String(p.nombres || ''),
            apellidos: String(p.apellidos || ''),
            cargo: p.cargo
          }));

        console.log("=== DEBUG COMPLETITUD ===");
        console.log("totalInternosProfesores:", soloProfeores.length);
        
        // Log de cargos únicos
        const cargosUnicos = [...new Set((internos || []).map((p: any) => p.cargo))];
        console.log("Cargos únicos en Internos:", cargosUnicos);

        // 3. Obtener asignaciones de profesores
        const { data: asignacionesData, error: errorAsig } = await supabase
          .from("Asignación Profesores")
          .select('*');

        if (errorAsig) {
          console.error("❌ Error obteniendo Asignación Profesores:", errorAsig);
        }

        console.log("Asignaciones raw encontradas:", asignacionesData?.length || 0);

        // 4. Procesar y expandir asignaciones
        const combinaciones: AsignacionExpandida[] = [];
        let asignacionesValidas = 0;
        let asignacionesAsociadasAInternos = 0;

        for (const asig of (asignacionesData || [])) {
          // Extraer arrays
          let materias: string[] = [];
          let grados: string[] = [];
          let salones: string[] = [];

          // Parsear si es necesario
          try {
            const rawMaterias = asig["Materia(s)"];
            const rawGrados = asig["Grado(s)"];
            const rawSalones = asig["Salon(es)"];

            materias = Array.isArray(rawMaterias) ? rawMaterias : 
                       (typeof rawMaterias === 'string' ? JSON.parse(rawMaterias) : []);
            grados = Array.isArray(rawGrados) ? rawGrados :
                     (typeof rawGrados === 'string' ? JSON.parse(rawGrados) : []);
            salones = Array.isArray(rawSalones) ? rawSalones :
                      (typeof rawSalones === 'string' ? JSON.parse(rawSalones) : []);
          } catch (e) {
            console.warn("⚠️ Error parseando arrays de asignación:", e);
            continue;
          }

          // Validar que tenga datos
          if (materias.length === 0 || grados.length === 0 || salones.length === 0) {
            continue; // Asignación inválida
          }

          asignacionesValidas++;

          // Buscar profesor en Internos
          let profesorEncontrado: InternoProfesor | null = null;

          // Método 1: Match por ID
          if (asig.id) {
            profesorEncontrado = soloProfeores.find(p => p.id === String(asig.id)) || null;
          }

          // Método 2: Match por nombres normalizados (fallback)
          if (!profesorEncontrado && asig.apellidos && asig.nombres) {
            profesorEncontrado = soloProfeores.find(p =>
              normalize(p.apellidos) === normalize(asig.apellidos) &&
              normalize(p.nombres) === normalize(asig.nombres)
            ) || null;
          }

          // Si no se encontró en Internos como Profesor(a), omitir
          if (!profesorEncontrado) {
            // Verificar si existe pero con otro cargo
            const personaOtroCargo = (internos || []).find((p: any) => 
              p.id === asig.id || 
              (normalize(p.apellidos) === normalize(asig.apellidos) && 
               normalize(p.nombres) === normalize(asig.nombres))
            );
            
            if (personaOtroCargo) {
              console.log(`⏭️ Omitiendo: ${asig.nombres} ${asig.apellidos} - cargo: ${personaOtroCargo.cargo} (no es Profesor(a))`);
            } else {
              console.warn(`⚠️ Asignación sin match a Internos: ${asig.nombres} ${asig.apellidos}`);
            }
            continue;
          }

          asignacionesAsociadasAInternos++;
          const nombreCompleto = `${profesorEncontrado.apellidos} ${profesorEncontrado.nombres}`.trim();
          const codigoProfesor = profesorEncontrado.codigo;

          // Expandir: ZIP vs Producto Cartesiano
          if (materias.length === grados.length && grados.length === salones.length) {
            // ZIP: listas paralelas
            for (let i = 0; i < materias.length; i++) {
              combinaciones.push({
                materia: String(materias[i]).trim(),
                grado: String(grados[i]).trim(),
                salon: String(salones[i]).trim(),
                codigoProfesor,
                nombreCompleto
              });
            }
          } else {
            // Producto cartesiano
            for (const materia of materias) {
              for (const grado of grados) {
                for (const salon of salones) {
                  combinaciones.push({
                    materia: String(materia).trim(),
                    grado: String(grado).trim(),
                    salon: String(salon).trim(),
                    codigoProfesor,
                    nombreCompleto
                  });
                }
              }
            }
          }
        }

        console.log("totalAsignacionesValidas:", asignacionesValidas);
        console.log("totalAsignacionesAsociadasAInternos:", asignacionesAsociadasAInternos);
        console.log("Total combinaciones expandidas:", combinaciones.length);

        setCombinacionesExpandidas(combinaciones);

        // 5. Obtener actividades con nombre_actividad (FIX CRÍTICO #1)
        const { data: actividadesData, error: errorAct } = await supabase
          .from("Nombre de Actividades")
          .select("materia, grado, salon, periodo, nombre_actividad, porcentaje, codigo_profesor");
        
        if (errorAct) {
          console.error("❌ Error obteniendo actividades:", errorAct);
        }

        const actividadesProcesadas: ActividadRegistrada[] = (actividadesData || []).map((a: any) => ({
          materia: String(a.materia || '').trim(),
          grado: String(a.grado || '').trim(),
          salon: String(a.salon || '').trim(),
          periodo: Number(a.periodo),
          nombre_actividad: String(a.nombre_actividad || '').trim(),
          porcentaje: a.porcentaje != null ? Number(a.porcentaje) : null,
          codigo_profesor: String(a.codigo_profesor || '').trim()
        }));

        console.log("Actividades cargadas:", actividadesProcesadas.length);
        setActividades(actividadesProcesadas);

        // 6. Obtener todas las notas (excluyendo finales)
        const { data: notasData, error: errorNotas } = await supabase
          .from("Notas")
          .select("codigo_estudiantil, materia, grado, salon, periodo, nombre_actividad, nota")
          .not("nombre_actividad", "in", '("Final Periodo","Final Definitiva")');
        
        if (errorNotas) {
          console.error("❌ Error obteniendo notas:", errorNotas);
        }

        const notasProcesadas: NotaRegistrada[] = (notasData || []).map((n: any) => ({
          codigo_estudiantil: String(n.codigo_estudiantil || '').trim(),
          materia: String(n.materia || '').trim(),
          grado: String(n.grado || '').trim(),
          salon: String(n.salon || '').trim(),
          periodo: Number(n.periodo),
          nombre_actividad: String(n.nombre_actividad || '').trim(),
          nota: n.nota != null ? Number(n.nota) : null
        }));

        console.log("Notas cargadas:", notasProcesadas.length);
        setNotas(notasProcesadas);

        // 7. Obtener todos los estudiantes
        const { data: estudiantesData, error: errorEst } = await supabase
          .from("Estudiantes")
          .select("codigo_estudiantil, nombre_estudiante, apellidos_estudiante, grado_estudiante, salon_estudiante")
          .order("apellidos_estudiante");
        
        if (errorEst) {
          console.error("❌ Error obteniendo estudiantes:", errorEst);
        }

        const estudiantesProcesados: Estudiante[] = (estudiantesData || []).map((e: any) => ({
          codigo_estudiantil: String(e.codigo_estudiantil || '').trim(),
          nombre_estudiante: String(e.nombre_estudiante || '').trim(),
          apellidos_estudiante: String(e.apellidos_estudiante || '').trim(),
          grado_estudiante: String(e.grado_estudiante || '').trim(),
          salon_estudiante: String(e.salon_estudiante || '').trim()
        }));

        console.log("Estudiantes cargados:", estudiantesProcesados.length);
        setEstudiantes(estudiantesProcesados);

      } catch (error) {
        console.error("❌ Error general en fetchData:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Verifica la completitud según el nivel y período seleccionados
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
    const periodosAVerificar = periodo === "anual" ? [1, 2, 3, 4] : [periodo as number];
    
    console.log("=== VERIFICACIÓN COMPLETITUD ===");
    console.log("Período:", periodo, "→ Verificar:", periodosAVerificar);
    console.log("Nivel:", nivel, "| Grado:", grado, "| Salón:", salon, "| Materia:", materia);

    // Filtrar combinaciones según nivel
    let combinacionesFiltradas = [...combinacionesExpandidas];

    if (nivel === "grado" && grado) {
      combinacionesFiltradas = combinacionesFiltradas.filter(c => 
        normalize(c.grado) === normalize(grado)
      );
    }
    if (nivel === "salon" && grado && salon) {
      combinacionesFiltradas = combinacionesFiltradas.filter(c => 
        normalize(c.grado) === normalize(grado) &&
        normalize(c.salon) === normalize(salon)
      );
    }
    if (nivel === "materia" && materia) {
      combinacionesFiltradas = combinacionesFiltradas.filter(c => 
        normalize(c.materia) === normalize(materia)
      );
    }

    console.log("Combinaciones a verificar:", combinacionesFiltradas.length);

    // Para tracking
    const salonesVerificados = new Set<string>();
    const profesoresVerificados = new Set<string>();
    const materiasPorSalon = new Map<string, number>();
    let asignacionesVerificadas = 0;

    // Verificar cada combinación
    for (const combo of combinacionesFiltradas) {
      // Obtener estudiantes del grado-salón
      let estudiantesDelSalon = estudiantes.filter(e => 
        normalize(e.grado_estudiante) === normalize(combo.grado) &&
        normalize(e.salon_estudiante) === normalize(combo.salon)
      );

      // Filtrar por estudiante específico si aplica
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
      profesoresVerificados.add(combo.nombreCompleto);
      materiasPorSalon.set(combo.materia, (materiasPorSalon.get(combo.materia) || 0) + 1);

      // Verificar cada período
      for (const per of periodosAVerificar) {
        let tieneProblema = false;

        // FIX CRÍTICO #2: Filtrar actividades por codigo_profesor
        const actividadesPeriodo = actividades.filter(a =>
          a.codigo_profesor === combo.codigoProfesor &&
          normalize(a.materia) === normalize(combo.materia) &&
          normalize(a.grado) === normalize(combo.grado) &&
          normalize(a.salon) === normalize(combo.salon) &&
          a.periodo === per &&
          a.porcentaje != null && a.porcentaje > 0
        );

        // Verificación 1: ¿Hay actividades?
        if (actividadesPeriodo.length === 0) {
          tieneProblema = true;
          if (detalles.length < 200) {
            detalles.push({
              tipo: "sin_actividades",
              descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: Sin actividades`,
              materia: combo.materia,
              profesor: combo.nombreCompleto,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per
            });
          }
        } else {
          // FIX CRÍTICO #3: Suma con tolerancia
          const sumaPorcentajes = actividadesPeriodo.reduce((sum, a) => sum + (a.porcentaje || 0), 0);
          const porcentajeCompleto = Math.abs(sumaPorcentajes - 100) <= 0.01;

          if (!porcentajeCompleto) {
            tieneProblema = true;
            if (detalles.length < 200) {
              detalles.push({
                tipo: "porcentaje_incompleto",
                descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: ${Math.round(sumaPorcentajes)}%`,
                materia: combo.materia,
                profesor: combo.nombreCompleto,
                grado: combo.grado,
                salon: combo.salon,
                periodo: per,
                porcentajeFaltante: 100 - Math.round(sumaPorcentajes)
              });
            }
          }

          // Verificación 3: Notas de estudiantes (solo si porcentaje está completo)
          if (porcentajeCompleto) {
            for (const est of estudiantesDelSalon) {
              for (const act of actividadesPeriodo) {
                // FIX CRÍTICO #4: Verificar que nota exista Y no sea null
                const notaRegistro = notas.find(n =>
                  n.codigo_estudiantil === est.codigo_estudiantil &&
                  normalize(n.materia) === normalize(combo.materia) &&
                  normalize(n.grado) === normalize(combo.grado) &&
                  normalize(n.salon) === normalize(combo.salon) &&
                  n.periodo === per &&
                  normalize(n.nombre_actividad) === normalize(act.nombre_actividad)
                );

                const tieneNotaValida = notaRegistro && notaRegistro.nota != null;

                if (!tieneNotaValida) {
                  tieneProblema = true;
                  if (detalles.length < 200) {
                    detalles.push({
                      tipo: "nota_faltante",
                      descripcion: `Nota faltante`,
                      materia: combo.materia,
                      profesor: combo.nombreCompleto,
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
        }

        // Marcar profesor como pendiente
        if (tieneProblema) {
          profesoresPendientes.add(combo.nombreCompleto);
          gradosAfectados.add(combo.grado);
          salonesAfectados.add(combo.salon);
          materiasIncompletas.add(combo.materia);
        }
      }

      // Límite de rendimiento
      if (detalles.length >= 200) break;
    }

    // Calcular estudiantes únicos
    let estudiantesUnicos = new Set<string>();
    if (grado && salon) {
      estudiantes
        .filter(e => 
          normalize(e.grado_estudiante) === normalize(grado) && 
          normalize(e.salon_estudiante) === normalize(salon)
        )
        .forEach(e => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (grado) {
      estudiantes
        .filter(e => normalize(e.grado_estudiante) === normalize(grado))
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

    const estaCompleto = profesoresPendientes.size === 0 && 
                         asignacionesVerificadas > 0 && 
                         combinacionesFiltradas.length > 0;

    console.log("=== RESULTADO ===");
    console.log("Asignaciones verificadas:", asignacionesVerificadas);
    console.log("totalProfesoresPendientes:", profesoresPendientes.size);
    console.log("Profesores pendientes:", profesoresPendientesOrdenados);
    console.log("¿Completo?:", estaCompleto);

    // Mensajes si no hay datos
    if (combinacionesFiltradas.length === 0) {
      detalles.push({
        tipo: "sin_actividades",
        descripcion: "No hay asignaciones configuradas para este nivel",
        materia: "Sin asignaciones"
      });
    } else if (asignacionesVerificadas === 0) {
      detalles.push({
        tipo: "sin_actividades",
        descripcion: "No hay estudiantes registrados en las asignaciones verificadas",
        materia: "Sin estudiantes"
      });
    }

    return {
      completo: estaCompleto,
      detalles: detalles.slice(0, 200),
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
    asignaciones: combinacionesExpandidas,
    estudiantes
  };
};
