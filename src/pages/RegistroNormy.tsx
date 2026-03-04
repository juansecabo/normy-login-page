import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getSession, isProfesor, isRectorOrCoordinador, isAdmin } from "@/hooks/useSession";
import HeaderNormy from "@/components/HeaderNormy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADOS = [
  "Prejardín", "Jardín", "Transición",
  "Primero", "Segundo", "Tercero", "Cuarto", "Quinto",
  "Sexto", "Séptimo", "Octavo", "Noveno",
  "Décimo", "Undécimo",
];

const SALONES = ["1", "2", "3", "4", "5", "6"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Estudiante {
  codigo_estudiantil: number;
  nombre_estudiante: string;
  apellidos_estudiante: string;
  grado_estudiante: string;
  salon_estudiante: string;
}

interface Perfil {
  perfil: string;
  estudiante_codigo: number | null;
  padre_estudiante1_codigo: number | null;
  padre_estudiante2_codigo: number | null;
  padre_estudiante3_codigo: number | null;
  padre_nombre: string | null;
  numero_de_telefono: string | null;
}

interface ParentInfo {
  padre_nombre: string;
  telefono: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

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

// ─── Component ────────────────────────────────────────────────────────────────

const RegistroNormy = () => {
  const navigate = useNavigate();

  // Auth
  useEffect(() => {
    const session = getSession();
    if (!session.codigo) { navigate("/"); return; }
    if (!isProfesor() && !isRectorOrCoordinador()) { navigate("/dashboard"); return; }
  }, [navigate]);

  const backLink = isAdmin() ? "/dashboard-admin" : isRectorOrCoordinador() ? "/dashboard-rector" : "/dashboard";

  // State
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradoFilter, setGradoFilter] = useState("todos");
  const [salonFilter, setSalonFilter] = useState("todos");
  const [search, setSearch] = useState("");

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [est, perf] = await Promise.all([
        fetchAllPages<Estudiante>((from, to) =>
          supabase
            .from("Estudiantes")
            .select("codigo_estudiantil, nombre_estudiante, apellidos_estudiante, grado_estudiante, salon_estudiante")
            .order("apellidos_estudiante")
            .order("nombre_estudiante")
            .range(from, to)
        ),
        fetchAllPages<Perfil>((from, to) =>
          supabase
            .from("Perfiles_Generales")
            .select("perfil, estudiante_codigo, padre_estudiante1_codigo, padre_estudiante2_codigo, padre_estudiante3_codigo, padre_nombre, numero_de_telefono")
            .range(from, to)
        ),
      ]);
      setEstudiantes(est);
      setPerfiles(perf);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Build lookup sets
  const estudianteCodigosRegistrados = useMemo(() => {
    const set = new Set<number>();
    for (const p of perfiles) {
      if (p.perfil === "Estudiante" && p.estudiante_codigo) {
        set.add(p.estudiante_codigo);
      }
    }
    return set;
  }, [perfiles]);

  const padreInfoPorCodigo = useMemo(() => {
    const map = new Map<number, ParentInfo[]>();
    for (const p of perfiles) {
      if (p.perfil === "Padre de familia") {
        const info: ParentInfo = {
          padre_nombre: p.padre_nombre || "Sin nombre",
          telefono: p.numero_de_telefono || "Sin teléfono",
        };
        for (const cod of [p.padre_estudiante1_codigo, p.padre_estudiante2_codigo, p.padre_estudiante3_codigo]) {
          if (cod) {
            const arr = map.get(cod) || [];
            arr.push(info);
            map.set(cod, arr);
          }
        }
      }
    }
    return map;
  }, [perfiles]);

  // Filtered students
  const filtered = useMemo(() => {
    return estudiantes.filter((e) => {
      if (gradoFilter !== "todos" && e.grado_estudiante !== gradoFilter) return false;
      if (salonFilter !== "todos" && e.salon_estudiante !== salonFilter) return false;
      if (search) {
        const hay = normalize(`${e.apellidos_estudiante} ${e.nombre_estudiante} ${e.codigo_estudiantil}`);
        if (!hay.includes(normalize(search))) return false;
      }
      return true;
    });
  }, [estudiantes, gradoFilter, salonFilter, search]);

  // Stats
  const estRegistrados = useMemo(
    () => filtered.filter((e) => estudianteCodigosRegistrados.has(e.codigo_estudiantil)).length,
    [filtered, estudianteCodigosRegistrados]
  );
  const padRegistrados = useMemo(
    () => filtered.filter((e) => padreInfoPorCodigo.has(e.codigo_estudiantil)).length,
    [filtered, padreInfoPorCodigo]
  );

  const [selectedParents, setSelectedParents] = useState<{ padres: ParentInfo[]; estudiante: string } | null>(null);

  const total = filtered.length;
  const estPct = total > 0 ? Math.round((estRegistrados / total) * 100) : 0;
  const padPct = total > 0 ? Math.round((padRegistrados / total) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <HeaderNormy backLink={backLink} />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HeaderNormy backLink={backLink} />

      <main className="flex-1 container mx-auto p-4 lg:p-8">
        <div className="bg-card rounded-lg shadow-soft p-4 mb-6 max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => navigate(backLink)} className="text-primary hover:underline">Inicio</button>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="text-foreground font-medium">Registro en Normy</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground text-center mb-6">
          Registro en Normy
        </h2>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-4xl mx-auto">
          <Select value={gradoFilter} onValueChange={(v) => { setGradoFilter(v); setSalonFilter("todos"); }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Grado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {GRADOS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={salonFilter} onValueChange={setSalonFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Salón" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los salones</SelectItem>
              {SALONES.map((s) => (
                <SelectItem key={s} value={s}>Salón {s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="estudiantes" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="estudiantes">Estudiantes</TabsTrigger>
            <TabsTrigger value="padres">Padres</TabsTrigger>
          </TabsList>

          {/* Tab Estudiantes */}
          <TabsContent value="estudiantes">
            <div className="bg-card rounded-lg shadow-soft p-4 lg:p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {estRegistrados} de {total} registrados ({estPct}%)
                  </span>
                </div>
                <Progress value={estPct} className="h-3" />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Grado</TableHead>
                      <TableHead>Salón</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No se encontraron estudiantes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((e, i) => {
                        const registrado = estudianteCodigosRegistrados.has(e.codigo_estudiantil);
                        return (
                          <TableRow key={e.codigo_estudiantil}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">
                              {e.apellidos_estudiante}, {e.nombre_estudiante}
                            </TableCell>
                            <TableCell>{e.codigo_estudiantil}</TableCell>
                            <TableCell>{e.grado_estudiante}</TableCell>
                            <TableCell>{e.salon_estudiante}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={registrado
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                              }>
                                {registrado ? "Registrado" : "No registrado"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Tab Padres */}
          <TabsContent value="padres">
            <div className="bg-card rounded-lg shadow-soft p-4 lg:p-6">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {padRegistrados} de {total} con padre registrado ({padPct}%)
                  </span>
                </div>
                <Progress value={padPct} className="h-3" />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Nombre del estudiante</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Grado</TableHead>
                      <TableHead>Salón</TableHead>
                      <TableHead className="text-center">Padre en Normy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No se encontraron estudiantes
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((e, i) => {
                        const parentInfo = padreInfoPorCodigo.get(e.codigo_estudiantil);
                        return (
                          <TableRow key={e.codigo_estudiantil}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">
                              {e.apellidos_estudiante}, {e.nombre_estudiante}
                            </TableCell>
                            <TableCell>{e.codigo_estudiantil}</TableCell>
                            <TableCell>{e.grado_estudiante}</TableCell>
                            <TableCell>{e.salon_estudiante}</TableCell>
                            <TableCell className="text-center relative">
                              <Badge className={parentInfo
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                              }>
                                {parentInfo ? "Registrado" : "No registrado"}
                              </Badge>
                              {parentInfo && (
                                <button
                                  onClick={() => setSelectedParents({
                                    padres: parentInfo,
                                    estudiante: `${e.apellidos_estudiante}, ${e.nombre_estudiante}`,
                                  })}
                                  className="absolute ml-2 text-xs text-primary hover:underline font-medium whitespace-nowrap"
                                >
                                  Ver info
                                </button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Parent info popup */}
        {selectedParents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedParents(null)} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Info del padre</h3>
              <p className="text-sm text-gray-500 mb-4">{selectedParents.estudiante}</p>
              <div className="space-y-4">
                {selectedParents.padres.map((p, i) => (
                  <div key={i} className="space-y-1 text-sm text-gray-700">
                    {selectedParents.padres.length > 1 && (
                      <p className="font-semibold text-gray-900">Padre {i + 1}</p>
                    )}
                    <p><span className="font-medium">Nombre:</span> {p.padre_nombre}</p>
                    <p><span className="font-medium">Teléfono:</span> {p.telefono}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSelectedParents(null)}
                className="mt-5 w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RegistroNormy;
