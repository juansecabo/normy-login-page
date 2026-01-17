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

      // Obtener todas las secciones/cards para capturar individualmente
      const secciones = Array.from(elemento.querySelectorAll(':scope > div, :scope > .grid > div'));
      
      // Configuración del PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15; // Margen de 15mm
      const contentWidth = pageWidth - (margin * 2);
      const maxContentHeight = pageHeight - (margin * 2);
      
      let currentY = margin;
      let isFirstPage = true;

      // Capturar todo el contenido como una sola imagen primero para obtener el título
      const fullCanvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: elemento.scrollWidth,
        windowHeight: elemento.scrollHeight,
      });

      const fullImgData = fullCanvas.toDataURL("image/png");
      const fullImgHeight = (fullCanvas.height * contentWidth) / fullCanvas.width;

      // Si el contenido es pequeño, usar el método simple con márgenes
      if (fullImgHeight <= maxContentHeight * 1.5) {
        // Contenido cabe en 1-2 páginas, usar método simple con márgenes
        let heightLeft = fullImgHeight;
        let position = margin;

        pdf.addImage(fullImgData, "PNG", margin, position, contentWidth, fullImgHeight);
        heightLeft -= maxContentHeight;

        while (heightLeft > 0) {
          position = margin - (fullImgHeight - heightLeft);
          pdf.addPage();
          pdf.addImage(fullImgData, "PNG", margin, position, contentWidth, fullImgHeight);
          heightLeft -= maxContentHeight;
        }
      } else {
        // Contenido largo: capturar sección por sección para evitar cortes
        const gridContainers = elemento.querySelectorAll('.grid');
        const allElements: HTMLElement[] = [];
        
        // Recopilar elementos de nivel superior
        elemento.childNodes.forEach((child) => {
          if (child instanceof HTMLElement) {
            allElements.push(child);
          }
        });

        for (const section of allElements) {
          // Capturar cada sección
          const sectionCanvas = await html2canvas(section, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: section.scrollWidth,
          });

          const sectionImgData = sectionCanvas.toDataURL("image/png");
          const sectionImgHeight = (sectionCanvas.height * contentWidth) / sectionCanvas.width;

          // Verificar si la sección cabe en la página actual
          if (currentY + sectionImgHeight > pageHeight - margin && !isFirstPage) {
            // Nueva página
            pdf.addPage();
            currentY = margin;
          }

          // Si la sección es muy alta, dividirla
          if (sectionImgHeight > maxContentHeight) {
            let sectionHeightLeft = sectionImgHeight;
            let sectionPosition = 0;

            while (sectionHeightLeft > 0) {
              if (sectionPosition !== 0) {
                pdf.addPage();
                currentY = margin;
              }

              const drawHeight = Math.min(sectionHeightLeft, maxContentHeight);
              
              // Calcular la porción de la imagen a dibujar
              const sourceY = (sectionPosition / sectionImgHeight) * sectionCanvas.height;
              const sourceHeight = (drawHeight / sectionImgHeight) * sectionCanvas.height;

              // Crear canvas temporal para la porción
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = sectionCanvas.width;
              tempCanvas.height = sourceHeight;
              const tempCtx = tempCanvas.getContext('2d');
              if (tempCtx) {
                tempCtx.drawImage(
                  sectionCanvas,
                  0, sourceY, sectionCanvas.width, sourceHeight,
                  0, 0, sectionCanvas.width, sourceHeight
                );
                const tempImgData = tempCanvas.toDataURL("image/png");
                pdf.addImage(tempImgData, "PNG", margin, currentY, contentWidth, drawHeight);
              }

              sectionPosition += drawHeight;
              sectionHeightLeft -= drawHeight;
              currentY = margin + drawHeight;
            }
          } else {
            pdf.addImage(sectionImgData, "PNG", margin, currentY, contentWidth, sectionImgHeight);
            currentY += sectionImgHeight + 5; // 5mm de espacio entre secciones
          }

          isFirstPage = false;
        }
      }

      // Restaurar el botón de descarga
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }

      pdf.save(`${limpiarNombreArchivo(nombreArchivo)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      // Restaurar el botón en caso de error
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

      // Capturar secciones como imágenes para Word
      const imagenes: string[] = [];
      
      // Obtener el título primero
      const tituloElement = elemento.querySelector('h2');
      const titulo = tituloElement?.textContent || nombreArchivo;

      // Capturar cada sección principal como imagen
      const secciones = elemento.querySelectorAll(':scope > div');
      
      for (const seccion of Array.from(secciones)) {
        if (seccion instanceof HTMLElement && !seccion.hasAttribute('data-descarga-btn')) {
          const canvas = await html2canvas(seccion, {
            scale: 1.5,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            windowWidth: seccion.scrollWidth,
          });
          
          const imgData = canvas.toDataURL("image/png");
          imagenes.push(imgData);
        }
      }

      // Restaurar el botón de descarga
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }

      // Crear documento Word con imágenes
      const imagenesHtml = imagenes.map(img => 
        `<p style="text-align: center; margin: 20px 0; page-break-inside: avoid;">
          <img src="${img}" style="max-width: 100%; height: auto; border: 1px solid #e0e0e0; border-radius: 8px;" />
        </p>`
      ).join('\n');

      const htmlContent = `
        <!DOCTYPE html>
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset="utf-8">
          <title>${titulo}</title>
          <style>
            @page {
              margin: 2cm;
            }
            body { 
              font-family: Calibri, Arial, sans-serif; 
              font-size: 12pt; 
              padding: 20px;
              max-width: 100%;
            }
            h1 { 
              font-size: 20pt; 
              font-weight: bold; 
              text-align: center; 
              margin-bottom: 30px; 
              color: #1a1a1a; 
            }
            img {
              max-width: 100%;
              height: auto;
            }
            p {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <h1>${titulo}</h1>
          ${imagenesHtml}
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
      // Restaurar el botón en caso de error
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
          Descargar como Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
