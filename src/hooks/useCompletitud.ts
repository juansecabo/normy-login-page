import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DetalleIncompleto {
  tipo: "nota_faltante" | "porcentaje_incompleto";
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

export interface ResultadoCompletitud {
  completo: boolean;
  detalles: DetalleIncompleto[];
  resumen: ResumenIncompletitud;
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
          .select("materia, grado, salon, periodo, nombre, porcentaje");
        
        if (actividadesData) {
          setActividades(actividadesData.map((a: any) => ({
            materia: a.materia,
            grado: a.grado,
            salon: a.salon,
            periodo: a.periodo,
            nombre_actividad: a.nombre,
            porcentaje: a.porcentaje
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

    const periodos = periodo === "anual" ? [1, 2, 3, 4] : [periodo];

    // Filtrar estudiantes según nivel
    let estudiantesFiltrados = estudiantes;
    if (grado) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.grado_estudiante === grado);
    if (salon) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.salon_estudiante === salon);
    if (codigoEstudiante) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.codigo_estudiantil === codigoEstudiante);

    // Obtener combinaciones grado-salón a verificar
    const combinacionesGradoSalon = new Map<string, { grado: string; salon: string; estudiantes: Estudiante[] }>();
    
    estudiantesFiltrados.forEach(est => {
      const key = `${est.grado_estudiante}-${est.salon_estudiante}`;
      if (!combinacionesGradoSalon.has(key)) {
        combinacionesGradoSalon.set(key, {
          grado: est.grado_estudiante,
          salon: est.salon_estudiante,
          estudiantes: []
        });
      }
      combinacionesGradoSalon.get(key)!.estudiantes.push(est);
    });

    // Para cada combinación grado-salón, verificar materias
    for (const [, combo] of combinacionesGradoSalon) {
      // Obtener materias que se dan en este grado-salón
      let materiasDelGradoSalon: string[] = [];
      
      for (const asig of asignaciones) {
        const tieneGrado = asig.grados.includes(combo.grado);
        const tieneSalon = asig.salones.includes(combo.salon);
        
        if (tieneGrado && tieneSalon) {
          materiasDelGradoSalon = [...materiasDelGradoSalon, ...asig.materias];
        }
      }
      materiasDelGradoSalon = [...new Set(materiasDelGradoSalon)];

      // Si se filtró por materia específica
      if (materia) {
        materiasDelGradoSalon = materiasDelGradoSalon.filter(m => m === materia);
      }

      for (const mat of materiasDelGradoSalon) {
        for (const per of periodos) {
          // Obtener actividades de esta materia/grado/salón/período
          const actividadesPeriodo = actividades.filter(a =>
            a.materia === mat &&
            a.grado === combo.grado &&
            a.salon === combo.salon &&
            a.periodo === per &&
            a.porcentaje !== null && a.porcentaje > 0
          );

          // Verificar que los porcentajes suman 100%
          const sumaPorcentajes = actividadesPeriodo.reduce((sum, a) => sum + (a.porcentaje || 0), 0);
          
          if (actividadesPeriodo.length > 0 && sumaPorcentajes < 100) {
            // Encontrar el profesor de esta materia
            const profesor = asignaciones.find(a => 
              a.materias.includes(mat) && 
              a.grados.includes(combo.grado) && 
              a.salones.includes(combo.salon)
            );
            
            const porcentajeFaltante = 100 - Math.round(sumaPorcentajes);
            
            detalles.push({
              tipo: "porcentaje_incompleto",
              descripcion: `${mat} (${combo.grado} - ${combo.salon}) P${per}: Las actividades solo suman ${Math.round(sumaPorcentajes)}%, faltan ${porcentajeFaltante}%`,
              materia: mat,
              profesor: profesor?.nombre,
              grado: combo.grado,
              salon: combo.salon,
              periodo: per,
              porcentajeFaltante
            });

            if (profesor) profesoresPendientes.add(profesor.nombre);
            gradosAfectados.add(combo.grado);
            salonesAfectados.add(combo.salon);
            materiasIncompletas.add(mat);
          }

          // Verificar notas faltantes para cada estudiante
          for (const est of combo.estudiantes) {
            const nombreCompleto = `${est.apellidos_estudiante} ${est.nombre_estudiante}`;
            
            for (const act of actividadesPeriodo) {
              const tieneNota = notas.some(n =>
                n.codigo_estudiantil === est.codigo_estudiantil &&
                n.materia === mat &&
                n.grado === combo.grado &&
                n.salon === combo.salon &&
                n.periodo === per &&
                n.nombre_actividad === act.nombre_actividad
              );

              if (!tieneNota) {
                const profesor = asignaciones.find(a => 
                  a.materias.includes(mat) && 
                  a.grados.includes(combo.grado) && 
                  a.salones.includes(combo.salon)
                );

                detalles.push({
                  tipo: "nota_faltante",
                  descripcion: `${mat} (${combo.grado} - ${combo.salon}) P${per}: ${nombreCompleto} sin nota en "${act.nombre_actividad}" (${act.porcentaje}%)`,
                  materia: mat,
                  profesor: profesor?.nombre,
                  grado: combo.grado,
                  salon: combo.salon,
                  estudiante: nombreCompleto,
                  periodo: per,
                  actividad: act.nombre_actividad
                });

                if (profesor) profesoresPendientes.add(profesor.nombre);
                gradosAfectados.add(combo.grado);
                salonesAfectados.add(combo.salon);
                materiasIncompletas.add(mat);
              }
            }
          }

          // Limitar para rendimiento
          if (detalles.length >= 100) break;
        }
        if (detalles.length >= 100) break;
      }
      if (detalles.length >= 100) break;
    }

    return {
      completo: detalles.length === 0,
      detalles: detalles.slice(0, 100),
      resumen: {
        materiasIncompletas: materiasIncompletas.size,
        profesoresPendientes: Array.from(profesoresPendientes),
        gradosAfectados: Array.from(gradosAfectados),
        salonesAfectados: Array.from(salonesAfectados)
      }
    };
  };

  return {
    loading,
    verificarCompletitud
  };
};
