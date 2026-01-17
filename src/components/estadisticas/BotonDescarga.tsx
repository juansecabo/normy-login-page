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

  // Obtener el botón de descarga para ocultarlo durante la captura
  const obtenerBotonDescarga = () => {
    return contenidoRef.current?.querySelector('[data-descarga-btn]') as HTMLElement | null;
  };

  const descargarPDF = async () => {
    if (!contenidoRef.current) return;
    
    setDescargando("pdf");
    try {
      const elemento = contenidoRef.current;
      const botonDescarga = obtenerBotonDescarga();
      
      // Ocultar el botón de descarga temporalmente
      if (botonDescarga) {
        botonDescarga.style.display = 'none';
      }

      // Clonar el elemento para aplicar estilos de impresión sin afectar la vista
      const clone = elemento.cloneNode(true) as HTMLElement;
      clone.style.width = '800px';
      clone.style.padding = '20px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      document.body.appendChild(clone);

      // Esperar a que los estilos se apliquen
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capturar con configuración mejorada para evitar cortes de texto
      const canvas = await html2canvas(clone, {
        scale: 3, // Mayor escala para mejor calidad de texto
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
        onclone: (clonedDoc) => {
          // Asegurar que todos los textos estén completamente renderizados
          const allText = clonedDoc.querySelectorAll('*');
          allText.forEach((el) => {
            if (el instanceof HTMLElement) {
              el.style.textRendering = 'geometricPrecision';
              (el.style as unknown as Record<string, string>).webkitFontSmoothing = 'antialiased';
            }
          });
        }
      });

      // Remover el clon
      document.body.removeChild(clone);

      // Configuración del PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      const maxContentHeight = pageHeight - (margin * 2);

      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 0;

      while (heightLeft > 0) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Calcular qué porción de la imagen mostrar
        const sourceY = position * (canvas.height / imgHeight);
        const sourceHeight = Math.min(
          maxContentHeight * (canvas.height / imgHeight),
          canvas.height - sourceY
        );
        const destHeight = sourceHeight * (imgHeight / canvas.height);

        // Crear canvas temporal para la porción
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCtx.drawImage(
            canvas,
            0, sourceY, canvas.width, sourceHeight,
            0, 0, canvas.width, sourceHeight
          );
          const tempImgData = tempCanvas.toDataURL("image/png", 1.0);
          pdf.addImage(tempImgData, "PNG", margin, margin, contentWidth, destHeight);
        }

        position += maxContentHeight;
        heightLeft -= maxContentHeight;
        pageNum++;
      }

      // Restaurar el botón de descarga
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }

      pdf.save(`${limpiarNombreArchivo(nombreArchivo)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      const botonDescarga = obtenerBotonDescarga();
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }
    } finally {
      setDescargando(null);
    }
  };

  const descargarWord = async () => {
    if (!contenidoRef.current) return;
    
    setDescargando("word");
    try {
      const elemento = contenidoRef.current;
      const botonDescarga = obtenerBotonDescarga();
      
      // Ocultar el botón de descarga temporalmente
      if (botonDescarga) {
        botonDescarga.style.display = 'none';
      }

      // Obtener el título
      const tituloElement = elemento.querySelector('h2');
      const titulo = tituloElement?.textContent || nombreArchivo;

      // Clonar el elemento para capturar sin el botón
      const clone = elemento.cloneNode(true) as HTMLElement;
      clone.style.width = '750px';
      clone.style.padding = '20px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      
      // Remover el botón del clon
      const btnInClone = clone.querySelector('[data-descarga-btn]');
      if (btnInClone) {
        btnInClone.remove();
      }
      
      document.body.appendChild(clone);
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capturar todo el contenido como una sola imagen
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });

      document.body.removeChild(clone);

      // Restaurar el botón de descarga
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }

      // Convertir a base64 sin el prefijo data:image/png;base64,
      const base64Data = canvas.toDataURL("image/png").split(',')[1];

      // Crear documento MHTML que Word puede leer correctamente con imágenes embebidas
      const boundary = "----=_NextPart_000_0000_01D00000.00000000";
      
      const mhtmlContent = `MIME-Version: 1.0
Content-Type: multipart/related; boundary="${boundary}"

--${boundary}
Content-Type: text/html; charset="utf-8"
Content-Transfer-Encoding: quoted-printable

<!DOCTYPE html>
<html xmlns:o=3D'urn:schemas-microsoft-com:office:office' xmlns:w=3D'urn:schemas-microsoft-com:office:word'>
<head>
<meta charset=3D"utf-8">
<title>${titulo}</title>
<style>
@page { margin: 2cm; }
body { font-family: Calibri, Arial, sans-serif; text-align: center; }
h1 { font-size: 20pt; font-weight: bold; margin-bottom: 30px; }
img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<h1>${titulo}</h1>
<img src=3D"cid:imagen001@lovable.dev" alt=3D"Contenido" />
</body>
</html>

--${boundary}
Content-Type: image/png
Content-Transfer-Encoding: base64
Content-ID: <imagen001@lovable.dev>

${base64Data.match(/.{1,76}/g)?.join('\n') || base64Data}

--${boundary}--`;

      const blob = new Blob([mhtmlContent], {
        type: 'message/rfc822'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${limpiarNombreArchivo(nombreArchivo)}.mht`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error al generar Word:", error);
      const botonDescarga = obtenerBotonDescarga();
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }
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
          data-descarga-btn
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
          Descargar como Word (.mht)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
