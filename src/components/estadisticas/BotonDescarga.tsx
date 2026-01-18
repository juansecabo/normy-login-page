import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface BotonDescargaProps {
  contentRef: React.RefObject<HTMLDivElement>;
  nombreArchivo?: string;
}

const BotonDescarga = ({ contentRef, nombreArchivo = "estadisticas" }: BotonDescargaProps) => {
  const handleDownload = async () => {
    if (!contentRef.current) return;

    try {
      // Clone the content for capture to avoid modifying the original
      const originalContent = contentRef.current;
      const clonedContent = originalContent.cloneNode(true) as HTMLElement;
      
      // Style the clone for optimal capture
      clonedContent.style.position = 'absolute';
      clonedContent.style.left = '-9999px';
      clonedContent.style.top = '0';
      clonedContent.style.width = '1100px';
      clonedContent.style.padding = '20px';
      clonedContent.style.backgroundColor = '#f8fafc';
      clonedContent.style.overflow = 'visible';
      
      // Apply text rendering improvements to all elements
      const allElements = clonedContent.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.textRendering = 'geometricPrecision';
        htmlEl.style.webkitFontSmoothing = 'antialiased';
        htmlEl.style.overflow = 'visible';
        htmlEl.style.textOverflow = 'clip';
        htmlEl.style.whiteSpace = 'normal';
        htmlEl.style.wordBreak = 'break-word';
      });
      
      // Remove any download buttons from the clone
      const buttons = clonedContent.querySelectorAll('button');
      buttons.forEach(btn => btn.remove());
      
      document.body.appendChild(clonedContent);
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(clonedContent, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#f8fafc',
        logging: false,
        windowWidth: 1100,
      });
      
      // Remove the clone
      document.body.removeChild(clonedContent);
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'letter');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableWidth = pageWidth - (margin * 2);
      const usableHeight = pageHeight - (margin * 2);
      
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= usableHeight) {
        pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
      } else {
        let remainingHeight = imgHeight;
        let sourceY = 0;
        let pageNum = 0;
        
        while (remainingHeight > 0) {
          if (pageNum > 0) {
            pdf.addPage();
          }
          
          const sliceHeight = Math.min(usableHeight, remainingHeight);
          const sourceHeight = (sliceHeight / imgHeight) * canvas.height;
          
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
            
            const sliceData = tempCanvas.toDataURL('image/png');
            pdf.addImage(sliceData, 'PNG', margin, margin, imgWidth, sliceHeight);
          }
          
          sourceY += sourceHeight;
          remainingHeight -= sliceHeight;
          pageNum++;
        }
      }
      
      pdf.save(`${nombreArchivo}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      Descargar
    </Button>
  );
};

export default BotonDescarga;
