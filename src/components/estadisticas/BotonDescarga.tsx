import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface BotonDescargaProps {
  contenidoRef: React.RefObject<HTMLDivElement>;
  nombreArchivo: string;
}

export const BotonDescarga = ({ contenidoRef, nombreArchivo }: BotonDescargaProps) => {
  const [descargando, setDescargando] = useState(false);

  const limpiarNombreArchivo = (nombre: string) => {
    return nombre
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50);
  };

  const descargarPDF = async () => {
    if (!contenidoRef.current) return;
    
    setDescargando(true);
    try {
      const elemento = contenidoRef.current;
      
      // Obtener el botón para ocultarlo
      const botonDescarga = elemento.querySelector('[data-descarga-btn]') as HTMLElement | null;
      if (botonDescarga) {
        botonDescarga.style.display = 'none';
      }

      // Clonar el elemento para captura
      const clone = elemento.cloneNode(true) as HTMLElement;
      clone.style.width = '1100px'; // Ancho más grande para nombres completos
      clone.style.padding = '30px';
      clone.style.backgroundColor = '#ffffff';
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.overflow = 'visible'; // Evitar cortes
      
      // Remover el botón del clon
      const btnInClone = clone.querySelector('[data-descarga-btn]');
      if (btnInClone) {
        btnInClone.remove();
      }
      
      document.body.appendChild(clone);

      // Esperar a que se rendericen los estilos
      await new Promise(resolve => setTimeout(resolve, 200));

      // Asegurar que todos los textos sean visibles en el clon
      const allElements = clone.querySelectorAll('*');
      allElements.forEach((el) => {
        if (el instanceof HTMLElement) {
          // Evitar overflow hidden que corta texto
          if (getComputedStyle(el).overflow === 'hidden') {
            el.style.overflow = 'visible';
          }
          // Evitar text-overflow ellipsis
          el.style.textOverflow = 'clip';
          el.style.whiteSpace = 'normal';
        }
      });

      // Capturar con alta calidad
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: clone.scrollWidth,
        height: clone.scrollHeight,
      });

      // Limpiar
      document.body.removeChild(clone);

      // Restaurar el botón
      if (botonDescarga) {
        botonDescarga.style.display = '';
      }

      // Configuración del PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 12;
      const contentWidth = pageWidth - (margin * 2);
      const maxContentHeight = pageHeight - (margin * 2);

      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      let pageNum = 0;

      while (heightLeft > 0) {
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Calcular porción de imagen
        const sourceY = position * (canvas.height / imgHeight);
        const sourceHeight = Math.min(
          maxContentHeight * (canvas.height / imgHeight),
          canvas.height - sourceY
        );
        const destHeight = sourceHeight * (imgHeight / canvas.height);

        // Canvas temporal para la porción
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

      pdf.save(`${limpiarNombreArchivo(nombreArchivo)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="gap-2"
      onClick={descargarPDF}
      disabled={descargando}
      data-descarga-btn
    >
      {descargando ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {descargando ? "Generando..." : "Descargar PDF"}
    </Button>
  );
};
