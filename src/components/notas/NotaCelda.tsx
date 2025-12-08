import { useState } from "react";
import { MoreVertical, MessageSquare, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NotaCeldaProps {
  nota: number | undefined;
  comentario: string | null;
  estaEditando: boolean;
  valorEditando: string;
  inputRef: (el: HTMLInputElement | null) => void;
  onCambioNota: (valor: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClick: () => void;
  onAbrirComentario: () => void;
  onEliminarComentario: () => void;
}

const NotaCelda = ({
  nota,
  comentario,
  estaEditando,
  valorEditando,
  inputRef,
  onCambioNota,
  onBlur,
  onKeyDown,
  onClick,
  onAbrirComentario,
  onEliminarComentario,
}: NotaCeldaProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <td className="border border-border p-1 text-center text-sm min-w-[120px] relative group">
      {estaEditando ? (
        <input
          ref={inputRef}
          type="text"
          className="w-full h-8 text-center border border-primary rounded px-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={valorEditando}
          onChange={(e) => onCambioNota(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus
          placeholder="0-5"
        />
      ) : (
        <div className="relative flex items-center justify-center h-8">
          <button
            className="flex-1 h-full hover:bg-muted/50 rounded cursor-pointer transition-colors flex items-center justify-center"
            onClick={onClick}
          >
            {nota !== undefined ? nota.toFixed(2) : <span className="text-muted-foreground">—</span>}
          </button>
          
          {/* Indicador de comentario */}
          {comentario && (
            <div className="absolute top-0 right-6 w-2 h-2 bg-amber-500 rounded-full" title={comentario} />
          )}
          
          {/* Menú de opciones (visible en hover) */}
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </td>
  );
};

export default NotaCelda;
