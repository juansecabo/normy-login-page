import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NotaCompleta {
  codigo_estudiantil: string;
  materia: string;
  grado: string;
  salon: string;
  periodo: number;
  nombre_actividad: string;
  porcentaje: number | null;
  nota: number;
}

export interface EstudianteInfo {
  codigo_estudiantil: string;
  nombre_estudiante: string;
  apellidos_estudiante: string;
  grado_estudiante: string;
  salon_estudiante: string;
}

export interface PromedioEstudiante {
  codigo_estudiantil: string;
  nombre_completo: string;
  grado: string;
  salon: string;
  promedio: number;
  sumaPorcentajes: number; // Para determinar si hay suficientes datos
  cantidadActividades: number;
  promediosPorPeriodo: { [periodo: number]: number };
  promediosPorMateria: { [materia: string]: number };
}

export interface PromedioSalon {
  grado: string;
  salon: string;
  promedio: number;
  cantidadEstudiantes: number;
}

export interface PromedioGrado {
  grado: string;
  promedio: number;
  cantidadEstudiantes: number;
}

export interface PromedioMateria {
  materia: string;
  promedio: number;
  cantidadNotas: number;
}

export interface DistribucionDesempeno {
  bajo: number; // 0-2.9
  basico: number; // 3.0-3.9
  alto: number; // 4.0-4.5
  superior: number; // 4.6-5.0
}

// Ordenamiento de grados para visualización consistente
export const ordenGrados = [
  "Prejardín", "Jardín", "Transición",
  "Primero", "Segundo", "Tercero", "Cuarto", "Quinto",
  "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Undécimo"
];

// Umbral mínimo de porcentaje para mostrar "Estudiantes en Riesgo"
const UMBRAL_PORCENTAJE_MINIMO = 40;
const UMBRAL_ACTIVIDADES_MINIMO = 3;

// Tipo para asignaciones expandidas
interface AsignacionExpandida {
  materia: string;
  grado: string;
  salon: string;
}

