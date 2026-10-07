import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Downloads a DOM element (the invoice/quotation document) as an A4 PDF file.
 */
export const downloadDocumentAsPdf = async (
  documentTitle: string,
  elementId = 'printable-invoice-document'
): Promise<boolean> => {
  try {
    const targetElement =
      document.getElementById(elementId) ||
      (document.querySelector('.printable-document') as HTMLElement | null);

    if (!targetElement) {
      console.warn(`Target element #${elementId} not found, trying .printable-document`);
      return false;
    }

    // Save previous styles
    const prevShadow = targetElement.style.boxShadow;
    targetElement.style.boxShadow = 'none';

    // Render canvas with high resolution (scale 2 for crisp 300+ DPI equivalent)
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
    });

    targetElement.style.boxShadow = prevShadow;

    // A4 dimensions in mm: 210 x 297
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate image height maintaining proportional aspect ratio
    const imgWidth = pdfWidth;
    const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    if (imgHeight <= pdfHeight) {
      // Single page PDF
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    } else {
      // Multi-page document pagination
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    const cleanFilename = documentTitle
      ? documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
      : 'document';

    pdf.save(`${cleanFilename}.pdf`);
    return true;
  } catch (error) {
    console.error('Failed to generate PDF document:', error);
    // If html2canvas fails, fallback to printing
    triggerPrintModal(documentTitle, elementId);
    return false;
  }
};

/**
 * Opens browser print dialog for the target element cleanly.
 */
export const triggerPrintModal = (
  documentTitle: string,
  elementId = 'printable-invoice-document'
): void => {
  const originalTitle = window.document.title;
  if (documentTitle) {
    window.document.title = documentTitle;
  }

  const targetElement =
    document.getElementById(elementId) ||
    (document.querySelector('.printable-document') as HTMLElement | null);

  // Attempt iframe-isolated print first so that app navigation/sidebar doesn't leak into print
  if (targetElement) {
    try {
      const existingFrame = document.getElementById('temp-print-frame');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'temp-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';

      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        // Extract all existing style sheets
        const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((node) => node.outerHTML)
          .join('\n');

        frameDoc.write(`
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>${documentTitle || 'Invoice'}</title>
              ${headStyles}
              <style>
                @page { size: A4; margin: 10mm; }
                body {
                  margin: 0 !important;
                  padding: 10px !important;
                  background: white !important;
                  color: black !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .printable-document {
                  box-shadow: none !important;
                  border: none !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
              </style>
            </head>
            <body>
              <div class="printable-document">
                ${targetElement.outerHTML}
              </div>
            </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              iframe.remove();
              window.document.title = originalTitle;
            }, 1000);
          }
        }, 350);
        return;
      }
    } catch (e) {
      console.warn('Iframe print failed, falling back to window.print():', e);
    }
  }

  // Fallback to standard window.print()
  window.print();
  window.document.title = originalTitle;
};

export const printDocument = () => {
  triggerPrintModal('Invoice');
};

