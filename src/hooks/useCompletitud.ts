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
  codigoProfesor: string; // Internos.codigo
  nombreCompleto: string; // "Apellidos Nombres"
}

interface ActividadRegistrada {
  materia: string;
  grado: string;
  salon: string;
  periodo: number;
  nombre_actividad: string;
  porcentaje: number | null;
  codigo_profesor: string; // Internos.codigo
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

// Normalización global
const normalize = (x: any): string => {
  return String(x || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const DETALLE_LIMIT = 200;
const PERCENT_TOL = 0.01;

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
        // 1) Internos
        const { data: internos, error: errorInternos } = await supabase
          .from("Internos")
          .select("id, codigo, nombres, apellidos, cargo");

        if (errorInternos) console.error("❌ Error obteniendo Internos:", errorInternos);

        const soloProfesores: InternoProfesor[] = (internos || [])
          .filter((p: any) => p.cargo === "Profesor(a)")
          .map((p: any) => ({
            id: String(p.id || ""),
            codigo: String(p.codigo || "").trim(),
            nombres: String(p.nombres || "").trim(),
            apellidos: String(p.apellidos || "").trim(),
            cargo: p.cargo,
          }));

        console.log("=== DEBUG COMPLETITUD ===");
        console.log("totalInternosProfesores:", soloProfesores.length);
        console.log("Cargos únicos en Internos:", [...new Set((internos || []).map((p: any) => p.cargo))]);

        // Map para match rápido por id y por nombre
        const profById = new Map<string, InternoProfesor>();
        const profByName = new Map<string, InternoProfesor>();
        for (const p of soloProfesores) {
          profById.set(String(p.id), p);
          profByName.set(`${normalize(p.apellidos)}|${normalize(p.nombres)}`, p);
        }

        // 2) Asignación Profesores
        const { data: asignacionesData, error: errorAsig } = await supabase.from("Asignación Profesores").select("*");

        if (errorAsig) console.error("❌ Error obteniendo Asignación Profesores:", errorAsig);
        console.log("Asignaciones raw encontradas:", asignacionesData?.length || 0);

        const combinaciones: AsignacionExpandida[] = [];
        let asignacionesValidas = 0;
        let asignacionesAsociadasAInternos = 0;

        for (const asig of asignacionesData || []) {
          // Parsear arrays
          let materias: string[] = [];
          let grados: string[] = [];
          let salones: string[] = [];

          try {
            const rawMaterias = asig["Materia(s)"];
            const rawGrados = asig["Grado(s)"];
            const rawSalones = asig["Salon(es)"];

            materias = Array.isArray(rawMaterias)
              ? rawMaterias
              : typeof rawMaterias === "string"
                ? JSON.parse(rawMaterias)
                : [];

            grados = Array.isArray(rawGrados) ? rawGrados : typeof rawGrados === "string" ? JSON.parse(rawGrados) : [];

            salones = Array.isArray(rawSalones)
              ? rawSalones
              : typeof rawSalones === "string"
                ? JSON.parse(rawSalones)
                : [];
          } catch (e) {
            console.warn("⚠️ Error parseando arrays de asignación:", e);
            continue;
          }

          if (!materias.length || !grados.length || !salones.length) continue;
          asignacionesValidas++;

          // Encontrar profesor: por id si existe, sino por nombre
          let prof: InternoProfesor | null = null;

          if (asig.id != null && String(asig.id).trim() !== "") {
            prof = profById.get(String(asig.id)) || null;
          }

          if (!prof && asig.apellidos && asig.nombres) {
            prof = profByName.get(`${normalize(asig.apellidos)}|${normalize(asig.nombres)}`) || null;
          }

          if (!prof) {
            console.warn(
              `⚠️ Asignación sin match a Internos Profesor(a): ${asig.nombres || ""} ${asig.apellidos || ""}`,
            );
            continue;
          }

          asignacionesAsociadasAInternos++;
          const nombreCompleto = `${prof.apellidos} ${prof.nombres}`.trim();
          const codigoProfesor = prof.codigo;

          const materiasTrim = materias.map((x) => String(x).trim());
          const gradosTrim = grados.map((x) => String(x).trim());
          const salonesTrim = salones.map((x) => String(x).trim());

          // ZIP vs cartesiano
          if (
            materiasTrim.length === gradosTrim.length &&
            gradosTrim.length === salonesTrim.length &&
            materiasTrim.length > 0
          ) {
            for (let i = 0; i < materiasTrim.length; i++) {
              combinaciones.push({
                materia: materiasTrim[i],
                grado: gradosTrim[i],
                salon: salonesTrim[i],
                codigoProfesor,
                nombreCompleto,
              });
            }
          } else {
            for (const m of materiasTrim) {
              for (const g of gradosTrim) {
                for (const s of salonesTrim) {
                  combinaciones.push({
                    materia: m,
                    grado: g,
                    salon: s,
                    codigoProfesor,
                    nombreCompleto,
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

        // 3) Actividades (nombre_actividad real)
        const { data: actividadesData, error: errorAct } = await supabase
          .from("Nombre de Actividades")
          .select("materia, grado, salon, periodo, nombre_actividad, porcentaje, codigo_profesor");

        if (errorAct) console.error("❌ Error obteniendo actividades:", errorAct);

        const actividadesProcesadas: ActividadRegistrada[] = (actividadesData || []).map((a: any) => ({
          materia: String(a.materia || "").trim(),
          grado: String(a.grado || "").trim(),
          salon: String(a.salon || "").trim(),
          periodo: Number(a.periodo),
          nombre_actividad: String(a.nombre_actividad || "").trim(),
          porcentaje: a.porcentaje != null ? Number(a.porcentaje) : null,
          codigo_profesor: String(a.codigo_profesor || "").trim(),
        }));

        console.log("Actividades cargadas:", actividadesProcesadas.length);
        setActividades(actividadesProcesadas);

        // 4) Notas
        const { data: notasData, error: errorNotas } = await supabase
          .from("Notas")
          .select("codigo_estudiantil, materia, grado, salon, periodo, nombre_actividad, nota")
          .not("nombre_actividad", "in", '("Final Periodo","Final Definitiva")');

        if (errorNotas) console.error("❌ Error obteniendo notas:", errorNotas);

        const notasProcesadas: NotaRegistrada[] = (notasData || []).map((n: any) => ({
          codigo_estudiantil: String(n.codigo_estudiantil || "").trim(),
          materia: String(n.materia || "").trim(),
          grado: String(n.grado || "").trim(),
          salon: String(n.salon || "").trim(),
          periodo: Number(n.periodo),
          nombre_actividad: String(n.nombre_actividad || "").trim(),
          nota: n.nota != null ? Number(n.nota) : null,
        }));

        console.log("Notas cargadas:", notasProcesadas.length);
        setNotas(notasProcesadas);

        // 5) Estudiantes
        const { data: estudiantesData, error: errorEst } = await supabase
          .from("Estudiantes")
          .select("codigo_estudiantil, nombre_estudiante, apellidos_estudiante, grado_estudiante, salon_estudiante")
          .order("apellidos_estudiante");

        if (errorEst) console.error("❌ Error obteniendo estudiantes:", errorEst);

        const estudiantesProcesados: Estudiante[] = (estudiantesData || []).map((e: any) => ({
          codigo_estudiantil: String(e.codigo_estudiantil || "").trim(),
          nombre_estudiante: String(e.nombre_estudiante || "").trim(),
          apellidos_estudiante: String(e.apellidos_estudiante || "").trim(),
          grado_estudiante: String(e.grado_estudiante || "").trim(),
          salon_estudiante: String(e.salon_estudiante || "").trim(),
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

  const verificarCompletitud = (
    nivel: "institucion" | "grado" | "salon" | "materia" | "estudiante",
    periodo: number | "anual",
    grado?: string,
    salon?: string,
    materia?: string,
    codigoEstudiante?: string,
  ): ResultadoCompletitud => {
    const detalles: DetalleIncompleto[] = [];
    const profesoresPendientes = new Set<string>();
    const gradosAfectados = new Set<string>();
    const salonesAfectados = new Set<string>();
    const materiasIncompletas = new Set<string>();

    const periodosAVerificar = periodo === "anual" ? [1, 2, 3, 4] : [periodo as number];

    // GUARD: si todavía está cargando, no calcular “a medias”
    if (loading) {
      return {
        completo: false,
        detalles: [
          {
            tipo: "sin_actividades",
            descripcion: "Cargando datos... espera un momento y vuelve a abrir el modal.",
            materia: "Cargando",
          },
        ],
        resumen: { materiasIncompletas: 0, profesoresPendientes: [], gradosAfectados: [], salonesAfectados: [] },
      };
    }

    console.log("=== VERIFICACIÓN COMPLETITUD ===");
    console.log("Período:", periodo, "→ Verificar:", periodosAVerificar);
    console.log("Nivel:", nivel, "| Grado:", grado, "| Salón:", salon, "| Materia:", materia);

    // Filtrar combinaciones por nivel
    let combinacionesFiltradas = [...combinacionesExpandidas];

    if (nivel === "grado" && grado) {
      combinacionesFiltradas = combinacionesFiltradas.filter((c) => normalize(c.grado) === normalize(grado));
    }
    if (nivel === "salon" && grado && salon) {
      combinacionesFiltradas = combinacionesFiltradas.filter(
        (c) => normalize(c.grado) === normalize(grado) && normalize(c.salon) === normalize(salon),
      );
    }
    if (nivel === "materia" && materia) {
      combinacionesFiltradas = combinacionesFiltradas.filter((c) => normalize(c.materia) === normalize(materia));
    }

    console.log("Combinaciones a verificar:", combinacionesFiltradas.length);

    // Índices para rendimiento + consistencia
    const estudiantesPorSalon = new Map<string, Estudiante[]>();
    for (const e of estudiantes) {
      const key = `${normalize(e.grado_estudiante)}|${normalize(e.salon_estudiante)}`;
      if (!estudiantesPorSalon.has(key)) estudiantesPorSalon.set(key, []);
      estudiantesPorSalon.get(key)!.push(e);
    }

    const actividadesIndex = new Map<string, ActividadRegistrada[]>();
    for (const a of actividades) {
      const key = `${a.codigo_profesor}|${normalize(a.materia)}|${normalize(a.grado)}|${normalize(a.salon)}|${a.periodo}`;
      if (!actividadesIndex.has(key)) actividadesIndex.set(key, []);
      actividadesIndex.get(key)!.push(a);
    }

    const notasIndex = new Map<string, NotaRegistrada>();
    for (const n of notas) {
      const key = `${n.codigo_estudiantil}|${normalize(n.materia)}|${normalize(n.grado)}|${normalize(n.salon)}|${n.periodo}|${normalize(n.nombre_actividad)}`;
      notasIndex.set(key, n);
    }

    // Para resumen
    const salonesVerificados = new Set<string>();
    const profesoresVerificados = new Set<string>();
    const materiasPorSalon = new Map<string, number>();
    let asignacionesVerificadas = 0;

    // Verificación completa SIN CORTAR por límite de detalles
    for (const combo of combinacionesFiltradas) {
      const salonKey = `${normalize(combo.grado)}|${normalize(combo.salon)}`;
      let estudiantesDelSalon = estudiantesPorSalon.get(salonKey) || [];

      if (codigoEstudiante) {
        estudiantesDelSalon = estudiantesDelSalon.filter((e) => e.codigo_estudiantil === codigoEstudiante);
      }

      if (estudiantesDelSalon.length === 0) continue;

      asignacionesVerificadas++;
      salonesVerificados.add(`${combo.grado}-${combo.salon}`);
      profesoresVerificados.add(combo.nombreCompleto);
      materiasPorSalon.set(combo.materia, (materiasPorSalon.get(combo.materia) || 0) + 1);

      // Si el profe ya está pendiente, no hace falta seguir revisando más combos de él
      // (Esto acelera y evita explotar detalles)
      if (profesoresPendientes.has(combo.nombreCompleto)) continue;

      let profPendiente = false;

      for (const per of periodosAVerificar) {
        const actKey = `${combo.codigoProfesor}|${normalize(combo.materia)}|${normalize(combo.grado)}|${normalize(combo.salon)}|${per}`;
        const actsAll = actividadesIndex.get(actKey) || [];

        // Actividades con peso
        const actividadesConPeso = actsAll.filter((a) => a.porcentaje != null && a.porcentaje > 0);

        // 1) Sin actividades con peso
        if (actividadesConPeso.length === 0) {
          profPendiente = true;
          if (detalles.length < DETALLE_LIMIT) {
            detalles.push({
              tipo: "sin_actividades",
              descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: Sin actividades`,
              materia: combo.materia,
              profesor: combo.nombreCompleto,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per,
            });
          }
          break; // con 1 periodo malo ya cuenta para anual/periodo
        }

        // 2) Porcentajes suman 100 (tolerancia)
        const suma = actividadesConPeso.reduce((s, a) => s + (a.porcentaje || 0), 0);
        const completoPorcentaje = Math.abs(suma - 100) <= PERCENT_TOL;

        if (!completoPorcentaje) {
          profPendiente = true;
          if (detalles.length < DETALLE_LIMIT) {
            detalles.push({
              tipo: "porcentaje_incompleto",
              descripcion: `${combo.materia} (${combo.grado}-${combo.salon}) P${per}: ${Math.round(suma)}%`,
              materia: combo.materia,
              profesor: combo.nombreCompleto,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per,
              porcentajeFaltante: Math.round(100 - suma),
            });
          }
          break;
        }

        // 3) Notas: debe existir y no ser null
        for (const est of estudiantesDelSalon) {
          for (const act of actividadesConPeso) {
            const nKey = `${est.codigo_estudiantil}|${normalize(combo.materia)}|${normalize(combo.grado)}|${normalize(combo.salon)}|${per}|${normalize(act.nombre_actividad)}`;
            const n = notasIndex.get(nKey);

            if (!n || n.nota == null) {
              profPendiente = true;
              if (detalles.length < DETALLE_LIMIT) {
                detalles.push({
                  tipo: "nota_faltante",
                  descripcion: "Nota faltante",
                  materia: combo.materia,
                  profesor: combo.nombreCompleto,
                  grado: combo.grado,
                  salon: combo.salon,
                  estudiante: `${est.apellidos_estudiante} ${est.nombre_estudiante}`,
                  periodo: per,
                  actividad: act.nombre_actividad,
                });
              }
              break;
            }
          }
          if (profPendiente) break;
        }

        if (profPendiente) break;
      }

      if (profPendiente) {
        profesoresPendientes.add(combo.nombreCompleto);
        gradosAfectados.add(combo.grado);
        salonesAfectados.add(combo.salon);
        materiasIncompletas.add(combo.materia);
      }
    }

    // Estudiantes únicos (resumen)
    const estudiantesUnicos = new Set<string>();
    if (grado && salon) {
      estudiantes
        .filter(
          (e) =>
            normalize(e.grado_estudiante) === normalize(grado) && normalize(e.salon_estudiante) === normalize(salon),
        )
        .forEach((e) => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (grado) {
      estudiantes
        .filter((e) => normalize(e.grado_estudiante) === normalize(grado))
        .forEach((e) => estudiantesUnicos.add(e.codigo_estudiantil));
    } else if (codigoEstudiante) {
      estudiantesUnicos.add(codigoEstudiante);
    } else {
      estudiantes.forEach((e) => estudiantesUnicos.add(e.codigo_estudiantil));
    }

    const resumenCompleto: ResumenCompleto = {
      totalEstudiantes: estudiantesUnicos.size,
      totalAsignacionesVerificadas: asignacionesVerificadas,
      totalSalones: salonesVerificados.size,
      totalProfesores: profesoresVerificados.size,
      materiasPorSalon,
    };

    const profesoresPendientesOrdenados = Array.from(profesoresPendientes).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );

    const estaCompleto =
      profesoresPendientes.size === 0 && asignacionesVerificadas > 0 && combinacionesFiltradas.length > 0;

    console.log("=== RESULTADO ===");
    console.log("Asignaciones verificadas:", asignacionesVerificadas);
    console.log("totalProfesoresPendientes:", profesoresPendientes.size);
    console.log("¿Completo?:", estaCompleto);

    if (combinacionesFiltradas.length === 0) {
      if (detalles.length < DETALLE_LIMIT) {
        detalles.push({
          tipo: "sin_actividades",
          descripcion: "No hay asignaciones configuradas para este nivel",
          materia: "Sin asignaciones",
        });
      }
    } else if (asignacionesVerificadas === 0) {
      if (detalles.length < DETALLE_LIMIT) {
        detalles.push({
          tipo: "sin_actividades",
          descripcion: "No hay estudiantes registrados en las asignaciones verificadas",
          materia: "Sin estudiantes",
        });
      }
    }

    return {
      completo: estaCompleto,
      detalles: detalles.slice(0, DETALLE_LIMIT),
      resumen: {
        materiasIncompletas: materiasIncompletas.size,
        profesoresPendientes: profesoresPendientesOrdenados,
        gradosAfectados: Array.from(gradosAfectados),
        salonesAfectados: Array.from(salonesAfectados),
      },
      resumenCompleto,
    };
  };

  return {
    loading,
    verificarCompletitud,
    asignaciones: combinacionesExpandidas,
    estudiantes,
  };
};
