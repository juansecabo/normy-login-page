import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, File, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface BotonDescargaProps {
  contenidoRef: React.RefObject<HTMLDivElement>;
  nombreArchivo: string;
}

export const BotonDescarga = ({ contenidoRef, nombreArchivo }: BotonDescargaProps) => {
  const [descargando, setDescargando] = useState<"pdf" | "word" | null>(null);

  const limpiarNombreArchivo = (nombre: string) => {
    return nombre
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
  };

  const descargarPDF = async () => {
    if (!contenidoRef.current) return;
    
    setDescargando("pdf");
    try {
      const elemento = contenidoRef.current;
      
      // Capturar el contenido como imagen
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: elemento.scrollWidth,
        windowHeight: elemento.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      // Primera página
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${limpiarNombreArchivo(nombreArchivo)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
    } finally {
      setDescargando(null);
    }
  };

  const descargarWord = async () => {
    if (!contenidoRef.current) return;
    
    setDescargando("word");
    try {
      const elemento = contenidoRef.current;
      
      // Crear HTML con estilos para Word
      const estilosWord = `
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; padding: 20px; }
          h2 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20px; color: #1a1a1a; }
          h3, h4 { font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 10px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .card { border: 1px solid #e0e0e0; padding: 15px; margin: 10px 0; }
        </style>
      `;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${nombreArchivo}</title>
          ${estilosWord}
        </head>
        <body>
          ${elemento.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', htmlContent], {
        type: 'application/msword'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${limpiarNombreArchivo(nombreArchivo)}.doc`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar Word:", error);
    } finally {
      setDescargando(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          disabled={descargando !== null}
        >
          {descargando ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {descargando === "pdf" ? "Generando PDF..." : 
           descargando === "word" ? "Generando Word..." : 
           "Descargar"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={descargarPDF} disabled={descargando !== null}>
          <File className="w-4 h-4 mr-2 text-red-500" />
          Descargar como PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={descargarWord} disabled={descargando !== null}>
          <FileText className="w-4 h-4 mr-2 text-blue-500" />
          Descargar como Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
