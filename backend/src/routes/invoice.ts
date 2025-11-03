// routes/invoice.ts
import express, { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();
router.get('/:id/invoice', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

     const payment = await prisma.payment.findFirst({
      where: { orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, deviceLimit: true, durationDays: true } }
      }
    });


    if (!payment ) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    const { user, plan,  } = payment ;

    // --- Set PDF Headers ---
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${payment?.orderId || payment.id}.pdf`
    );

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // === Company Branding ===
    const logoPath = path.join(__dirname, '../assets/logo.png'); // place your logo in backend/assets
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }

    doc
      .fontSize(20)
      .fillColor('#333')
      .text('INVOICE', 400, 50, { align: 'right' })
      .fontSize(10)
      .text('Your Company Name', 400, 75, { align: 'right' })
      .text('123 Main Street, Addis Ababa', 400, 90, { align: 'right' })
      .text('support@example.com | +251-900-000000', 400, 105, { align: 'right' });

    doc.moveDown(4);

    // === User & Invoice Info ===
    doc.fontSize(12).fillColor('#000').text('Billed To:', 50, 160);
    doc.fontSize(10).text(`${user.name}`, 50, 175);
    doc.text(`${user.email}`, 50, 190);

    doc.fontSize(12).text('Invoice Details:', 300, 160);
    doc.fontSize(10)
      .text(`Invoice #: ${payment?.orderId || payment.id}`, 300, 175)
      .text(`Date: ${moment(payment?.createdAt || plan?.durationDays).format('MMM D, YYYY')}`, 300, 190)
      .text(`Due Date: ${moment(plan?.durationDays).format('MMM D, YYYY')}`, 300, 205);

    doc.moveDown(4);

    // === Table Header ===
    const tableTop = 250;
    doc.fontSize(12).fillColor('#333').text('Description', 50, tableTop);
    doc.text('Qty', 300, tableTop, { width: 90, align: 'right' });
    doc.text('Unit Price', 350, tableTop, { width: 90, align: 'right' });
    doc.text('Total', 450, tableTop, { width: 90, align: 'right' });

    // Draw a line under header
    doc.moveTo(50, tableTop + 20).lineTo(550, tableTop + 20).strokeColor('#cccccc').stroke();

    // === Table Row ===
    const rowY = tableTop + 35;
    doc.fontSize(10).fillColor('#000');
    doc.text(`${plan?.name} Subscription`, 50, rowY);
    doc.text('1', 300, rowY, { width: 90, align: 'right' });
    doc.text(`${payment?.amount.toFixed(2)} ${payment?.currency}`, 350, rowY, { width: 90, align: 'right' });
    doc.text(`${payment?.amount.toFixed(2)} ${payment?.currency}`, 450, rowY, { width: 90, align: 'right' });

    // Draw line under row
    doc.moveTo(50, rowY + 20).lineTo(550, rowY + 20).strokeColor('#cccccc').stroke();

    // === Total ===
    const totalY = rowY + 40;
    doc.fontSize(12).fillColor('#333').text('Total:', 350, totalY, { width: 90, align: 'right' });
    doc.fontSize(12).fillColor('#000').text(`${payment?.amount.toFixed(2)} ${payment?.currency}`, 450, totalY, {
      width: 90,
      align: 'right',
    });

    // === Footer ===
    doc.moveDown(6);
    doc
      .fontSize(10)
      .fillColor('#666')
      .text('Thank you for your business!', { align: 'center' })
      .moveDown(0.5)
      .text('If you have any questions about this invoice, please contact us at support@example.com', {
        align: 'center',
      });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error generating invoice' });
  }
});

export default router;
