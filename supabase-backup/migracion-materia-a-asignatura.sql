-- ============================================================
-- MIGRACIÓN: Renombrar "materia" → "asignatura" en toda la BD
-- Ejecutar en Supabase SQL Editor en ORDEN
-- ============================================================

-- ============================================================
-- PASO 1: Renombrar el tipo ENUM
-- ============================================================
ALTER TYPE public.materias_enum RENAME TO asignaturas_enum;
COMMENT ON TYPE public.asignaturas_enum IS 'Se muestran las asignaturas dadas en la Normal';

-- ============================================================
-- PASO 2: Renombrar columnas en las 4 tablas
-- ============================================================

-- 2.1 Tabla "Asignación Profesores": "Materia(s)" → "Asignatura(s)"
ALTER TABLE public."Asignación Profesores"
  RENAME COLUMN "Materia(s)" TO "Asignatura(s)";
COMMENT ON COLUMN public."Asignación Profesores"."Asignatura(s)"
  IS 'Muestra la(s) asignatura(s) que dictan cada profesor';

-- 2.2 Tabla "Calendario Actividades": "Materia" → "Asignatura"
ALTER TABLE public."Calendario Actividades"
  RENAME COLUMN "Materia" TO "Asignatura";

-- 2.3 Tabla "Nombre de Actividades": materia → asignatura
ALTER TABLE public."Nombre de Actividades"
  RENAME COLUMN materia TO asignatura;

-- 2.4 Tabla "Notas": materia → asignatura
ALTER TABLE public."Notas"
  RENAME COLUMN materia TO asignatura;

-- ============================================================
-- PASO 3: Recrear ÍNDICES (los viejos quedan con nombre viejo)
-- ============================================================

-- Eliminar índices viejos
DROP INDEX IF EXISTS public.idx_nombre_actividades_contexto;
DROP INDEX IF EXISTS public.idx_nombre_actividades_orden;
DROP INDEX IF EXISTS public.idx_notas_contexto;
DROP INDEX IF EXISTS public.idx_notas_orden;

-- Crear índices nuevos con nombre actualizado
CREATE INDEX idx_nombre_actividades_contexto ON public."Nombre de Actividades"
  USING btree (codigo_profesor, asignatura, grado, salon, periodo);

CREATE INDEX idx_nombre_actividades_orden ON public."Nombre de Actividades"
  USING btree (codigo_profesor, asignatura, grado, salon, periodo, orden);

CREATE INDEX idx_notas_contexto ON public."Notas"
  USING btree (asignatura, grado, salon, periodo);

CREATE INDEX idx_notas_orden ON public."Notas"
  USING btree (asignatura, grado, salon, periodo, orden);

-- ============================================================
-- PASO 4: Actualizar CONSTRAINTS UNIQUE
-- (PostgreSQL renombra automáticamente la columna dentro del
--  constraint, pero podemos renombrar el constraint si queremos)
-- ============================================================

-- Nota: Al renombrar la columna, los constraints existentes
-- ya usan "asignatura" internamente. Solo renombramos el nombre
-- del constraint para claridad.

ALTER TABLE public."Notas"
  RENAME CONSTRAINT "Notas_codigo_estudiantil_materia_grado_salon_periodo_nombre_key"
  TO "Notas_codigo_estudiantil_asignatura_grado_salon_periodo_nombre_key";

-- ============================================================
-- PASO 5: Reemplazar las 9 FUNCIONES de triggers
-- ============================================================

-- 5.1 asignar_orden_actividad()
CREATE OR REPLACE FUNCTION public.asignar_orden_actividad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  max_orden INTEGER;
BEGIN
  IF NEW.orden IS NULL OR NEW.orden = 0 THEN
    SELECT COALESCE(MAX(orden), 0) + 1
    INTO max_orden
    FROM "Nombre de Actividades"
    WHERE codigo_profesor = NEW.codigo_profesor
      AND asignatura = NEW.asignatura
      AND grado = NEW.grado
      AND salon = NEW.salon
      AND periodo = NEW.periodo;

    NEW.orden := max_orden;
  END IF;

  RETURN NEW;
END;
$$;

-- 5.2 copiar_orden_nueva_nota()
CREATE OR REPLACE FUNCTION public.copiar_orden_nueva_nota() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.nombre_actividad NOT IN ('Final Periodo', 'Final Definitiva') THEN
    SELECT orden, porcentaje INTO NEW.orden, NEW.porcentaje
    FROM "Nombre de Actividades"
    WHERE asignatura = NEW.asignatura
      AND grado = NEW.grado
      AND salon = NEW.salon
      AND periodo = NEW.periodo
      AND nombre_actividad = NEW.nombre_actividad
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

