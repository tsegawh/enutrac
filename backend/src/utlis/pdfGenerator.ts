// utils/pdfGenerator.ts
import PDFDocument from 'pdfkit';

export class PDFGenerator {
  /**
   * Generate invoice PDF buffer using the same logic as your user route
   */
  static async generateInvoiceBuffer(invoiceData: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const chunks: Buffer[] = [];
        const doc = new PDFDocument({ margin: 50 });
        
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Use the EXACT same logic from your user route
        this.generateInvoiceContent(doc, invoiceData);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * This is the EXACT same PDF generation logic from your user route
   */
  private static generateInvoiceContent(doc: PDFKit.PDFDocument, invoiceData: any) {
    // ----- PDF HEADER -----
    doc.fontSize(22).text('INVOICE', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice Number: ${invoiceData.invoiceNumber}`);
    doc.text(`Invoice Date: ${invoiceData.createdAt.toDateString()}`);
    doc.text(`Order ID: ${invoiceData.orderId}`);
    doc.moveDown();

    // ----- CUSTOMER INFO -----
    doc.fontSize(14).text('Billed To:');
    doc.fontSize(12)
      .text(`Name: ${invoiceData.customer.name}`)
      .text(`Email: ${invoiceData.customer.email}`)
      .moveDown();

    // ----- ORDER DETAILS -----
    doc.fontSize(14).text('Order Details:');
    doc.fontSize(12)
      .text(`Description: ${invoiceData.description || 'N/A'}`)
      .text(`Plan: ${invoiceData.plan ? invoiceData.plan.name : 'N/A'}`)
      .text(`Device Limit: ${invoiceData.plan?.deviceLimit || '-'}`)
      .text(`Duration: ${invoiceData.plan?.durationDays || '-'} days`)
      .moveDown();

    // ----- AMOUNT -----
    doc.fontSize(14).text('Payment Summary:');
    doc.fontSize(12)
      .text(`Amount: ${invoiceData.amount} ${invoiceData.currency}`)
      .text(`Status: ${invoiceData.status}`)
      .moveDown();

    doc.text('Thank you for your business!', { align: 'center' });
  }

  /**
   * Generate PDF and pipe to response (for your existing route)
   */
  static generateInvoiceToResponse(invoiceData: any, res: any) {
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    this.generateInvoiceContent(doc, invoiceData);
    doc.end();
  }
}

// Convenience exports
export const generatePDFBuffer = PDFGenerator.generateInvoiceBuffer;