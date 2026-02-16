import { useState } from "react";
import { Clock, Search, FileUp } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Comunicado {
  id: number;
  remitente: string;
  destinatarios: string;
  mensaje: string;
  fecha: string;
  archivo_url?: string | null;
}

interface ListaComunicadosProps {
  comunicados: Comunicado[];
  loading: boolean;
  showDocumentLink?: boolean;
}

const formatFecha = (fecha: string) => {
  const d = new Date(fecha);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ListaComunicados = ({ comunicados, loading, showDocumentLink = false }: ListaComunicadosProps) => {
  const [busqueda, setBusqueda] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (comunicados.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No hay {showDocumentLink ? 'documentos' : 'comunicados'} disponibles.
      </p>
    );
  }

  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filtrados = comunicados.filter((c) => {
    if (!busqueda.trim()) return true;
    const term = normalize(busqueda);
    return normalize(c.remitente || '').includes(term) || normalize(c.mensaje || '').includes(term);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por remitente o contenido..."
          className="pl-9"
        />
      </div>

      {filtrados.map((c) => (
        <div key={c.id} className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatFecha(c.fecha)}
          </div>
          <p className="text-sm">
            <span className="font-medium text-foreground">De:</span>{" "}
            {c.remitente}
          </p>
          {showDocumentLink && c.archivo_url && (
            <a
              href={c.archivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileUp className="w-4 h-4 shrink-0" />
              Ver documento
            </a>
          )}
          {c.mensaje && (
            <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
              {c.mensaje}
            </p>
          )}
        </div>
      ))}

      {filtrados.length === 0 && busqueda.trim() && (
        <p className="text-center text-muted-foreground py-4 text-sm">
          No se encontraron resultados para "{busqueda}"
        </p>
      )}
    </div>
  );
};

export default ListaComunicados;