-- 5.3 corregir_porcentaje_finales()
CREATE OR REPLACE FUNCTION public.corregir_porcentaje_finales() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  porcentaje_calculado NUMERIC;
  tiene_notas_con_porcentaje BOOLEAN;
  p1_porcentaje NUMERIC;
  p2_porcentaje NUMERIC;
  p3_porcentaje NUMERIC;
  p4_porcentaje NUMERIC;
BEGIN
  IF NEW.nombre_actividad = 'Final Periodo' THEN
    SELECT EXISTS (
      SELECT 1 FROM "Notas"
      WHERE codigo_estudiantil = NEW.codigo_estudiantil
        AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
        AND periodo = NEW.periodo
        AND nombre_actividad NOT IN ('Final Periodo', 'Final Definitiva')
        AND nota IS NOT NULL
        AND porcentaje IS NOT NULL
    ) INTO tiene_notas_con_porcentaje;

    IF tiene_notas_con_porcentaje THEN
      SELECT SUM(porcentaje)
      INTO porcentaje_calculado
      FROM "Notas"
      WHERE codigo_estudiantil = NEW.codigo_estudiantil
        AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
        AND periodo = NEW.periodo
        AND nombre_actividad NOT IN ('Final Periodo', 'Final Definitiva')
        AND nota IS NOT NULL
        AND porcentaje IS NOT NULL;

      IF NEW.porcentaje IS DISTINCT FROM porcentaje_calculado THEN
        PERFORM set_config('app.bypass_protection', 'true', true);
        UPDATE "Notas"
        SET porcentaje = porcentaje_calculado
        WHERE id = NEW.id;
        PERFORM set_config('app.bypass_protection', NULL, true);
      END IF;
    END IF;

  ELSIF NEW.nombre_actividad = 'Final Definitiva' THEN
    SELECT porcentaje INTO p1_porcentaje
    FROM "Notas"
    WHERE codigo_estudiantil = NEW.codigo_estudiantil
      AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
      AND periodo = 1 AND nombre_actividad = 'Final Periodo';

    SELECT porcentaje INTO p2_porcentaje
    FROM "Notas"
    WHERE codigo_estudiantil = NEW.codigo_estudiantil
      AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
      AND periodo = 2 AND nombre_actividad = 'Final Periodo';

    SELECT porcentaje INTO p3_porcentaje
    FROM "Notas"
    WHERE codigo_estudiantil = NEW.codigo_estudiantil
      AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
      AND periodo = 3 AND nombre_actividad = 'Final Periodo';

    SELECT porcentaje INTO p4_porcentaje
    FROM "Notas"
    WHERE codigo_estudiantil = NEW.codigo_estudiantil
      AND asignatura = NEW.asignatura AND grado = NEW.grado AND salon = NEW.salon
      AND periodo = 4 AND nombre_actividad = 'Final Periodo';

    IF p1_porcentaje IS NULL AND p2_porcentaje IS NULL AND
       p3_porcentaje IS NULL AND p4_porcentaje IS NULL THEN
      porcentaje_calculado := NULL;
    ELSE
      porcentaje_calculado := ROUND(
        CAST((COALESCE(p1_porcentaje, 0) + COALESCE(p2_porcentaje, 0) +
              COALESCE(p3_porcentaje, 0) + COALESCE(p4_porcentaje, 0)) / 4.0 AS NUMERIC), 2);
    END IF;

    IF NEW.porcentaje IS DISTINCT FROM porcentaje_calculado THEN
      PERFORM set_config('app.bypass_protection', 'true', true);
      UPDATE "Notas"
      SET porcentaje = porcentaje_calculado
      WHERE id = NEW.id;
      PERFORM set_config('app.bypass_protection', NULL, true);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5.4 eliminar_notas_huerfanas()
CREATE OR REPLACE FUNCTION public.eliminar_notas_huerfanas() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM "Notas"
  WHERE asignatura = OLD.asignatura
    AND grado = OLD.grado
    AND salon = OLD.salon
    AND periodo = OLD.periodo
    AND nombre_actividad = OLD.nombre_actividad;

  RETURN OLD;
END;
$$;