export const useEstadisticas = () => {
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<NotaCompleta[]>([]);
  const [estudiantes, setEstudiantes] = useState<EstudianteInfo[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<{ grado: string; salon: string }[]>([]);
  const [asignacionesExpandidas, setAsignacionesExpandidas] = useState<AsignacionExpandida[]>([]);

  // Función para normalizar texto (quitar tildes, espacios, minúsculas)
  const normalize = (str: string | null | undefined): string => {
    return String(str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };

  // Función para obtener materias filtradas por grado y salón (desde asignaciones)
  const getMateriasFiltradas = (grado?: string, salon?: string): string[] => {
    let asignacionesFiltradas = asignacionesExpandidas;
    
    if (grado && grado !== "all") {
      const gradoNorm = normalize(grado);
      asignacionesFiltradas = asignacionesFiltradas.filter(a => normalize(a.grado) === gradoNorm);
    }
    if (salon && salon !== "all") {
      const salonNorm = normalize(salon);
      asignacionesFiltradas = asignacionesFiltradas.filter(a => normalize(a.salon) === salonNorm);
    }
    
    const materiasUnicas = [...new Set(asignacionesFiltradas.map(a => a.materia))].sort();
    return materiasUnicas;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener todas las notas (excluyendo finales calculados)
        const { data: notasData, error: notasError } = await supabase
          .from("Notas")
          .select("*")
          .not("nombre_actividad", "in", '("Final Periodo","Final Definitiva")');

        if (notasError) throw notasError;
        setNotas(notasData || []);

        // Obtener todos los estudiantes
        const { data: estudiantesData, error: estudiantesError } = await supabase
          .from("Estudiantes")
          .select("*")
          .order("apellidos_estudiante", { ascending: true });

        if (estudiantesError) throw estudiantesError;
        setEstudiantes(estudiantesData || []);

        // Obtener asignaciones de profesores para extraer materias por grado/salón
        const { data: asignacionesData, error: asignacionesError } = await supabase
          .from("Asignación Profesores")
          .select('"Materia(s)", "Grado(s)", "Salon(es)"');

        if (asignacionesError) {
          console.error("Error fetching asignaciones:", asignacionesError);
        }

        // Expandir asignaciones
        const expandidas: AsignacionExpandida[] = [];
        (asignacionesData || []).forEach((asig: any) => {
          const materiasArr = Array.isArray(asig["Materia(s)"]) ? asig["Materia(s)"] : [];
          const gradosArr = Array.isArray(asig["Grado(s)"]) ? asig["Grado(s)"] : [];
          const salonesArr = Array.isArray(asig["Salon(es)"]) ? asig["Salon(es)"] : [];

          if (materiasArr.length === 0 || gradosArr.length === 0 || salonesArr.length === 0) return;

          // Expandir: si misma longitud usar ZIP, si no, producto cartesiano
          if (materiasArr.length === gradosArr.length && gradosArr.length === salonesArr.length) {
            // ZIP
            for (let i = 0; i < materiasArr.length; i++) {
              expandidas.push({
                materia: materiasArr[i],
                grado: gradosArr[i],
                salon: salonesArr[i]
              });
            }
          } else {
            // Producto cartesiano
            for (const mat of materiasArr) {
              for (const grad of gradosArr) {
                for (const sal of salonesArr) {
                  expandidas.push({
                    materia: mat,
                    grado: grad,
                    salon: sal
                  });
                }
              }
            }
          }
        });
        setAsignacionesExpandidas(expandidas);

        // Extraer materias únicas de asignaciones
        const materiasUnicas = [...new Set(expandidas.map(a => a.materia))].sort();
        setMaterias(materiasUnicas);

        // Extraer grados únicos y ordenarlos
        const gradosUnicos = [...new Set((estudiantesData || []).map(e => e.grado_estudiante))];
        const gradosOrdenados = gradosUnicos.sort((a, b) => 
          ordenGrados.indexOf(a) - ordenGrados.indexOf(b)
        );
        setGrados(gradosOrdenados);

        // Extraer combinaciones de grado-salón únicas
        const salonesUnicos: { grado: string; salon: string }[] = [];
        (estudiantesData || []).forEach(e => {
          if (!salonesUnicos.find(s => s.grado === e.grado_estudiante && s.salon === e.salon_estudiante)) {
            salonesUnicos.push({ grado: e.grado_estudiante, salon: e.salon_estudiante });
          }
        });
        setSalones(salonesUnicos);

      } catch (error) {
        console.error("Error fetching estadísticas data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Calcula el PROMEDIO RELATIVO PONDERADO
   * Solo considera actividades con porcentaje > 0
   * Fórmula: Σ(nota × porcentaje) / Σ(porcentajes)
   */
  const calcularPromedioRelativo = (
    notasFiltradas: NotaCompleta[]
  ): { promedio: number | null; sumaPorcentajes: number; cantidadActividades: number } => {
    const actividadesConPeso = notasFiltradas.filter(n => n.porcentaje && n.porcentaje > 0);
    
    if (actividadesConPeso.length === 0) {
      return { promedio: null, sumaPorcentajes: 0, cantidadActividades: 0 };
    }

    const sumaProductos = actividadesConPeso.reduce((sum, act) => 
      sum + (act.nota * (act.porcentaje || 0)), 0
    );

    const sumaPesos = actividadesConPeso.reduce((sum, act) => 
      sum + (act.porcentaje || 0), 0
    );

    const promedio = sumaPesos > 0 
      ? Math.round((sumaProductos / sumaPesos) * 100) / 100 
      : null;

    return { 
      promedio, 
      sumaPorcentajes: sumaPesos, 
      cantidadActividades: actividadesConPeso.length 
    };
  };

  // Calcular promedio de un estudiante por período usando promedio relativo
  const calcularPromedioPeriodo = (
    codigoEstudiantil: string,
    periodo: number,
    materia?: string,
    grado?: string,
    salon?: string
  ): { promedio: number | null; sumaPorcentajes: number; cantidadActividades: number } => {
    // Considerar "all" como sin filtro
    const gradoFiltro = grado && grado !== "all" ? grado : undefined;
    const salonFiltro = salon && salon !== "all" ? salon : undefined;
    
    let notasFiltradas = notas.filter(n => 
      n.codigo_estudiantil === codigoEstudiantil &&
      n.periodo === periodo
    );

    if (materia) notasFiltradas = notasFiltradas.filter(n => n.materia === materia);
    if (gradoFiltro) notasFiltradas = notasFiltradas.filter(n => n.grado === gradoFiltro);
    if (salonFiltro) notasFiltradas = notasFiltradas.filter(n => n.salon === salonFiltro);

    // Agrupar por materia y calcular promedio relativo de cada una
    const materiaGroups: { [key: string]: NotaCompleta[] } = {};
    notasFiltradas.forEach(n => {
      const key = n.materia;
      if (!materiaGroups[key]) materiaGroups[key] = [];
      materiaGroups[key].push(n);
    });

    const promediosMaterias: number[] = [];
    let sumaPorcentajesTotal = 0;
    let cantidadActividadesTotal = 0;

    Object.values(materiaGroups).forEach(notasMateria => {
      const resultado = calcularPromedioRelativo(notasMateria);
      if (resultado.promedio !== null) {
        promediosMaterias.push(resultado.promedio);
        sumaPorcentajesTotal += resultado.sumaPorcentajes;
        cantidadActividadesTotal += resultado.cantidadActividades;
      }
    });

    if (promediosMaterias.length === 0) {
      return { promedio: null, sumaPorcentajes: 0, cantidadActividades: 0 };
    }

    const promedio = Math.round((promediosMaterias.reduce((a, b) => a + b, 0) / promediosMaterias.length) * 100) / 100;
    return { promedio, sumaPorcentajes: sumaPorcentajesTotal, cantidadActividades: cantidadActividadesTotal };
  };

  // Calcular promedio general de un estudiante (acumulado anual)
  const calcularPromedioEstudiante = (codigoEstudiantil: string): { 
    promedio: number | null; 
    sumaPorcentajes: number; 
    cantidadActividades: number 
  } => {
    const promedios: number[] = [];
    let sumaPorcentajesTotal = 0;
    let cantidadActividadesTotal = 0;

    for (let periodo = 1; periodo <= 4; periodo++) {
      const resultado = calcularPromedioPeriodo(codigoEstudiantil, periodo);
      if (resultado.promedio !== null) {
        promedios.push(resultado.promedio);
        sumaPorcentajesTotal += resultado.sumaPorcentajes;
        cantidadActividadesTotal += resultado.cantidadActividades;
      }
    }

    if (promedios.length === 0) {
      return { promedio: null, sumaPorcentajes: 0, cantidadActividades: 0 };
    }

    return {
      promedio: Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100) / 100,
      sumaPorcentajes: sumaPorcentajesTotal,
      cantidadActividades: cantidadActividadesTotal
    };
  };

  // Obtener promedios de todos los estudiantes (solo incluye los que tienen notas)
  const getPromediosEstudiantes = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioEstudiante[] => {
    // Considerar "all" como sin filtro
    const gradoFiltro = grado && grado !== "all" ? grado : undefined;
    const salonFiltro = salon && salon !== "all" ? salon : undefined;
    
    let estudiantesFiltrados = estudiantes;
    if (gradoFiltro) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.grado_estudiante === gradoFiltro);
    if (salonFiltro) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.salon_estudiante === salonFiltro);

    return estudiantesFiltrados.map(est => {
      const promediosPorPeriodo: { [periodo: number]: number } = {};
      for (let p = 1; p <= 4; p++) {
        const resultado = calcularPromedioPeriodo(est.codigo_estudiantil, p);
        if (resultado.promedio !== null) promediosPorPeriodo[p] = resultado.promedio;
      }

      // Promedios por materia con promedio relativo
      const promediosPorMateria: { [materia: string]: number } = {};
      const notasEstudiante = notas.filter(n => 
        n.codigo_estudiantil === est.codigo_estudiantil &&
        n.porcentaje !== null && n.porcentaje > 0
      );
      const materiasEstudiante = [...new Set(notasEstudiante.map(n => n.materia))];
      
      materiasEstudiante.forEach(mat => {
        const notasMateria = notasEstudiante.filter(n => n.materia === mat);
        const resultado = calcularPromedioRelativo(notasMateria);
        if (resultado.promedio !== null) {
          promediosPorMateria[mat] = resultado.promedio;
        }
      });

      let resultado: { promedio: number | null; sumaPorcentajes: number; cantidadActividades: number };
      if (periodo === "anual" || !periodo) {
        resultado = calcularPromedioEstudiante(est.codigo_estudiantil);
      } else {
        resultado = calcularPromedioPeriodo(est.codigo_estudiantil, periodo);
      }

      return {
        codigo_estudiantil: est.codigo_estudiantil,
        nombre_completo: `${est.apellidos_estudiante} ${est.nombre_estudiante}`,
        grado: est.grado_estudiante,
        salon: est.salon_estudiante,
        promedio: resultado.promedio || 0,
        sumaPorcentajes: resultado.sumaPorcentajes,
        cantidadActividades: resultado.cantidadActividades,
        promediosPorPeriodo,
        promediosPorMateria
      };
    }).filter(e => e.promedio > 0); // Solo incluir estudiantes con notas
  };

  // Promedios por salón (solo incluye salones con estudiantes que tienen notas)
  const getPromediosSalones = (
    periodo?: number | "anual",
    grado?: string
  ): PromedioSalon[] => {
    // Considerar "all" como sin filtro
    const gradoFiltro = grado && grado !== "all" ? grado : undefined;
    
    const salonesUnicos = gradoFiltro 
      ? salones.filter(s => s.grado === gradoFiltro)
      : salones;

    return salonesUnicos.map(s => {
      const promediosEst = getPromediosEstudiantes(periodo, s.grado, s.salon);
      const promedio = promediosEst.length > 0
        ? Math.round((promediosEst.reduce((a, e) => a + e.promedio, 0) / promediosEst.length) * 100) / 100
        : 0;

      return {
        grado: s.grado,
        salon: s.salon,
        promedio,
        cantidadEstudiantes: promediosEst.length
      };
    }).filter(s => s.promedio > 0); // Solo incluir salones con datos
  };

  // Promedios por grado (solo incluye grados con estudiantes que tienen notas)
  const getPromediosGrados = (periodo?: number | "anual"): PromedioGrado[] => {
    return grados.map(grado => {
      const promediosEst = getPromediosEstudiantes(periodo, grado);
      const promedio = promediosEst.length > 0
        ? Math.round((promediosEst.reduce((a, e) => a + e.promedio, 0) / promediosEst.length) * 100) / 100
        : 0;

      return {
        grado,
        promedio,
        cantidadEstudiantes: promediosEst.length
      };
    }).filter(g => g.promedio > 0); // Solo incluir grados con datos
  };

  // Promedios por materia usando promedio relativo
  const getPromediosMaterias = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioMateria[] => {
    // Considerar "all" como sin filtro
    const gradoFiltro = grado && grado !== "all" ? grado : undefined;
    const salonFiltro = salon && salon !== "all" ? salon : undefined;
    
    const materiasFiltradas = [...new Set(
      notas
        .filter(n => (!gradoFiltro || n.grado === gradoFiltro) && (!salonFiltro || n.salon === salonFiltro))
        .map(n => n.materia)
    )];

    return materiasFiltradas.map(materia => {
      let notasFiltradas = notas.filter(n => 
        n.materia === materia &&
        n.porcentaje !== null && n.porcentaje > 0
      );
      if (gradoFiltro) notasFiltradas = notasFiltradas.filter(n => n.grado === gradoFiltro);
      if (salonFiltro) notasFiltradas = notasFiltradas.filter(n => n.salon === salonFiltro);
      if (periodo && periodo !== "anual") {
        notasFiltradas = notasFiltradas.filter(n => n.periodo === periodo);
      }

      if (notasFiltradas.length === 0) return { materia, promedio: 0, cantidadNotas: 0 };

      // Calcular promedio relativo
      const resultado = calcularPromedioRelativo(notasFiltradas);

      return {
        materia,
        promedio: resultado.promedio || 0,
        cantidadNotas: notasFiltradas.length
      };
    }).filter(m => m.promedio > 0).sort((a, b) => b.promedio - a.promedio);
  };

  // Distribución de desempeño
  const getDistribucionDesempeno = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): DistribucionDesempeno => {
    const promedios = getPromediosEstudiantes(periodo, grado, salon);
    
    return {
      bajo: promedios.filter(e => e.promedio < 3.0).length,
      basico: promedios.filter(e => e.promedio >= 3.0 && e.promedio < 4.0).length,
      alto: promedios.filter(e => e.promedio >= 4.0 && e.promedio <= 4.5).length,
      superior: promedios.filter(e => e.promedio > 4.5).length
    };
  };

  // Promedio institucional
  const getPromedioInstitucional = (periodo?: number | "anual"): number => {
    const promedios = getPromediosEstudiantes(periodo);
    if (promedios.length === 0) return 0;
    return Math.round((promedios.reduce((a, e) => a + e.promedio, 0) / promedios.length) * 100) / 100;
  };

  // Top estudiantes
  const getTopEstudiantes = (
    cantidad: number = 10,
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioEstudiante[] => {
    return getPromediosEstudiantes(periodo, grado, salon)
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, cantidad);
  };

  // Estudiantes en riesgo (solo si hay suficientes datos)
  const getEstudiantesEnRiesgo = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioEstudiante[] => {
    return getPromediosEstudiantes(periodo, grado, salon)
      .filter(e => 
        e.promedio < 3.0 && 
        e.sumaPorcentajes >= UMBRAL_PORCENTAJE_MINIMO &&
        e.cantidadActividades >= UMBRAL_ACTIVIDADES_MINIMO
      );
  };

  // Verificar si hay suficientes datos para mostrar "Estudiantes en Riesgo"
  const tieneDatosSuficientesParaRiesgo = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): boolean => {
    const promedios = getPromediosEstudiantes(periodo, grado, salon);
    // Verificar si al menos un estudiante tiene datos suficientes
    return promedios.some(e => 
      e.sumaPorcentajes >= UMBRAL_PORCENTAJE_MINIMO &&
      e.cantidadActividades >= UMBRAL_ACTIVIDADES_MINIMO
    );
  };

  // Evolución por período
  const getEvolucionPeriodos = (
    tipo: "institucion" | "grado" | "salon",
    grado?: string,
    salon?: string
  ): { periodo: string; promedio: number }[] => {
    const periodos = [
      { numero: 1, nombre: "Período 1" },
      { numero: 2, nombre: "Período 2" },
      { numero: 3, nombre: "Período 3" },
      { numero: 4, nombre: "Período 4" }
    ];

    return periodos.map(p => {
      let promedio: number;
      if (tipo === "institucion") {
        promedio = getPromedioInstitucional(p.numero);
      } else if (tipo === "grado" && grado) {
        const promedios = getPromediosEstudiantes(p.numero, grado);
        promedio = promedios.length > 0
          ? Math.round((promedios.reduce((a, e) => a + e.promedio, 0) / promedios.length) * 100) / 100
          : 0;
      } else if (tipo === "salon" && grado && salon) {
        const promedios = getPromediosEstudiantes(p.numero, grado, salon);
        promedio = promedios.length > 0
          ? Math.round((promedios.reduce((a, e) => a + e.promedio, 0) / promedios.length) * 100) / 100
          : 0;
      } else {
        promedio = 0;
      }

      return {
        periodo: p.nombre,
        promedio
      };
    });
  };

  // Verificar completitud de un período/nivel
  interface DetalleIncompleto {
    tipo: "nota_faltante" | "porcentaje_incompleto";
    descripcion: string;
    materia?: string;
    estudiante?: string;
    actividad?: string;
  }

  const verificarCompletitud = (
    periodo: number | "anual",
    grado?: string,
    salon?: string,
    codigoEstudiante?: string,
    materia?: string
  ): { completo: boolean; detalles: DetalleIncompleto[] } => {
    const detalles: DetalleIncompleto[] = [];
    
    // Para cada estudiante, verificar que tiene 100% de porcentajes en todas sus materias
    let estudiantesFiltrados = estudiantes;
    if (grado) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.grado_estudiante === grado);
    if (salon) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.salon_estudiante === salon);
    if (codigoEstudiante) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.codigo_estudiantil === codigoEstudiante);

    const periodos = periodo === "anual" ? [1, 2, 3, 4] : [periodo];

    for (const est of estudiantesFiltrados) {
      const nombreCompleto = `${est.apellidos_estudiante} ${est.nombre_estudiante}`;
      
      // Obtener las materias del estudiante
      const notasEstudiante = notas.filter(n => n.codigo_estudiantil === est.codigo_estudiantil);
      const materiasEstudiante = materia 
        ? [materia] 
        : [...new Set(notasEstudiante.map(n => n.materia))];

      for (const mat of materiasEstudiante) {
        for (const per of periodos) {
          // Obtener notas de este estudiante en esta materia y período
          const notasPeriodo = notasEstudiante.filter(n => 
            n.materia === mat && 
            n.periodo === per &&
            n.porcentaje !== null && n.porcentaje > 0
          );

          // Sumar porcentajes
          const sumaPorcentajes = notasPeriodo.reduce((sum, n) => sum + (n.porcentaje || 0), 0);

          if (sumaPorcentajes > 0 && sumaPorcentajes < 100) {
            detalles.push({
              tipo: "porcentaje_incompleto",
              descripcion: `${mat} (P${per}) - ${nombreCompleto}: ${Math.round(sumaPorcentajes)}% de actividades registradas, faltan ${100 - Math.round(sumaPorcentajes)}%`,
              materia: mat,
              estudiante: nombreCompleto
            });
          }
        }
      }

      // Limitar detalles para rendimiento
      if (detalles.length > 50) break;
    }

    return {
      completo: detalles.length === 0,
      detalles: detalles.slice(0, 50)
    };
  };

  return {
    loading,
    notas,
    estudiantes,
    materias,
    grados,
    salones,
    getMateriasFiltradas,
    getPromediosEstudiantes,
    getPromediosSalones,
    getPromediosGrados,
    getPromediosMaterias,
    getDistribucionDesempeno,
    getPromedioInstitucional,
    getTopEstudiantes,
    getEstudiantesEnRiesgo,
    tieneDatosSuficientesParaRiesgo,
    getEvolucionPeriodos,
    calcularPromedioEstudiante,
    calcularPromedioPeriodo,
    calcularPromedioRelativo,
    verificarCompletitud
  };
};
