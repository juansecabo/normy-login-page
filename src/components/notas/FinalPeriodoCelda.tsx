import { useState } from "react";
import { MoreVertical, MessageSquare, Trash2, Send } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FinalPeriodoCeldaProps {
  notaFinal: number | null;
  comentario: string | null;
  onAbrirComentario: () => void;
  onEliminarComentario: () => void;
  onNotificarPadre?: () => void;
}

const FinalPeriodoCelda = ({
  notaFinal,
  comentario,
  onAbrirComentario,
  onEliminarComentario,
  onNotificarPadre,
}: FinalPeriodoCeldaProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <td className="border border-border p-1 text-center text-sm min-w-[100px] bg-primary/10 font-semibold relative group">
      <div className="relative flex items-center justify-center h-8">
        <span className={notaFinal !== null ? "" : "text-muted-foreground"}>
          {notaFinal !== null ? notaFinal.toFixed(2) : "—"}
        </span>
        
        {/* Indicador de comentario solo si hay nota */}
        {notaFinal !== null && comentario && (
          <div className="absolute top-0 right-6 w-2 h-2 bg-amber-500 rounded-full" title={comentario} />
        )}
        
        {/* Menú de opciones (visible en hover, solo cuando hay nota) */}
        {notaFinal !== null && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded transition-colors">
                  <MoreVertical className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background z-50">
                <DropdownMenuItem onClick={onAbrirComentario}>
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {comentario ? "Editar comentario" : "Agregar comentario"}
                </DropdownMenuItem>
                {comentario && (
                  <DropdownMenuItem 
                    onClick={onEliminarComentario}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar comentario
                  </DropdownMenuItem>
                )}
                {onNotificarPadre && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onNotificarPadre}>
                      <Send className="w-4 h-4 mr-2" />
                      Notificar a padre(s)
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </td>
  );
};

export default FinalPeriodoCelda;
