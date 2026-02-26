import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isRectorOrCoordinador } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Pencil, Trash2, Search } from "lucide-react";

// ─── Enums ───────────────────────────────────────────────────────────────────

const GRADOS = [
  "Prejardín", "Jardín", "Transición",
  "Primero", "Segundo", "Tercero", "Cuarto", "Quinto",
  "Sexto", "Séptimo", "Octavo", "Noveno",
  "Décimo", "Undécimo",
];

const SALONES = ["1", "2", "3", "4", "5", "6"];

const CARGOS = [
  "Profesor(a)", "Rector", "Coordinador(a)", "Administrativo(a)",
  "Secretaria General", "Portero", "Servicios Generales", "Administrador",
];

const ASIGNATURAS = [
  "Artística", "Ayudas Educativas", "Castellano", "Cátedra de Paz",
  "Ciencia Política", "Ciencias Naturales",
  "Ciencias Naturales y Educación Ambiental", "Ciencias Políticas",
  "Ciencias Sociales", "Didáctica Educación Artistica",
  "Didáctica Matemáticas", "Dimensión Cognitiva",
  "Dimensión Comunicativa", "Dimensión Corporal",
  "Dimensión de Ética y Valores", "Dimensión Estética",
  "Dimensión General", "Educación Artística", "Educación Física",
  "Estadística", "Ética", "Filosofía", "Física", "Geometría",
  "Informática", "Inglés", "Investigación Formativa",
  "Lectura Crítica", "Matemáticas", "MEF", "Pedagogía",
  "Práctica Pedagógica", "Psicología General", "Química",
  "Religión", "Tecnología", "Técnicas de PTE-TIC",
  "Uso pedagógico de tic",
];

const NUM_ESTUDIANTES = ["1 (uno)", "2 (dos)", "3 (tres)"];

const NIVELES_GRADOS: Record<string, string[]> = {
  Preescolar: ["Prejardín", "Jardín", "Transición"],
  Primaria: ["Primero", "Segundo", "Tercero", "Cuarto", "Quinto"],
  Secundaria: ["Sexto", "Séptimo", "Octavo", "Noveno"],
  Media: ["Décimo", "Undécimo"],
};