-- 5.5 recalcular_finales() - FUNCIÓN PRINCIPAL
CREATE OR REPLACE FUNCTION public.recalcular_finales() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_codigo_estudiantil INTEGER;
  v_asignatura TEXT;
  v_grado TEXT;
  v_salon TEXT;
  v_periodo INTEGER;
  tiene_notas BOOLEAN;
  suma_ponderada NUMERIC;
  suma_porcentajes NUMERIC;
  nota_final_periodo NUMERIC;
  porcentaje_periodo NUMERIC;
  nota_p1 NUMERIC; nota_p2 NUMERIC; nota_p3 NUMERIC; nota_p4 NUMERIC;
  porc_p1 NUMERIC; porc_p2 NUMERIC; porc_p3 NUMERIC; porc_p4 NUMERIC;
  nota_final_definitiva NUMERIC;
  porcentaje_definitiva NUMERIC;
  tiene_algun_periodo BOOLEAN;
  periodos_con_nota INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_codigo_estudiantil := OLD.codigo_estudiantil;
    v_asignatura := OLD.asignatura;
    v_grado := OLD.grado;
    v_salon := OLD.salon;
    v_periodo := OLD.periodo;
  ELSE
    v_codigo_estudiantil := NEW.codigo_estudiantil;
    v_asignatura := NEW.asignatura;
    v_grado := NEW.grado;
    v_salon := NEW.salon;
    v_periodo := NEW.periodo;
  END IF;

  -- Verificar si hay notas normales en este periodo
  SELECT EXISTS (
    SELECT 1 FROM "Notas"
    WHERE codigo_estudiantil = v_codigo_estudiantil
      AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
      AND periodo = v_periodo
      AND nombre_actividad NOT IN ('Final Periodo', 'Final Definitiva')
  ) INTO tiene_notas;

  IF tiene_notas THEN
    -- Calcular Final Periodo
    SELECT SUM(nota * porcentaje / 100), SUM(porcentaje)
    INTO suma_ponderada, suma_porcentajes
    FROM "Notas"
    WHERE codigo_estudiantil = v_codigo_estudiantil
      AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
      AND periodo = v_periodo
      AND nombre_actividad NOT IN ('Final Periodo', 'Final Definitiva')
      AND nota IS NOT NULL AND porcentaje IS NOT NULL;

    IF suma_porcentajes > 0 THEN
      nota_final_periodo := ROUND((suma_ponderada / suma_porcentajes) * 100 / 100, 2);
      porcentaje_periodo := suma_porcentajes;
    ELSE
      nota_final_periodo := NULL;
      porcentaje_periodo := NULL;
    END IF;

    -- Upsert Final Periodo
    PERFORM set_config('app.bypass_protection', 'true', true);
    INSERT INTO "Notas" (
      codigo_estudiantil, asignatura, grado, salon, periodo,
      nombre_actividad, porcentaje, nota
    ) VALUES (
      v_codigo_estudiantil, v_asignatura, v_grado, v_salon, v_periodo,
      'Final Periodo', porcentaje_periodo, nota_final_periodo
    )
    ON CONFLICT (codigo_estudiantil, asignatura, grado, salon, periodo, nombre_actividad)
    DO UPDATE SET nota = EXCLUDED.nota, porcentaje = EXCLUDED.porcentaje,
                  fecha_modificacion = NOW();
    PERFORM set_config('app.bypass_protection', NULL, true);
  ELSE
    -- No hay notas normales, eliminar Final Periodo si existe
    PERFORM set_config('app.bypass_protection', 'true', true);
    DELETE FROM "Notas"
    WHERE codigo_estudiantil = v_codigo_estudiantil
      AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
      AND periodo = v_periodo
      AND nombre_actividad = 'Final Periodo';
    PERFORM set_config('app.bypass_protection', NULL, true);
  END IF;

  -- Calcular Final Definitiva (promedio de los 4 periodos)
  SELECT nota, porcentaje INTO nota_p1, porc_p1 FROM "Notas"
  WHERE codigo_estudiantil = v_codigo_estudiantil
    AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
    AND periodo = 1 AND nombre_actividad = 'Final Periodo';

  SELECT nota, porcentaje INTO nota_p2, porc_p2 FROM "Notas"
  WHERE codigo_estudiantil = v_codigo_estudiantil
    AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
    AND periodo = 2 AND nombre_actividad = 'Final Periodo';

  SELECT nota, porcentaje INTO nota_p3, porc_p3 FROM "Notas"
  WHERE codigo_estudiantil = v_codigo_estudiantil
    AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
    AND periodo = 3 AND nombre_actividad = 'Final Periodo';

  SELECT nota, porcentaje INTO nota_p4, porc_p4 FROM "Notas"
  WHERE codigo_estudiantil = v_codigo_estudiantil
    AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
    AND periodo = 4 AND nombre_actividad = 'Final Periodo';

  tiene_algun_periodo := (nota_p1 IS NOT NULL OR nota_p2 IS NOT NULL OR
                          nota_p3 IS NOT NULL OR nota_p4 IS NOT NULL);

  IF tiene_algun_periodo THEN
    periodos_con_nota := 0;
    nota_final_definitiva := 0;
    IF nota_p1 IS NOT NULL THEN periodos_con_nota := periodos_con_nota + 1; nota_final_definitiva := nota_final_definitiva + nota_p1; END IF;
    IF nota_p2 IS NOT NULL THEN periodos_con_nota := periodos_con_nota + 1; nota_final_definitiva := nota_final_definitiva + nota_p2; END IF;
    IF nota_p3 IS NOT NULL THEN periodos_con_nota := periodos_con_nota + 1; nota_final_definitiva := nota_final_definitiva + nota_p3; END IF;
    IF nota_p4 IS NOT NULL THEN periodos_con_nota := periodos_con_nota + 1; nota_final_definitiva := nota_final_definitiva + nota_p4; END IF;

    nota_final_definitiva := ROUND(nota_final_definitiva / periodos_con_nota, 2);
    porcentaje_definitiva := ROUND(
      CAST((COALESCE(porc_p1, 0) + COALESCE(porc_p2, 0) +
            COALESCE(porc_p3, 0) + COALESCE(porc_p4, 0)) / 4.0 AS NUMERIC), 2);

    -- Upsert Final Definitiva en periodo 0
    PERFORM set_config('app.bypass_protection', 'true', true);
    INSERT INTO "Notas" (
      codigo_estudiantil, asignatura, grado, salon, periodo,
      nombre_actividad, porcentaje, nota
    ) VALUES (
      v_codigo_estudiantil, v_asignatura, v_grado, v_salon, 0,
      'Final Definitiva', porcentaje_definitiva, nota_final_definitiva
    )
    ON CONFLICT (codigo_estudiantil, asignatura, grado, salon, periodo, nombre_actividad)
    DO UPDATE SET nota = EXCLUDED.nota, porcentaje = EXCLUDED.porcentaje,
                  fecha_modificacion = NOW();
    PERFORM set_config('app.bypass_protection', NULL, true);
  ELSE
    -- No hay periodos, eliminar Final Definitiva
    PERFORM set_config('app.bypass_protection', 'true', true);
    DELETE FROM "Notas"
    WHERE codigo_estudiantil = v_codigo_estudiantil
      AND asignatura = v_asignatura AND grado = v_grado AND salon = v_salon
      AND periodo = 0
      AND nombre_actividad = 'Final Definitiva';
    PERFORM set_config('app.bypass_protection', NULL, true);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 5.6 reorganizar_orden_despues_borrar()
