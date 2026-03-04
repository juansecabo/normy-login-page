import { useState } from "react";
import { Clock, Search, FileUp, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const descargarArchivo = async (url: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const nombre = decodeURIComponent(url.split("/").pop() || "documento");
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
};

const ListaComunicados = ({ comunicados, loading, showDocumentLink = false }: ListaComunicadosProps) => {
  const [busqueda, setBusqueda] = useState("");
  const [selectedItem, setSelectedItem] = useState<Comunicado | null>(null);

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
        <div key={c.id} className="border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setSelectedItem(c)}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatFecha(c.fecha)}
          </div>
          <p className="text-sm">
            <span className="font-medium text-foreground">De:</span>{" "}
            {c.remitente}
          </p>
          {showDocumentLink && c.archivo_url && (
            <div className="flex items-center gap-3">
              <a
                href={c.archivo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <FileUp className="w-4 h-4 shrink-0" />
                Ver documento
              </a>
              <button
                onClick={(e) => descargarArchivo(c.archivo_url!, e)}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
              >
                <Download className="w-4 h-4 shrink-0" />
                Descargar
              </button>
            </div>
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

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  De: {selectedItem.remitente}
                </DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatFecha(selectedItem.fecha)}
                </div>
              </DialogHeader>
              {showDocumentLink && selectedItem.archivo_url && (
                <div className="flex items-center gap-3">
                  <a
                    href={selectedItem.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileUp className="w-4 h-4 shrink-0" />
                    Ver documento
                  </a>
                  <button
                    onClick={(e) => descargarArchivo(selectedItem.archivo_url!, e)}
                    className="flex items-center gap-1 text-sm text-emerald-600 hover:underline"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    Descargar
                  </button>
                </div>
              )}
              {selectedItem.mensaje && (
                <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md">
                  {selectedItem.mensaje}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ListaComunicados;
