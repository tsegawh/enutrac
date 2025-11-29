import { sendEmail } from "./mailer";
import { generateInvoicePDF, generateInvoiceHTML } from "./invoiceTemplete";

export async function sendInvoiceToUser(invoiceData: any) {
  // Generate PDF buffer
  const pdfBuffer = await generateInvoicePDF(invoiceData);

  // Generate HTML email
  const htmlContent = generateInvoiceHTML(invoiceData);

  // Send email with both HTML and PDF attachment
  await sendEmail({
    //from: process.env.EMAIL_FROM || "noreply@traccarsubscriptions.com",
    to: invoiceData.customer.email,
    subject: `Invoice ${invoiceData.invoiceNumber}`,
    html: htmlContent,
    attachments: [
      {
        filename: `invoice_${invoiceData.invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