CREATE OR REPLACE FUNCTION public.reorganizar_orden_despues_borrar() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE "Nombre de Actividades" na
  SET orden = subq.nuevo_orden
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY codigo_profesor, asignatura, grado, salon, periodo
        ORDER BY orden, fecha_creacion
      ) as nuevo_orden
    FROM "Nombre de Actividades"
    WHERE codigo_profesor = OLD.codigo_profesor
      AND asignatura = OLD.asignatura
      AND grado = OLD.grado
      AND salon = OLD.salon
      AND periodo = OLD.periodo
  ) subq
  WHERE na.id = subq.id;
  RETURN OLD;
END;
$$;

-- 5.7 sincronizar_nombre_actividad()
CREATE OR REPLACE FUNCTION public.sincronizar_nombre_actividad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.bypass_nombre_protection', 'true', true);

  UPDATE "Notas"
  SET nombre_actividad = NEW.nombre_actividad
  WHERE asignatura = OLD.asignatura
    AND grado = OLD.grado
    AND salon = OLD.salon
    AND periodo = OLD.periodo
    AND nombre_actividad = OLD.nombre_actividad;

  PERFORM set_config('app.bypass_nombre_protection', 'false', true);
  RETURN NEW;
END;
$$;

-- 5.8 sincronizar_orden_actividad()
CREATE OR REPLACE FUNCTION public.sincronizar_orden_actividad() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.bypass_orden_protection', 'true', true);

  UPDATE "Notas"
  SET orden = NEW.orden
  WHERE asignatura = NEW.asignatura
    AND grado = NEW.grado
    AND salon = NEW.salon
    AND periodo = NEW.periodo
    AND nombre_actividad = NEW.nombre_actividad;

  PERFORM set_config('app.bypass_orden_protection', 'false', true);
  RETURN NEW;
END;
$$;

-- 5.9 sincronizar_porcentaje_desde_actividades()
CREATE OR REPLACE FUNCTION public.sincronizar_porcentaje_desde_actividades() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  PERFORM set_config('app.bypass_porcentaje_protection', 'true', true);

  UPDATE "Notas"
  SET porcentaje = NEW.porcentaje
  WHERE asignatura = NEW.asignatura
    AND grado = NEW.grado
    AND salon = NEW.salon
    AND periodo = NEW.periodo
    AND nombre_actividad = NEW.nombre_actividad;

  PERFORM set_config('app.bypass_porcentaje_protection', 'false', true);
  RETURN NEW;
END;
$$;

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
-- Nota: Los triggers NO necesitan recrearse porque apuntan a
-- las funciones por nombre, y las funciones ya fueron
-- actualizadas con CREATE OR REPLACE.
-- ============================================================
