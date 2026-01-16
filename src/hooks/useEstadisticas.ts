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

export const useEstadisticas = () => {
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<NotaCompleta[]>([]);
  const [estudiantes, setEstudiantes] = useState<EstudianteInfo[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<{ grado: string; salon: string }[]>([]);

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

        // Extraer materias únicas
        const materiasUnicas = [...new Set((notasData || []).map(n => n.materia))].sort();
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

  // Calcular promedio de notas de un estudiante en un período específico
  const calcularPromedioPeriodo = (
    codigoEstudiantil: string,
    periodo: number,
    materia?: string,
    grado?: string,
    salon?: string
  ): number | null => {
    let notasFiltradas = notas.filter(n => 
      n.codigo_estudiantil === codigoEstudiantil &&
      n.periodo === periodo &&
      n.porcentaje !== null &&
      n.porcentaje > 0
    );

    if (materia) notasFiltradas = notasFiltradas.filter(n => n.materia === materia);
    if (grado) notasFiltradas = notasFiltradas.filter(n => n.grado === grado);
    if (salon) notasFiltradas = notasFiltradas.filter(n => n.salon === salon);

    if (notasFiltradas.length === 0) return null;

    // Agrupar por materia y calcular el final de cada una
    const materiaGroups: { [key: string]: NotaCompleta[] } = {};
    notasFiltradas.forEach(n => {
      const key = n.materia;
      if (!materiaGroups[key]) materiaGroups[key] = [];
      materiaGroups[key].push(n);
    });

    const finalesPorMateria: number[] = [];
    Object.values(materiaGroups).forEach(notasMateria => {
      let suma = 0;
      let tieneNota = false;
      notasMateria.forEach(n => {
        if (n.porcentaje) {
          suma += n.nota * (n.porcentaje / 100);
          tieneNota = true;
        }
      });
      if (tieneNota) finalesPorMateria.push(suma);
    });

    if (finalesPorMateria.length === 0) return null;

    const promedio = finalesPorMateria.reduce((a, b) => a + b, 0) / finalesPorMateria.length;
    return Math.round(promedio * 100) / 100;
  };

  // Calcular promedio general de un estudiante (acumulado anual)
  const calcularPromedioEstudiante = (codigoEstudiantil: string): number | null => {
    const promedios: number[] = [];
    for (let periodo = 1; periodo <= 4; periodo++) {
      const prom = calcularPromedioPeriodo(codigoEstudiantil, periodo);
      if (prom !== null) promedios.push(prom);
    }
    if (promedios.length === 0) return null;
    return Math.round((promedios.reduce((a, b) => a + b, 0) / promedios.length) * 100) / 100;
  };

  // Obtener promedios de todos los estudiantes
  const getPromediosEstudiantes = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioEstudiante[] => {
    let estudiantesFiltrados = estudiantes;
    if (grado) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.grado_estudiante === grado);
    if (salon) estudiantesFiltrados = estudiantesFiltrados.filter(e => e.salon_estudiante === salon);

    return estudiantesFiltrados.map(est => {
      const promediosPorPeriodo: { [periodo: number]: number } = {};
      for (let p = 1; p <= 4; p++) {
        const prom = calcularPromedioPeriodo(est.codigo_estudiantil, p);
        if (prom !== null) promediosPorPeriodo[p] = prom;
      }

      // Promedios por materia
      const promediosPorMateria: { [materia: string]: number } = {};
      const notasEstudiante = notas.filter(n => 
        n.codigo_estudiantil === est.codigo_estudiantil &&
        n.porcentaje !== null && n.porcentaje > 0
      );
      const materiasEstudiante = [...new Set(notasEstudiante.map(n => n.materia))];
      
      materiasEstudiante.forEach(mat => {
        const promediosMat: number[] = [];
        for (let p = 1; p <= 4; p++) {
          const notasPeriodo = notasEstudiante.filter(n => n.materia === mat && n.periodo === p);
          if (notasPeriodo.length > 0) {
            const suma = notasPeriodo.reduce((acc, n) => acc + n.nota * ((n.porcentaje || 0) / 100), 0);
            promediosMat.push(suma);
          }
        }
        if (promediosMat.length > 0) {
          promediosPorMateria[mat] = Math.round((promediosMat.reduce((a, b) => a + b, 0) / promediosMat.length) * 100) / 100;
        }
      });

      let promedio: number;
      if (periodo === "anual" || !periodo) {
        promedio = calcularPromedioEstudiante(est.codigo_estudiantil) || 0;
      } else {
        promedio = calcularPromedioPeriodo(est.codigo_estudiantil, periodo) || 0;
      }

      return {
        codigo_estudiantil: est.codigo_estudiantil,
        nombre_completo: `${est.apellidos_estudiante} ${est.nombre_estudiante}`,
        grado: est.grado_estudiante,
        salon: est.salon_estudiante,
        promedio,
        promediosPorPeriodo,
        promediosPorMateria
      };
    }).filter(e => e.promedio > 0);
  };

  // Promedios por salón
  const getPromediosSalones = (
    periodo?: number | "anual",
    grado?: string
  ): PromedioSalon[] => {
    const salonesUnicos = grado 
      ? salones.filter(s => s.grado === grado)
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
    }).filter(s => s.promedio > 0);
  };

  // Promedios por grado
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
    }).filter(g => g.promedio > 0);
  };

  // Promedios por materia
  const getPromediosMaterias = (
    periodo?: number | "anual",
    grado?: string,
    salon?: string
  ): PromedioMateria[] => {
    const materiasFiltradas = [...new Set(
      notas
        .filter(n => (!grado || n.grado === grado) && (!salon || n.salon === salon))
        .map(n => n.materia)
    )];

    return materiasFiltradas.map(materia => {
      let notasFiltradas = notas.filter(n => 
        n.materia === materia &&
        n.porcentaje !== null && n.porcentaje > 0
      );
      if (grado) notasFiltradas = notasFiltradas.filter(n => n.grado === grado);
      if (salon) notasFiltradas = notasFiltradas.filter(n => n.salon === salon);
      if (periodo && periodo !== "anual") {
        notasFiltradas = notasFiltradas.filter(n => n.periodo === periodo);
      }

      if (notasFiltradas.length === 0) return { materia, promedio: 0, cantidadNotas: 0 };

      // Calcular promedio ponderado
      const suma = notasFiltradas.reduce((acc, n) => acc + n.nota, 0);
      const promedio = Math.round((suma / notasFiltradas.length) * 100) / 100;

      return {
        materia,
        promedio,
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

  // Evolución por período (para gráficos de líneas)
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

  return {
    loading,
    notas,
    estudiantes,
    materias,
    grados,
    salones,
    getPromediosEstudiantes,
    getPromediosSalones,
    getPromediosGrados,
    getPromediosMaterias,
    getDistribucionDesempeno,
    getPromedioInstitucional,
    getTopEstudiantes,
    getEvolucionPeriodos,
    calcularPromedioEstudiante,
    calcularPromedioPeriodo
  };
};
