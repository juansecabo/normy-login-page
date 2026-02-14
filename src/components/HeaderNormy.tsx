import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import escudoImg from "@/assets/escudo.webp";
import { clearSession } from "@/hooks/useSession";
import CambiarContrasenaModal from "@/components/CambiarContrasenaModal";

interface HeaderNormyProps {
  backLink: string;
}

const HeaderNormy = ({ backLink }: HeaderNormyProps) => {
  const navigate = useNavigate();
  const [showCambiarContrasena, setShowCambiarContrasena] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate("/");
  };

  return (
    <>
      <header className="bg-primary text-primary-foreground py-2 md:py-3 px-3 md:px-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <Link to={backLink} className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity cursor-pointer">
            <img
              src={escudoImg}
              alt="Escudo"
              className="w-10 h-10 md:w-16 md:h-16 object-contain -my-1 md:-my-2"
            />
            <h1 className="text-base md:text-xl font-bold">Notas Normy</h1>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCambiarContrasena(true)}
              className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <span className="hidden sm:inline">Cambiar contraseña</span>
              <span className="sm:hidden">Contraseña</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="font-medium text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <CambiarContrasenaModal
        open={showCambiarContrasena}
        onOpenChange={setShowCambiarContrasena}
      />
    </>
  );
};

export default HeaderNormy;
