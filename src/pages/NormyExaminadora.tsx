import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import escudoImg from "@/assets/escudo.png";
import normyImg from "@/assets/normy-examinadora.png";
import { getSession, clearSession } from "@/hooks/useSession";
import { Upload, FileText, X } from "lucide-react";

interface Asignacion {
  "Materia(s)": string[];
  "Grado(s)": string[];
  "Salon(es)": string[];
}

const NormyExaminadora = () => {
  const navigate = useNavigate();
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  
  // Form state
  const [tipoActividad, setTipoActividad] = useState<string>("");
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<string>("");
  const [gradoSeleccionado, setGradoSeleccionado] = useState<string>("");
  const [salonSeleccionado, setSalonSeleccionado] = useState<string>("");
  const [tema, setTema] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [preguntasMultiple, setPreguntasMultiple] = useState<number>(5);
  const [preguntasAbiertas, setPreguntasAbiertas] = useState<number>(0);
  
  // Data from DB
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [materias, setMaterias] = useState<string[]>([]);
  const [grados, setGrados] = useState<string[]>([]);
  const [salones, setSalones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    
    if (!session.codigo) {
      navigate("/");
      return;
    }

    setNombres(session.nombres || "");
    setApellidos(session.apellidos || "");

    const fetchAsignaciones = async () => {
      try {
        const { data: profesor, error: profesorError } = await supabase
          .from('Internos')
          .select('id')
          .eq('codigo', parseInt(session.codigo!))
          .single();

        if (profesorError || !profesor) {
          setLoading(false);
          return;
        }

        const { data: asignacionesData, error: asignacionError } = await supabase
          .from('Asignación Profesores')
          .select('"Materia(s)", "Grado(s)", "Salon(es)"')
          .eq('id', profesor.id);

        if (asignacionError || !asignacionesData) {
          setLoading(false);
          return;
        }

        setAsignaciones(asignacionesData as Asignacion[]);
        
        // Extract unique materias
        const todasMaterias = asignacionesData
          ?.flatMap(a => a['Materia(s)'] || [])
          .flat() || [];
        const materiasUnicas = [...new Set(todasMaterias)].sort((a, b) => a.localeCompare(b, 'es'));
        setMaterias(materiasUnicas);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAsignaciones();
  }, [navigate]);

  // Update grados when materia changes
  useEffect(() => {
    if (!materiaSeleccionada) {
      setGrados([]);
      setGradoSeleccionado("");
      return;
    }

    const gradosParaMateria = asignaciones
      .filter(a => a['Materia(s)']?.includes(materiaSeleccionada))
      .flatMap(a => a['Grado(s)'] || [])
      .flat();
    
    const gradosUnicos = [...new Set(gradosParaMateria)].sort((a, b) => a.localeCompare(b, 'es'));
    setGrados(gradosUnicos);
    setGradoSeleccionado("");
    setSalonSeleccionado("");
  }, [materiaSeleccionada, asignaciones]);

  // Update salones when grado changes
  useEffect(() => {
    if (!gradoSeleccionado || !materiaSeleccionada) {
      setSalones([]);
      setSalonSeleccionado("");
      return;
    }

    const salonesParaGrado = asignaciones
      .filter(a => 
        a['Materia(s)']?.includes(materiaSeleccionada) && 
        a['Grado(s)']?.includes(gradoSeleccionado)
      )
      .flatMap(a => a['Salon(es)'] || [])
      .flat();
    
    const salonesUnicos = [...new Set(salonesParaGrado)].sort((a, b) => a.localeCompare(b, 'es'));
    setSalones(salonesUnicos);
    setSalonSeleccionado("");
  }, [gradoSeleccionado, materiaSeleccionada, asignaciones]);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setArchivos(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCrear = () => {
    // TODO: Implement creation logic
    console.log({
      tipoActividad,
      materiaSeleccionada,
      gradoSeleccionado,
      salonSeleccionado,
      tema,
      archivos,
      preguntasMultiple,
      preguntasAbiertas
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-bold">Notas Normy</h1>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            className="font-medium"
          >
            Cerrar sesión
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-8">
        {/* Back button - at top */}
        <div className="max-w-3xl mx-auto mb-4">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            ← Volver al Dashboard
          </Button>
        </div>

        {/* Title Section with Normy in background */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-3xl mx-auto text-center mb-8 relative overflow-hidden">
          {/* Normy in background */}
          <img
            src={normyImg}
            alt="Normy Examinadora"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-auto object-contain opacity-30 pointer-events-none"
          />
          <div className="relative z-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
              Normy Examinadora
            </h2>
            <p className="text-muted-foreground">
              Crea tus actividades académicas
            </p>
            <p className="text-lg text-primary font-semibold mt-4">
              {nombres} {apellidos}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-card rounded-lg shadow-soft p-8 max-w-3xl mx-auto">
          {loading ? (
            <div className="text-center text-muted-foreground">
              Cargando...
            </div>
          ) : (
            <div className="space-y-6">
              {/* 1. Tipo de actividad */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">1. Quiero crear:</Label>
                <Select value={tipoActividad} onValueChange={setTipoActividad}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecciona el tipo de actividad" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="evaluacion">Evaluación</SelectItem>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Materia */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">2. Materia:</Label>
                <Select value={materiaSeleccionada} onValueChange={setMateriaSeleccionada}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Selecciona la materia" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {materias.map((materia) => (
                      <SelectItem key={materia} value={materia}>
                        {materia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Grado */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">3. Grado:</Label>
                <Select 
                  value={gradoSeleccionado} 
                  onValueChange={setGradoSeleccionado}
                  disabled={!materiaSeleccionada}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={materiaSeleccionada ? "Selecciona el grado" : "Primero selecciona una materia"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {grados.map((grado) => (
                      <SelectItem key={grado} value={grado}>
                        {grado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Salón (opcional) */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">4. Salón (opcional):</Label>
                <Select 
                  value={salonSeleccionado} 
                  onValueChange={setSalonSeleccionado}
                  disabled={!gradoSeleccionado}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={gradoSeleccionado ? "Selecciona el salón" : "Primero selecciona un grado"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {salones.map((salon) => (
                      <SelectItem key={salon} value={salon}>
                        {salon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 5. Tema */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">5. Tema:</Label>
                <Input
                  type="text"
                  placeholder="Escribe el tema de la actividad"
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* 6. Archivos */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">6. Archivos de referencia:</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Haz clic para subir archivos
                    </span>
                  </label>
                </div>
                {archivos.length > 0 && (
                  <div className="space-y-2 mt-4">
                    {archivos.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-muted p-3 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <span className="text-sm truncate max-w-xs">{file.name}</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. Número de preguntas */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">7. Número de preguntas:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Selección múltiple:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={preguntasMultiple}
                      onChange={(e) => setPreguntasMultiple(parseInt(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Preguntas abiertas:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={preguntasAbiertas}
                      onChange={(e) => setPreguntasAbiertas(parseInt(e.target.value) || 0)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Crear */}
              <Button
                onClick={handleCrear}
                className="w-full bg-gradient-to-r from-primary to-green-600 hover:from-green-600 hover:to-primary text-white font-semibold py-6 text-lg"
                disabled={!tipoActividad || !materiaSeleccionada || !gradoSeleccionado || !tema}
              >
                Crear
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NormyExaminadora;