function getNivelFromGrado(grado: string): string | null {
  for (const [nivel, grados] of Object.entries(NIVELES_GRADOS)) {
    if (grados.includes(grado)) return nivel;
  }
  return null;
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Estudiante {
  codigo_estudiantil: number;
  nombre_estudiante: string;
  apellidos_estudiante: string;
  nivel_estudiante: string;
  grado_estudiante: string;
  salon_estudiante: string;
}

interface Interno {
  codigo: number;
  nombres: string;
  apellidos: string;
  cargo: string;
  contrasena: string;
  id: string;
}

interface Asignacion {
  row_id: string;
  nombres: string;
  apellidos: string;
  id: string;
  "Asignatura(s)": string[];
  "Grado(s)": string[];
  "Salon(es)": string[];
}

interface Perfil {
  id: number;
  perfil: string;
  estudiante_codigo: number | null;
  estudiante_nombre: string | null;
  estudiante_apellidos: string | null;
  estudiante_nivel: string | null;
  estudiante_grado: string | null;
  estudiante_salon: string | null;
  padre_nombre: string | null;
  padre_codigo: string | null;
  padre_numero_de_estudiantes: string | null;
  padre_estudiante1_codigo: number | null;
  padre_estudiante1_nombre: string | null;
  padre_estudiante1_apellidos: string | null;
  padre_estudiante1_nivel: string | null;
  padre_estudiante1_grado: string | null;
  padre_estudiante1_salon: string | null;
  padre_estudiante2_codigo: number | null;
  padre_estudiante2_nombre: string | null;
  padre_estudiante2_apellidos: string | null;
  padre_estudiante2_nivel: string | null;
  padre_estudiante2_grado: string | null;
  padre_estudiante2_salon: string | null;
  padre_estudiante3_codigo: number | null;
  padre_estudiante3_nombre: string | null;
  padre_estudiante3_apellidos: string | null;
  padre_estudiante3_nivel: string | null;
  padre_estudiante3_grado: string | null;
  padre_estudiante3_salon: string | null;
  contrasena: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toggleItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
}

// Supabase limits to 1000 rows per request. Paginate to fetch all.
async function fetchAllPages<T>(
  makeQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  let all: T[] = [];
  let from = 0;
  while (true) {
    const { data } = await makeQuery(from, from + PAGE - 1);
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PanelControl = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Auth
  useEffect(() => {
    const session = getSession();
    if (!session.codigo) { navigate("/"); return; }
    if (!isRectorOrCoordinador()) { navigate("/dashboard"); return; }
  }, [navigate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Estudiantes
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loadingEst, setLoadingEst] = useState(true);
  const [searchEst, setSearchEst] = useState("");
  const [showEstDialog, setShowEstDialog] = useState(false);
  const [editingEst, setEditingEst] = useState<Estudiante | null>(null);
  const [showDeleteEst, setShowDeleteEst] = useState<Estudiante | null>(null);
  const [savingEst, setSavingEst] = useState(false);
  const [estCodigo, setEstCodigo] = useState("");
  const [estNombre, setEstNombre] = useState("");
  const [estApellidos, setEstApellidos] = useState("");
  const [estGrado, setEstGrado] = useState("");
  const [estSalon, setEstSalon] = useState("");

  // Internos
  const [internos, setInternos] = useState<Interno[]>([]);
  const [loadingInt, setLoadingInt] = useState(true);
  const [searchInt, setSearchInt] = useState("");
  const [showIntDialog, setShowIntDialog] = useState(false);
  const [editingInt, setEditingInt] = useState<Interno | null>(null);
  const [showDeleteInt, setShowDeleteInt] = useState<Interno | null>(null);
  const [savingInt, setSavingInt] = useState(false);
  const [intCodigo, setIntCodigo] = useState("");
  const [intNombres, setIntNombres] = useState("");
  const [intApellidos, setIntApellidos] = useState("");
  const [intCargo, setIntCargo] = useState("");
  const [intContrasena, setIntContrasena] = useState("");

  // Asignaciones
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loadingAsig, setLoadingAsig] = useState(true);
  const [searchAsig, setSearchAsig] = useState("");
  const [showAsigDialog, setShowAsigDialog] = useState(false);
  const [editingAsig, setEditingAsig] = useState<Asignacion | null>(null);
  const [showDeleteAsig, setShowDeleteAsig] = useState<Asignacion | null>(null);
  const [savingAsig, setSavingAsig] = useState(false);
  const [asigProfesorCodigo, setAsigProfesorCodigo] = useState("");
  const [asigNombres, setAsigNombres] = useState("");
  const [asigApellidos, setAsigApellidos] = useState("");
  const [asigId, setAsigId] = useState("");
  const [asigAsignaturas, setAsigAsignaturas] = useState<string[]>([]);
  const [asigGrados, setAsigGrados] = useState<string[]>([]);
  const [asigSalones, setAsigSalones] = useState<string[]>([]);

  // Perfiles
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [searchPerf, setSearchPerf] = useState("");
  const [showPerfDialog, setShowPerfDialog] = useState(false);
  const [editingPerf, setEditingPerf] = useState<Perfil | null>(null);
  const [showDeletePerf, setShowDeletePerf] = useState<Perfil | null>(null);
  const [savingPerf, setSavingPerf] = useState(false);
  // Perfil form state
  const [perfTipo, setPerfTipo] = useState<string>("Estudiante");
  const [perfEstCodigo, setPerfEstCodigo] = useState("");
  const [perfEstNombre, setPerfEstNombre] = useState("");
  const [perfEstApellidos, setPerfEstApellidos] = useState("");
  const [perfEstGrado, setPerfEstGrado] = useState("");
  const [perfEstSalon, setPerfEstSalon] = useState("");
  const [perfPadreNombre, setPerfPadreNombre] = useState("");
  const [perfPadreCodigo, setPerfPadreCodigo] = useState("");
  const [perfNumEst, setPerfNumEst] = useState("1 (uno)");
  const [perfHijo1Codigo, setPerfHijo1Codigo] = useState("");
  const [perfHijo1Nombre, setPerfHijo1Nombre] = useState("");
  const [perfHijo1Apellidos, setPerfHijo1Apellidos] = useState("");
  const [perfHijo1Grado, setPerfHijo1Grado] = useState("");
  const [perfHijo1Salon, setPerfHijo1Salon] = useState("");
  const [perfHijo2Codigo, setPerfHijo2Codigo] = useState("");
  const [perfHijo2Nombre, setPerfHijo2Nombre] = useState("");
  const [perfHijo2Apellidos, setPerfHijo2Apellidos] = useState("");
  const [perfHijo2Grado, setPerfHijo2Grado] = useState("");
  const [perfHijo2Salon, setPerfHijo2Salon] = useState("");
  const [perfHijo3Codigo, setPerfHijo3Codigo] = useState("");
  const [perfHijo3Nombre, setPerfHijo3Nombre] = useState("");
  const [perfHijo3Apellidos, setPerfHijo3Apellidos] = useState("");
  const [perfHijo3Grado, setPerfHijo3Grado] = useState("");
  const [perfHijo3Salon, setPerfHijo3Salon] = useState("");
  const [perfContrasena, setPerfContrasena] = useState("");

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchEstudiantes = async () => {
    setLoadingEst(true);
    const data = await fetchAllPages((from, to) =>
      supabase
        .from("Estudiantes")
        .select("codigo_estudiantil, nombre_estudiante, apellidos_estudiante, nivel_estudiante, grado_estudiante, salon_estudiante")
        .order("apellidos_estudiante")
        .order("nombre_estudiante")
        .range(from, to)
    );
    setEstudiantes(data);
    setLoadingEst(false);
  };

  const fetchInternos = async () => {
    setLoadingInt(true);
    const data = await fetchAllPages((from, to) =>
      supabase.from("Internos").select("codigo, nombres, apellidos, cargo, contrasena, id").range(from, to)
    );
    setInternos(data.sort((a, b) => (a.apellidos || "").localeCompare(b.apellidos || "", "es")));
    setLoadingInt(false);
  };

  const fetchAsignaciones = async () => {
    setLoadingAsig(true);
    const data = await fetchAllPages<Asignacion>((from, to) =>
      supabase.from("Asignación Profesores").select('row_id, nombres, apellidos, id, "Asignatura(s)", "Grado(s)", "Salon(es)"').range(from, to)
    );
    setAsignaciones(data.sort((a, b) => (a.apellidos || "").localeCompare(b.apellidos || "", "es")));
    setLoadingAsig(false);
  };

  const fetchPerfiles = async () => {
    setLoadingPerf(true);
    const data = await fetchAllPages((from, to) =>
      supabase.from("Perfiles_Generales").select("*").order("id").range(from, to)
    );
    setPerfiles(data);
    setLoadingPerf(false);
  };

  useEffect(() => {
    fetchEstudiantes();
    fetchInternos();
    fetchAsignaciones();
    fetchPerfiles();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTUDIANTES CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openEstDialog = (est?: Estudiante) => {
    if (est) {
      setEditingEst(est);
      setEstCodigo(String(est.codigo_estudiantil));
      setEstNombre(est.nombre_estudiante || "");
      setEstApellidos(est.apellidos_estudiante || "");
      setEstGrado(est.grado_estudiante || "");
      setEstSalon(est.salon_estudiante || "");
    } else {
      setEditingEst(null);
      setEstCodigo("");
      setEstNombre("");
      setEstApellidos("");
      setEstGrado("");
      setEstSalon("");
    }
    setShowEstDialog(true);
  };

  const saveEstudiante = async () => {
    if (!estCodigo || !estNombre || !estApellidos || !estGrado || !estSalon) {
      toast({ title: "Campos requeridos", description: "Completa todos los campos", variant: "destructive" });
      return;
    }
    const nivel = getNivelFromGrado(estGrado);
    if (!nivel) {
      toast({ title: "Error", description: "Grado inválido", variant: "destructive" });
      return;
    }
    setSavingEst(true);
    const payload = {
      codigo_estudiantil: Number(estCodigo),
      nombre_estudiante: estNombre.trim(),
      apellidos_estudiante: estApellidos.trim(),
      nivel_estudiante: nivel,
      grado_estudiante: estGrado,
      salon_estudiante: estSalon,
    };

    let error;
    if (editingEst) {
      ({ error } = await supabase
        .from("Estudiantes")
        .update(payload)
        .eq("codigo_estudiantil", editingEst.codigo_estudiantil));
    } else {
      ({ error } = await supabase.from("Estudiantes").insert(payload));
    }

    setSavingEst(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: `Ya existe un estudiante con el código ${estCodigo}`, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: editingEst ? "Estudiante actualizado" : "Estudiante agregado" });
    setShowEstDialog(false);
    fetchEstudiantes();
  };

  const deleteEstudiante = async () => {
    if (!showDeleteEst) return;
    setSavingEst(true);
    const { error } = await supabase
      .from("Estudiantes")
      .delete()
      .eq("codigo_estudiantil", showDeleteEst.codigo_estudiantil);
    setSavingEst(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Estudiante eliminado" });
    setShowDeleteEst(null);
    fetchEstudiantes();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNOS CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openIntDialog = (int?: Interno) => {
    if (int) {
      setEditingInt(int);
      setIntCodigo(String(int.codigo));
      setIntNombres(int.nombres || "");
      setIntApellidos(int.apellidos || "");
      setIntCargo(int.cargo || "");
      setIntContrasena(int.contrasena || "");
    } else {
      setEditingInt(null);
      setIntCodigo("");
      setIntNombres("");
      setIntApellidos("");
      setIntCargo("");
      setIntContrasena("");
    }
    setShowIntDialog(true);
  };

  const saveInterno = async () => {
    if (!intCodigo || !intNombres || !intApellidos || !intCargo) {
      toast({ title: "Campos requeridos", description: "Completa código, nombres, apellidos y cargo", variant: "destructive" });
      return;
    }
    if (!editingInt && !intContrasena) {
      toast({ title: "Campos requeridos", description: "La contraseña es requerida para nuevos funcionarios", variant: "destructive" });
      return;
    }

    setSavingInt(true);
    const payload: Record<string, unknown> = {
      codigo: Number(intCodigo),
      nombres: intNombres.trim(),
      apellidos: intApellidos.trim(),
      cargo: intCargo,
    };
    if (intContrasena) payload.contrasena = intContrasena;

    let error;
    if (editingInt) {
      ({ error } = await supabase
        .from("Internos")
        .update(payload)
        .eq("codigo", editingInt.codigo));
    } else {
      ({ error } = await supabase.from("Internos").insert(payload));
    }

    setSavingInt(false);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Error", description: `Ya existe un funcionario con el código ${intCodigo}`, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: editingInt ? "Funcionario actualizado" : "Funcionario agregado" });
    setShowIntDialog(false);
    fetchInternos();
  };

  const deleteInterno = async () => {
    if (!showDeleteInt) return;
    setSavingInt(true);
    const { error } = await supabase
      .from("Internos")
      .delete()
      .eq("codigo", showDeleteInt.codigo);
    setSavingInt(false);
    if (error) {
      if (error.code === "23503") {
        toast({
          title: "No se puede eliminar",
          description: "Este funcionario tiene actividades asignadas. Elimina las actividades primero.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Funcionario eliminado" });
    setShowDeleteInt(null);
    fetchInternos();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ASIGNACIONES CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openAsigDialog = (asig?: Asignacion) => {
    if (asig) {
      setEditingAsig(asig);
      const prof = internos.find((i) => i.id === asig.id);
      setAsigProfesorCodigo(prof ? String(prof.codigo) : "");
      setAsigNombres(asig.nombres || "");
      setAsigApellidos(asig.apellidos || "");
      setAsigId(asig.id || "");
      setAsigAsignaturas(asig["Asignatura(s)"] || []);
      setAsigGrados(asig["Grado(s)"] || []);
      setAsigSalones(asig["Salon(es)"] || []);
    } else {
      setEditingAsig(null);
      setAsigProfesorCodigo("");
      setAsigNombres("");
      setAsigApellidos("");
      setAsigId("");
      setAsigAsignaturas([]);
      setAsigGrados([]);
      setAsigSalones([]);
    }
    setShowAsigDialog(true);
  };

  const handleSelectProfesor = (codigoStr: string) => {
    setAsigProfesorCodigo(codigoStr);
    const prof = internos.find((i) => String(i.codigo) === codigoStr);
    if (prof) {
      setAsigNombres(prof.nombres || "");
      setAsigApellidos(prof.apellidos || "");
      setAsigId(prof.id || "");
    }
  };

  const saveAsignacion = async () => {
    if (
      !asigApellidos ||
      asigAsignaturas.length === 0 ||
      asigGrados.length === 0 ||
      asigSalones.length === 0
    ) {
      toast({
        title: "Campos requeridos",
        description: "Selecciona profesor, al menos una asignatura, un grado y un salón",
        variant: "destructive",
      });
      return;
    }

    setSavingAsig(true);
    const payload = {
      nombres: asigNombres.trim(),
      apellidos: asigApellidos.trim(),
      id: asigId || null,
      "Asignatura(s)": asigAsignaturas,
      "Grado(s)": asigGrados,
      "Salon(es)": asigSalones,
    };

    let error;
    if (editingAsig) {
      ({ error } = await supabase
        .from("Asignación Profesores")
        .update(payload)
        .eq("row_id", editingAsig.row_id));
    } else {
      ({ error } = await supabase.from("Asignación Profesores").insert(payload));
    }

    setSavingAsig(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingAsig ? "Asignación actualizada" : "Asignación agregada" });
    setShowAsigDialog(false);
    fetchAsignaciones();
  };

  const deleteAsignacion = async () => {
    if (!showDeleteAsig) return;
    setSavingAsig(true);
    const { error } = await supabase
      .from("Asignación Profesores")
      .delete()
      .eq("row_id", showDeleteAsig.row_id);
    setSavingAsig(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Asignación eliminada" });
    setShowDeleteAsig(null);
    fetchAsignaciones();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFILES CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  const openPerfDialog = (p?: Perfil) => {
    if (p) {
      setEditingPerf(p);
      setPerfTipo(p.perfil || "Estudiante");
      setPerfEstCodigo(p.estudiante_codigo != null ? String(p.estudiante_codigo) : "");
      setPerfEstNombre(p.estudiante_nombre || "");
      setPerfEstApellidos(p.estudiante_apellidos || "");
      setPerfEstGrado(p.estudiante_grado || "");
      setPerfEstSalon(p.estudiante_salon || "");
      setPerfPadreNombre(p.padre_nombre || "");
      setPerfPadreCodigo(p.padre_codigo || "");
      setPerfNumEst(p.padre_numero_de_estudiantes || "1 (uno)");
      setPerfHijo1Codigo(p.padre_estudiante1_codigo != null ? String(p.padre_estudiante1_codigo) : "");
      setPerfHijo1Nombre(p.padre_estudiante1_nombre || "");
      setPerfHijo1Apellidos(p.padre_estudiante1_apellidos || "");
      setPerfHijo1Grado(p.padre_estudiante1_grado || "");
      setPerfHijo1Salon(p.padre_estudiante1_salon || "");
      setPerfHijo2Codigo(p.padre_estudiante2_codigo != null ? String(p.padre_estudiante2_codigo) : "");
      setPerfHijo2Nombre(p.padre_estudiante2_nombre || "");
      setPerfHijo2Apellidos(p.padre_estudiante2_apellidos || "");
      setPerfHijo2Grado(p.padre_estudiante2_grado || "");
      setPerfHijo2Salon(p.padre_estudiante2_salon || "");
      setPerfHijo3Codigo(p.padre_estudiante3_codigo != null ? String(p.padre_estudiante3_codigo) : "");
      setPerfHijo3Nombre(p.padre_estudiante3_nombre || "");
      setPerfHijo3Apellidos(p.padre_estudiante3_apellidos || "");
      setPerfHijo3Grado(p.padre_estudiante3_grado || "");
      setPerfHijo3Salon(p.padre_estudiante3_salon || "");
      setPerfContrasena(p.contrasena || "");
    } else {
      setEditingPerf(null);
      setPerfTipo("Estudiante");
      setPerfEstCodigo(""); setPerfEstNombre(""); setPerfEstApellidos("");
      setPerfEstGrado(""); setPerfEstSalon("");
      setPerfPadreNombre(""); setPerfPadreCodigo(""); setPerfNumEst("1 (uno)");
      setPerfHijo1Codigo(""); setPerfHijo1Nombre(""); setPerfHijo1Apellidos("");
      setPerfHijo1Grado(""); setPerfHijo1Salon("");
      setPerfHijo2Codigo(""); setPerfHijo2Nombre(""); setPerfHijo2Apellidos("");
      setPerfHijo2Grado(""); setPerfHijo2Salon("");
      setPerfHijo3Codigo(""); setPerfHijo3Nombre(""); setPerfHijo3Apellidos("");
      setPerfHijo3Grado(""); setPerfHijo3Salon("");
      setPerfContrasena("");
    }
    setShowPerfDialog(true);
  };

  const savePerfil = async () => {
    setSavingPerf(true);
    const payload: Record<string, unknown> = {
      perfil: perfTipo,
      contrasena: perfContrasena || null,
    };

    if (perfTipo === "Estudiante") {
      if (!perfEstCodigo || !perfEstNombre || !perfEstApellidos) {
        toast({ title: "Campos requeridos", description: "Completa código, nombres y apellidos del estudiante", variant: "destructive" });
        setSavingPerf(false);
        return;
      }
      const nivel = perfEstGrado ? getNivelFromGrado(perfEstGrado) : null;
      payload.estudiante_codigo = Number(perfEstCodigo);
      payload.estudiante_nombre = perfEstNombre.trim();
      payload.estudiante_apellidos = perfEstApellidos.trim();
      payload.estudiante_nivel = nivel;
      payload.estudiante_grado = perfEstGrado || null;
      payload.estudiante_salon = perfEstSalon || null;
      // Clear padre fields
      payload.padre_nombre = null;
      payload.padre_codigo = null;
      payload.padre_numero_de_estudiantes = null;
      payload.padre_estudiante1_codigo = null;
      payload.padre_estudiante1_nombre = null;
      payload.padre_estudiante1_apellidos = null;
      payload.padre_estudiante1_nivel = null;
      payload.padre_estudiante1_grado = null;
      payload.padre_estudiante1_salon = null;
      payload.padre_estudiante2_codigo = null;
      payload.padre_estudiante2_nombre = null;
      payload.padre_estudiante2_apellidos = null;
      payload.padre_estudiante2_nivel = null;
      payload.padre_estudiante2_grado = null;
      payload.padre_estudiante2_salon = null;
      payload.padre_estudiante3_codigo = null;
      payload.padre_estudiante3_nombre = null;
      payload.padre_estudiante3_apellidos = null;
      payload.padre_estudiante3_nivel = null;
      payload.padre_estudiante3_grado = null;
      payload.padre_estudiante3_salon = null;
    } else {
      if (!perfPadreNombre) {
        toast({ title: "Campos requeridos", description: "Completa el nombre del padre", variant: "destructive" });
        setSavingPerf(false);
        return;
      }
      // Clear estudiante fields
      payload.estudiante_codigo = null;
      payload.estudiante_nombre = null;
      payload.estudiante_apellidos = null;
      payload.estudiante_nivel = null;
      payload.estudiante_grado = null;
      payload.estudiante_salon = null;
      payload.padre_nombre = perfPadreNombre.trim();
      payload.padre_codigo = perfPadreCodigo || null;
      payload.padre_numero_de_estudiantes = perfNumEst;
      // Hijo 1
      const n1 = getNivelFromGrado(perfHijo1Grado);
      payload.padre_estudiante1_codigo = perfHijo1Codigo ? Number(perfHijo1Codigo) : null;
      payload.padre_estudiante1_nombre = perfHijo1Nombre || null;
      payload.padre_estudiante1_apellidos = perfHijo1Apellidos || null;
      payload.padre_estudiante1_nivel = n1;
      payload.padre_estudiante1_grado = perfHijo1Grado || null;
      payload.padre_estudiante1_salon = perfHijo1Salon || null;
      // Hijo 2
      const numEst = parseInt(perfNumEst);
      if (numEst >= 2) {
        const n2 = getNivelFromGrado(perfHijo2Grado);
        payload.padre_estudiante2_codigo = perfHijo2Codigo ? Number(perfHijo2Codigo) : null;
        payload.padre_estudiante2_nombre = perfHijo2Nombre || null;
        payload.padre_estudiante2_apellidos = perfHijo2Apellidos || null;
        payload.padre_estudiante2_nivel = n2;
        payload.padre_estudiante2_grado = perfHijo2Grado || null;
        payload.padre_estudiante2_salon = perfHijo2Salon || null;
      } else {
        payload.padre_estudiante2_codigo = null;
        payload.padre_estudiante2_nombre = null;
        payload.padre_estudiante2_apellidos = null;
        payload.padre_estudiante2_nivel = null;
        payload.padre_estudiante2_grado = null;
        payload.padre_estudiante2_salon = null;
      }
      // Hijo 3
      if (numEst >= 3) {
        const n3 = getNivelFromGrado(perfHijo3Grado);
        payload.padre_estudiante3_codigo = perfHijo3Codigo ? Number(perfHijo3Codigo) : null;
        payload.padre_estudiante3_nombre = perfHijo3Nombre || null;
        payload.padre_estudiante3_apellidos = perfHijo3Apellidos || null;
        payload.padre_estudiante3_nivel = n3;
        payload.padre_estudiante3_grado = perfHijo3Grado || null;
        payload.padre_estudiante3_salon = perfHijo3Salon || null;
      } else {
        payload.padre_estudiante3_codigo = null;
        payload.padre_estudiante3_nombre = null;
        payload.padre_estudiante3_apellidos = null;
        payload.padre_estudiante3_nivel = null;
        payload.padre_estudiante3_grado = null;
        payload.padre_estudiante3_salon = null;
      }
    }

    let error;
    if (editingPerf) {
      ({ error } = await supabase
        .from("Perfiles_Generales")
        .update(payload)
        .eq("id", editingPerf.id));
    } else {
      ({ error } = await supabase.from("Perfiles_Generales").insert(payload));
    }

    setSavingPerf(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editingPerf ? "Perfil actualizado" : "Perfil agregado" });
    setShowPerfDialog(false);
    fetchPerfiles();
  };

  const deletePerfil = async () => {
    if (!showDeletePerf) return;
    setSavingPerf(true);
    const { error } = await supabase
      .from("Perfiles_Generales")
      .delete()
      .eq("id", showDeletePerf.id);
    setSavingPerf(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Perfil eliminado" });
    setShowDeletePerf(null);
    fetchPerfiles();
  };

  // Helper to get display name for a perfil
  const getPerfilDisplayName = (p: Perfil) => {
    if (p.perfil === "Estudiante") {
      return `${p.estudiante_apellidos || ""} ${p.estudiante_nombre || ""}`.trim() || "Sin nombre";
    }
    return p.padre_nombre || "Sin nombre";
  };

  const getPerfilDisplayCode = (p: Perfil) => {
    if (p.perfil === "Estudiante") return p.estudiante_codigo != null ? String(p.estudiante_codigo) : "—";
    return p.padre_codigo || "—";
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════════════════════════════════

  const filteredEst = estudiantes.filter((e) =>
    normalize(`${e.apellidos_estudiante} ${e.nombre_estudiante} ${e.codigo_estudiantil} ${e.grado_estudiante} ${e.salon_estudiante}`)
      .includes(normalize(searchEst))
  );

  const filteredInt = internos.filter((i) =>
    normalize(`${i.apellidos} ${i.nombres} ${i.codigo} ${i.cargo}`)
      .includes(normalize(searchInt))
  );

  const filteredAsig = asignaciones.filter((a) =>
    normalize(`${a.apellidos} ${a.nombres} ${(a["Asignatura(s)"] || []).join(" ")} ${(a["Grado(s)"] || []).join(" ")}`)
      .includes(normalize(searchAsig))
  );

  const filteredPerf = perfiles.filter((p) =>
    normalize(`${getPerfilDisplayName(p)} ${getPerfilDisplayCode(p)} ${p.perfil} ${p.contrasena || ""}`)
      .includes(normalize(searchPerf))
  );

  // Helper: render hijo fields for Asignacion dialog
  const renderHijoFields = (
    num: number,
    codigo: string, setCodigo: (v: string) => void,
    nombre: string, setNombre: (v: string) => void,
    apellidos: string, setApellidos: (v: string) => void,
    grado: string, setGrado: (v: string) => void,
    salon: string, setSalon: (v: string) => void,
  ) => (
    <div key={num} className="border rounded-md p-3 space-y-3">
      <p className="text-sm font-medium">Hijo {num}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Código</Label>
          <Input type="number" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Apellidos</Label>
          <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Apellidos" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Grado</Label>
          <Select value={grado} onValueChange={setGrado}>
            <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
            <SelectContent>
              {GRADOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Salón</Label>
          <Select value={salon} onValueChange={setSalon}>
            <SelectTrigger><SelectValue placeholder="Salón" /></SelectTrigger>
            <SelectContent>
              {SALONES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink="/dashboard-rector" />

      <main className="flex-1 container mx-auto p-4 md:p-8">
        {/* Breadcrumb */}
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate("/dashboard-rector")} className="text-primary hover:underline">
              Inicio
            </button>
            <span className="text-muted-foreground">→</span>
            <span className="text-foreground font-medium">Panel de Control</span>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-soft p-6 md:p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Panel de Control
          </h2>

          <Tabs defaultValue="estudiantes">
            <TabsList className="flex w-full mb-6">
              <TabsTrigger value="estudiantes" className="flex-1">Estudiantes</TabsTrigger>
              <TabsTrigger value="perfiles" className="flex-1">Perfiles registrados</TabsTrigger>
              <TabsTrigger value="internos" className="flex-1">Internos</TabsTrigger>
              <TabsTrigger value="asignaciones" className="flex-1">Asignaciones</TabsTrigger>
            </TabsList>

            {/* ════════════════ TAB: ESTUDIANTES ════════════════ */}
            <TabsContent value="estudiantes">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código, grado..."
                    value={searchEst}
                    onChange={(e) => setSearchEst(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => openEstDialog()}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </Button>
              </div>

              {loadingEst ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Grado</TableHead>
                        <TableHead>Salón</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEst.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No se encontraron estudiantes
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEst.map((e) => (
                          <TableRow key={e.codigo_estudiantil}>
                            <TableCell className="font-mono">{e.codigo_estudiantil}</TableCell>
                            <TableCell>{e.apellidos_estudiante}</TableCell>
                            <TableCell>{e.nombre_estudiante}</TableCell>
                            <TableCell>{e.grado_estudiante}</TableCell>
                            <TableCell>{e.salon_estudiante}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openEstDialog(e)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowDeleteEst(e)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ════════════════ TAB: INTERNOS ════════════════ */}
            <TabsContent value="internos">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código, cargo..."
                    value={searchInt}
                    onChange={(e) => setSearchInt(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => openIntDialog()}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </Button>
              </div>

              {loadingInt ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Apellidos</TableHead>
                        <TableHead>Nombres</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Contraseña</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInt.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No se encontraron funcionarios
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInt.map((i) => (
                          <TableRow key={i.codigo}>
                            <TableCell className="font-mono">{i.codigo}</TableCell>
                            <TableCell>{i.apellidos}</TableCell>
                            <TableCell>{i.nombres}</TableCell>
                            <TableCell>{i.cargo}</TableCell>
                            <TableCell className="text-muted-foreground">{i.contrasena}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openIntDialog(i)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowDeleteInt(i)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ════════════════ TAB: ASIGNACIONES ════════════════ */}
            <TabsContent value="asignaciones">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, asignatura, grado..."
                    value={searchAsig}
                    onChange={(e) => setSearchAsig(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => openAsigDialog()}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </Button>
              </div>

              {loadingAsig ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profesor</TableHead>
                        <TableHead>Asignatura(s)</TableHead>
                        <TableHead>Grado(s)</TableHead>
                        <TableHead>Salón(es)</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAsig.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No se encontraron asignaciones
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAsig.map((a) => (
                          <TableRow key={a.row_id}>
                            <TableCell className="whitespace-nowrap">
                              {a.apellidos} {a.nombres}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(a["Asignatura(s)"] || []).join(", ")}
                            </TableCell>
                            <TableCell className="text-sm">
                              {(a["Grado(s)"] || []).join(", ")}
                            </TableCell>
                            <TableCell>
                              {(a["Salon(es)"] || []).join(", ")}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openAsigDialog(a)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowDeleteAsig(a)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* ════════════════ TAB: PERFILES ════════════════ */}
            <TabsContent value="perfiles">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, código, tipo..."
                    value={searchPerf}
                    onChange={(e) => setSearchPerf(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => openPerfDialog()}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar
                </Button>
              </div>

              {loadingPerf ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Grado/Salón</TableHead>
                        <TableHead>Contraseña</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPerf.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground">
                            No se encontraron perfiles
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPerf.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-xs">{p.id}</TableCell>
                            <TableCell>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                p.perfil === "Estudiante"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}>
                                {p.perfil}
                              </span>
                            </TableCell>
                            <TableCell>{getPerfilDisplayName(p)}</TableCell>
                            <TableCell className="font-mono">{getPerfilDisplayCode(p)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.perfil === "Estudiante"
                                ? `${p.estudiante_grado || ""} ${p.estudiante_salon || ""}`.trim() || "—"
                                : [
                                    p.padre_estudiante1_grado && `${p.padre_estudiante1_grado} ${p.padre_estudiante1_salon || ""}`.trim(),
                                    p.padre_estudiante2_grado && `${p.padre_estudiante2_grado} ${p.padre_estudiante2_salon || ""}`.trim(),
                                    p.padre_estudiante3_grado && `${p.padre_estudiante3_grado} ${p.padre_estudiante3_salon || ""}`.trim(),
                                  ].filter(Boolean).join(", ") || "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{p.contrasena || "—"}</TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => openPerfDialog(p)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setShowDeletePerf(p)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          DIALOGS
          ═══════════════════════════════════════════════════════════════════ */}

      {/* ──── Dialog: Agregar/Editar Estudiante ──── */}
      <Dialog open={showEstDialog} onOpenChange={setShowEstDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEst ? "Editar Estudiante" : "Agregar Estudiante"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código estudiantil</Label>
              <Input
                type="number"
                value={estCodigo}
                onChange={(e) => setEstCodigo(e.target.value)}
                placeholder="Ej: 12345"
                readOnly={!!editingEst}
                className={editingEst ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input
                value={estApellidos}
                onChange={(e) => setEstApellidos(e.target.value)}
                placeholder="Apellidos del estudiante"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombres</Label>
              <Input
                value={estNombre}
                onChange={(e) => setEstNombre(e.target.value)}
                placeholder="Nombres del estudiante"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grado</Label>
                <Select value={estGrado} onValueChange={setEstGrado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADOS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salón</Label>
                <Select value={estSalon} onValueChange={setEstSalon}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SALONES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEstDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEstudiante} disabled={savingEst}>
              {savingEst && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Confirmar eliminar Estudiante ──── */}
      <Dialog open={!!showDeleteEst} onOpenChange={() => setShowDeleteEst(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Estudiante</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar a{" "}
            <strong>
              {showDeleteEst?.apellidos_estudiante} {showDeleteEst?.nombre_estudiante}
            </strong>{" "}
            (código {showDeleteEst?.codigo_estudiantil})?
          </p>
          <p className="text-sm text-destructive font-medium">
            Se eliminarán TODAS las notas de este estudiante.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteEst(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteEstudiante} disabled={savingEst}>
              {savingEst && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Agregar/Editar Interno ──── */}
      <Dialog open={showIntDialog} onOpenChange={setShowIntDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingInt ? "Editar Funcionario" : "Agregar Funcionario"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                type="number"
                value={intCodigo}
                onChange={(e) => setIntCodigo(e.target.value)}
                placeholder="Ej: 12345"
                readOnly={!!editingInt}
                className={editingInt ? "bg-muted" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label>Apellidos</Label>
              <Input
                value={intApellidos}
                onChange={(e) => setIntApellidos(e.target.value)}
                placeholder="Apellidos"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombres</Label>
              <Input
                value={intNombres}
                onChange={(e) => setIntNombres(e.target.value)}
                placeholder="Nombres"
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={intCargo} onValueChange={setIntCargo}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Contraseña {editingInt && "(dejar vacío para no cambiar)"}</Label>
              <Input
                value={intContrasena}
                onChange={(e) => setIntContrasena(e.target.value)}
                placeholder={editingInt ? "Nueva contraseña (opcional)" : "Contraseña"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveInterno} disabled={savingInt}>
              {savingInt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Confirmar eliminar Interno ──── */}
      <Dialog open={!!showDeleteInt} onOpenChange={() => setShowDeleteInt(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Funcionario</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar a{" "}
            <strong>
              {showDeleteInt?.apellidos} {showDeleteInt?.nombres}
            </strong>{" "}
            (código {showDeleteInt?.codigo})?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteInt(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteInterno} disabled={savingInt}>
              {savingInt && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Agregar/Editar Asignación ──── */}
      <Dialog open={showAsigDialog} onOpenChange={setShowAsigDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAsig ? "Editar Asignación" : "Agregar Asignación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Seleccionar Profesor */}
            <div className="space-y-2">
              <Label>Profesor</Label>
              <Select value={asigProfesorCodigo} onValueChange={handleSelectProfesor}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {internos.map((i) => (
                    <SelectItem key={i.codigo} value={String(i.codigo)}>
                      {i.apellidos} {i.nombres}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {asigNombres && (
                <p className="text-xs text-muted-foreground">
                  {asigApellidos} {asigNombres} — ID: {asigId || "sin ID"}
                </p>
              )}
            </div>

            {/* Asignaturas */}
            <div className="space-y-2">
              <Label>
                Asignatura(s){" "}
                <span className="text-muted-foreground font-normal">
                  ({asigAsignaturas.length} seleccionadas)
                </span>
              </Label>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ASIGNATURAS.map((a) => (
                  <label key={a} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={asigAsignaturas.includes(a)}
                      onCheckedChange={() =>
                        setAsigAsignaturas(toggleItem(asigAsignaturas, a))
                      }
                    />
                    {a}
                  </label>
                ))}
              </div>
            </div>

            {/* Grados */}
            <div className="space-y-2">
              <Label>
                Grado(s){" "}
                <span className="text-muted-foreground font-normal">
                  ({asigGrados.length} seleccionados)
                </span>
              </Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GRADOS.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={asigGrados.includes(g)}
                      onCheckedChange={() =>
                        setAsigGrados(toggleItem(asigGrados, g))
                      }
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>

            {/* Salones */}
            <div className="space-y-2">
              <Label>
                Salón(es){" "}
                <span className="text-muted-foreground font-normal">
                  ({asigSalones.length} seleccionados)
                </span>
              </Label>
              <div className="border rounded-md p-3 flex flex-wrap gap-4">
                {SALONES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={asigSalones.includes(s)}
                      onCheckedChange={() =>
                        setAsigSalones(toggleItem(asigSalones, s))
                      }
                    />
                    Salón {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAsigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAsignacion} disabled={savingAsig}>
              {savingAsig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Confirmar eliminar Asignación ──── */}
      <Dialog open={!!showDeleteAsig} onOpenChange={() => setShowDeleteAsig(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Asignación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar la asignación de{" "}
            <strong>
              {showDeleteAsig?.apellidos} {showDeleteAsig?.nombres}
            </strong>
            ?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAsig(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteAsignacion} disabled={savingAsig}>
              {savingAsig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Agregar/Editar Perfil ──── */}
      <Dialog open={showPerfDialog} onOpenChange={setShowPerfDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPerf ? "Editar Perfil" : "Agregar Perfil"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de perfil</Label>
              <Select value={perfTipo} onValueChange={setPerfTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estudiante">Estudiante</SelectItem>
                  <SelectItem value="Padre de familia">Padre de familia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {perfTipo === "Estudiante" ? (
              <>
                <div className="space-y-2">
                  <Label>Código estudiantil</Label>
                  <Input
                    type="number"
                    value={perfEstCodigo}
                    onChange={(e) => setPerfEstCodigo(e.target.value)}
                    placeholder="Código del estudiante"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={perfEstNombre} onChange={(e) => setPerfEstNombre(e.target.value)} placeholder="Nombre" />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellidos</Label>
                    <Input value={perfEstApellidos} onChange={(e) => setPerfEstApellidos(e.target.value)} placeholder="Apellidos" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Grado</Label>
                    <Select value={perfEstGrado} onValueChange={setPerfEstGrado}>
                      <SelectTrigger><SelectValue placeholder="Grado" /></SelectTrigger>
                      <SelectContent>
                        {GRADOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Salón</Label>
                    <Select value={perfEstSalon} onValueChange={setPerfEstSalon}>
                      <SelectTrigger><SelectValue placeholder="Salón" /></SelectTrigger>
                      <SelectContent>
                        {SALONES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Nombre del padre</Label>
                    <Input value={perfPadreNombre} onChange={(e) => setPerfPadreNombre(e.target.value)} placeholder="Nombre del padre" />
                  </div>
                  <div className="space-y-2">
                    <Label>Código padre</Label>
                    <Input value={perfPadreCodigo} onChange={(e) => setPerfPadreCodigo(e.target.value)} placeholder="Código (opcional)" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número de estudiantes</Label>
                  <Select value={perfNumEst} onValueChange={setPerfNumEst}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NUM_ESTUDIANTES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {renderHijoFields(1,
                  perfHijo1Codigo, setPerfHijo1Codigo,
                  perfHijo1Nombre, setPerfHijo1Nombre,
                  perfHijo1Apellidos, setPerfHijo1Apellidos,
                  perfHijo1Grado, setPerfHijo1Grado,
                  perfHijo1Salon, setPerfHijo1Salon,
                )}
                {parseInt(perfNumEst) >= 2 && renderHijoFields(2,
                  perfHijo2Codigo, setPerfHijo2Codigo,
                  perfHijo2Nombre, setPerfHijo2Nombre,
                  perfHijo2Apellidos, setPerfHijo2Apellidos,
                  perfHijo2Grado, setPerfHijo2Grado,
                  perfHijo2Salon, setPerfHijo2Salon,
                )}
                {parseInt(perfNumEst) >= 3 && renderHijoFields(3,
                  perfHijo3Codigo, setPerfHijo3Codigo,
                  perfHijo3Nombre, setPerfHijo3Nombre,
                  perfHijo3Apellidos, setPerfHijo3Apellidos,
                  perfHijo3Grado, setPerfHijo3Grado,
                  perfHijo3Salon, setPerfHijo3Salon,
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                value={perfContrasena}
                onChange={(e) => setPerfContrasena(e.target.value)}
                placeholder="Contraseña"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerfDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={savePerfil} disabled={savingPerf}>
              {savingPerf && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──── Dialog: Confirmar eliminar Perfil ──── */}
      <Dialog open={!!showDeletePerf} onOpenChange={() => setShowDeletePerf(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Perfil</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de eliminar el perfil de{" "}
            <strong>{showDeletePerf && getPerfilDisplayName(showDeletePerf)}</strong>
            {" "}({showDeletePerf?.perfil}, código: {showDeletePerf && getPerfilDisplayCode(showDeletePerf)})?
          </p>
          <p className="text-sm text-destructive font-medium">
            Este usuario ya no podrá iniciar sesión en la aplicación.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePerf(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deletePerfil} disabled={savingPerf}>
              {savingPerf && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PanelControl;
