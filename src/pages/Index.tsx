import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import escudoImg from "@/assets/escudo.webp";
import normyImg from "@/assets/normy-placeholder.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { saveSession } from "@/hooks/useSession";

const Index = () => {
  const [contrasena, setContrasena] = useState("");
  const [showContrasena, setShowContrasena] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input = contrasena.trim();
    if (!input) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu contraseña",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let data = null;

      // 1. Si es numérico, buscar por código (usuario sin contraseña personalizada)
      if (/^\d+$/.test(input)) {
        const { data: porCodigo, error } = await supabase
          .from('Internos')
          .select('*')
          .eq('codigo', parseInt(input))
          .is('contrasena', null)
          .maybeSingle();

        if (error) {
          toast({ title: "Error", description: "Error al verificar", variant: "destructive" });
          setLoading(false);
          return;
        }
        data = porCodigo;
      }

      // 2. Si no encontró por código, buscar por contraseña personalizada
      if (!data) {
        const { data: porContrasena, error } = await supabase
          .from('Internos')
          .select('*')
          .eq('contrasena', input)
          .maybeSingle();

        if (error) {
          toast({ title: "Error", description: "Error al verificar", variant: "destructive" });
          setLoading(false);
          return;
        }
        data = porContrasena;
      }

      if (!data) {
        toast({
          title: "Error",
          description: "Contraseña incorrecta",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Verificar si tiene permisos (Profesor, Rector o Coordinador)
      const cargosPermitidos = ['Profesor(a)', 'Rector', 'Coordinador(a)'];
      if (!cargosPermitidos.includes(data.cargo)) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos de acceso",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Login exitoso - guardar sesión con cargo
      saveSession(
        String(data.codigo),
        data.nombres || "",
        data.apellidos || "",
        data.cargo || ""
      );

      toast({
        title: "Bienvenido(a)",
        description: `${data.nombres} ${data.apellidos}`,
      });

      // Redirigir según el cargo
      if (data.cargo === 'Rector' || data.cargo === 'Coordinador(a)') {
        navigate("/dashboard-rector");
      } else {
        navigate("/dashboard");
      }
    } catch {
      toast({
        title: "Error",
        description: "Ocurrió un error inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Columna Izquierda - Imagen de Normy */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-secondary/50">
        <div className="animate-scale-in">
          <img
            src={normyImg}
            alt="Normy - Mascota de Notas Normy"
            className="w-64 h-64 lg:w-80 lg:h-80 object-cover rounded-full shadow-soft border-4 border-primary/20"
          />
        </div>
      </div>

      {/* Columna Derecha - Formulario de Login */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Escudo */}
          <div className="flex justify-center">
            <img
              src={escudoImg}
              alt="Escudo Escuela Normal Superior de Corozal"
              className="w-28 h-auto object-contain"
            />
          </div>

          {/* Títulos */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
              Notas Normy
            </h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Escuela Normal Superior de Corozal
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="contrasena"
                className="block text-sm font-medium text-foreground"
              >
                Digita tu contraseña
              </label>
              <div className="relative">
                <Input
                  id="contrasena"
                  type={showContrasena ? "text" : "password"}
                  placeholder="Contraseña"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full h-12 text-base border-input bg-background focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowContrasena(!showContrasena)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showContrasena ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-button hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </Button>
          </form>

          {/* Footer discreto */}
          <p className="text-center text-xs text-muted-foreground pt-4">
            Sistema de gestión de calificaciones
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
