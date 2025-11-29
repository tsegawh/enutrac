import PDFDocument from "pdfkit";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
    case 'SUCCESS':
    case 'PAID':
      return '#10b981';
    case 'PENDING':
    case 'PROCESSING':
      return '#f59e0b';
    case 'FAILED':
    case 'CANCELLED':
    case 'REFUNDED':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

export async function generateInvoicePDF(invoiceData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4',
        info: {
          Title: `Invoice ${invoiceData.invoiceNumber}`,
          Author: process.env.APP_NAME || 'Your Company',
          Subject: 'Invoice',
          Creator: process.env.APP_NAME || 'Your Company',
          CreationDate: new Date()
        }
      });
      
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // -------- HEADER SECTION --------
      const headerY = 50;
      const rightColumnX = 300;
      
      // Company logo and name
      let currentY = headerY;
      if (process.env.APP_LOGO_URL) {
         try {
        // Use relative path from your project root
        const logoPath = path.join(process.cwd(), 'assets', 'logo.png');
         if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, currentY, { width: 60, height: 60 });
          currentY += 70;
          console.log('✅ Logo loaded successfully from:', logoPath);
        } else {
          console.warn('⚠️ Logo file not found at:', logoPath);
          currentY += 10;
        }
        } catch (error) {
          console.warn('Failed to load logo image, proceeding without logo');
          currentY += 10;
        }
      }
      
      // Company name
      doc.fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(process.env.APP_NAME || "Your Company", 50, currentY);
      
      // Invoice title aligned right
      doc.fontSize(24)
        .fillColor('#1a56db')
        .text("INVOICE", 0, headerY, { align: "right" });

      currentY += 40;

      // -------- INVOICE & CUSTOMER INFO --------
      // Invoice details (left side)
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('INVOICE DETAILS:', 50, currentY)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(`Invoice #: ${invoiceData.invoiceNumber}`, 50, currentY + 15)
        .text(`Date: ${new Date(invoiceData.createdAt).toLocaleDateString()}`, 50, currentY + 30)
        .text(`Order ID: ${invoiceData.orderId}`, 50, currentY + 45);

      // Customer details (right side)
      doc.font('Helvetica')
        .fillColor('#4a5568')
        .text('BILLED TO:', rightColumnX, currentY)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(invoiceData.customer?.name || 'N/A', rightColumnX, currentY + 15)
        .font('Helvetica')
        .fillColor('#718096')
        .text(invoiceData.customer?.email || 'N/A', rightColumnX, currentY + 30);

      currentY = Math.max(currentY + 70, doc.y);

      // -------- ORDER DETAILS SECTION --------
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text('ORDER DETAILS:', 50, currentY);

      currentY += 25;

      // Order Details content
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Description:', 50, currentY)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(invoiceData.description || 'N/A', 120, currentY)
        
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Plan:', 50, currentY + 15)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(invoiceData.plan?.name || 'Premium', 120, currentY + 15)
        
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Device Limit:', 50, currentY + 30)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(String(invoiceData.plan?.deviceLimit || '20'), 120, currentY + 30)
        
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Duration:', 50, currentY + 45)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text(`${invoiceData.plan?.durationDays || '30'} days`, 120, currentY + 45);

      currentY += 70;

      // -------- TABLE SECTION --------
      const tableTop = currentY;
      const tableWidth = 500;
      const columnWidth = tableWidth / 5;
      
      // Table header
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .rect(50, tableTop, tableWidth, 25)
        .fill('#1a56db')
        .text('Description', 55, tableTop + 8, { width: columnWidth - 10 })
        .text('Plan', 50 + columnWidth, tableTop + 8, { width: columnWidth - 10 })
        .text('Device Limit', 50 + columnWidth * 2, tableTop + 8, { width: columnWidth - 10 })
        .text('Duration', 50 + columnWidth * 3, tableTop + 8, { width: columnWidth - 10 })
        .text('Amount', 50 + columnWidth * 4, tableTop + 8, { width: columnWidth - 10, align: 'right' });

      // Table row
      const rowHeight = 25;
      doc.font('Helvetica')
        .fillColor('#2d3748')
        .rect(50, tableTop + rowHeight, tableWidth, rowHeight)
        .fill('#f7fafc')
        .text(invoiceData.description || 'Service Subscription', 55, tableTop + rowHeight + 8, { 
          width: columnWidth - 10 
        })
        .text(invoiceData.plan?.name || 'Premium', 50 + columnWidth, tableTop + rowHeight + 8, { 
          width: columnWidth - 10 
        })
        .text(String(invoiceData.plan?.deviceLimit || '20'), 50 + columnWidth * 2, tableTop + rowHeight + 8, { 
          width: columnWidth - 10 
        })
        .text(`${invoiceData.plan?.durationDays || '30'} days`, 50 + columnWidth * 3, tableTop + rowHeight + 8, { 
          width: columnWidth - 10 
        })
        .text(
          `${formatCurrency(invoiceData.amount)} ${process.env.CURRENCY || invoiceData.currency || 'USD'}`, 
          50 + columnWidth * 4, 
          tableTop + rowHeight + 8, 
          { width: columnWidth - 10, align: 'right' }
        );

      currentY = tableTop + rowHeight * 2 + 10;

      // -------- PAYMENT SUMMARY --------
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor('#2d3748')
        .text('PAYMENT SUMMARY', 50, currentY);

      currentY += 30;

      // Status with colored indicator
      const statusColor = getStatusColor(invoiceData.status);
      
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor('#4a5568')
        .text('Status:', 50, currentY)
        .font('Helvetica-Bold')
        .fillColor(statusColor)
        .text(invoiceData.status?.toUpperCase() || 'UNKNOWN', 90, currentY);

      // Total amount
      doc.font('Helvetica')
        .fillColor('#4a5568')
        .text('Total Amount:', 50, currentY + 20)
        .font('Helvetica-Bold')
        .fillColor('#1a56db')
        .text(
          `${formatCurrency(invoiceData.amount)} ${process.env.CURRENCY || invoiceData.currency || 'USD'}`, 
          130, 
          currentY + 20
        );

      currentY += 50;

      // -------- FOOTER --------
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor('#718096')
        .text('Thank you for your business!', 50, currentY, { align: "center" })
        .text('If you have any questions about this invoice, please contact our support team.', 50, currentY + 15, { align: "center" })
        .text(`Generated on ${new Date().toLocaleDateString()}`, 50, currentY + 30, { align: "center" })
        .text(
          `${process.env.APP_NAME || 'Your Company'} • ${process.env.COMPANY_EMAIL } • ${process.env.COMPANY_PHONE || '+1 (555) 123-4567'}`,
          50,
          currentY + 45,
          { align: "center" }
        );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateInvoiceHTML(invoiceData: any): string {
  const logoUrl = process.env.APP_LOGO_URL || "";
  const companyName = process.env.APP_NAME || "Your Company";
  const currency = process.env.CURRENCY || invoiceData.currency || 'USD';
  const companyEmail = process.env.COMPANY_EMAIL || 'support@company.com';
  const companyPhone = process.env.COMPANY_PHONE || '+1 (555) 123-4567';
  const customerName = invoiceData.customer?.name || 'N/A';
  const customerEmail = invoiceData.customer?.email || 'N/A';
  
  const statusColor = getStatusColor(invoiceData.status);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoiceData.invoiceNumber} - ${companyName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background-color: #f7fafc;
            padding: 20px;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1a56db, #1e40af);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .company-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
        }
        .invoice-title {
            font-size: 32px;
            font-weight: 300;
            margin-bottom: 10px;
        }
        .content {
            padding: 40px;
        }
        .info-sections {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
        }
        .info-section h3 {
            color: #4a5568;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .info-detail {
            font-size: 15px;
            color: #2d3748;
            margin-bottom: 5px;
        }
        .info-detail strong {
            color: #1a56db;
        }
        .order-details {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #1a56db;
        }
        .order-details h3 {
            color: #4a5568;
            font-size: 16px;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .order-detail-item {
            display: flex;
            margin-bottom: 10px;
            align-items: center;
        }
        .order-detail-label {
            font-weight: 600;
            color: #4a5568;
            width: 120px;
            flex-shrink: 0;
        }
        .order-detail-value {
            color: #2d3748;
            font-weight: 500;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .table th {
            background: #1a56db;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            font-size: 14px;
        }
        .table td {
            padding: 15px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
        }
        .table tr:last-child td {
            border-bottom: none;
        }
        .table tr:nth-child(even) {
            background: #f7fafc;
        }
        .amount {
            text-align: right;
            font-weight: 600;
            color: #1a56db;
        }
        .summary {
            background: #f8fafc;
            padding: 25px;
            border-radius: 8px;
            margin: 30px 0;
            border-left: 4px solid #1a56db;
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #e2e8f0;
        }
        .summary-item:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
        }
        .status-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: ${statusColor};
            color: white;
            text-transform: uppercase;
        }
        .total-amount {
            font-size: 20px;
            font-weight: bold;
            color: #1a56db;
        }
        .footer {
            text-align: center;
            padding: 30px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 14px;
        }
        .thank-you {
            font-size: 16px;
            color: #2d3748;
            margin-bottom: 10px;
        }
        .contact-info {
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.4;
        }
        @media (max-width: 768px) {
            .info-sections {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            .content {
                padding: 20px;
            }
            .header {
                padding: 30px 20px;
            }
            .company-info {
                flex-direction: column;
                text-align: center;
            }
            .table {
                font-size: 12px;
            }
            .table th,
            .table td {
                padding: 10px;
            }
            .order-detail-item {
                flex-direction: column;
                align-items: flex-start;
            }
            .order-detail-label {
                width: auto;
                margin-bottom: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="company-info">
                ${logoUrl ? `<img src="${logoUrl}" alt="${companyName}" class="logo" onerror="this.style.display='none'">` : ''}
                <div class="company-name">${companyName}</div>
            </div>
            <div class="invoice-title">INVOICE</div>
        </div>
        
        <div class="content">
            <div class="info-sections">
                <div class="info-section">
                    <h3>Invoice Details</h3>
                    <div class="info-detail"><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</div>
                    <div class="info-detail"><strong>Date:</strong> ${new Date(invoiceData.createdAt).toLocaleDateString()}</div>
                    <div class="info-detail"><strong>Order ID:</strong> ${invoiceData.orderId}</div>
                </div>
                
                <div class="info-section">
                    <h3>Billed To</h3>
                    <div class="info-detail"><strong>Name:</strong> ${customerName}</div>
                    <div class="info-detail"><strong>Email:</strong> ${customerEmail}</div>
                </div>
            </div>

            <!-- Order Details Section -->
            <div class="order-details">
                <h3>Order Details</h3>
                <div class="order-detail-item">
                    <span class="order-detail-label">Description:</span>
                    <span class="order-detail-value">${invoiceData.description || 'N/A'}</span>
                </div>
                <div class="order-detail-item">
                    <span class="order-detail-label">Plan:</span>
                    <span class="order-detail-value">${invoiceData.plan?.name || 'Premium'}</span>
                </div>
                <div class="order-detail-item">
                    <span class="order-detail-label">Device Limit:</span>
                    <span class="order-detail-value">${invoiceData.plan?.deviceLimit || '20'}</span>
                </div>
                <div class="order-detail-item">
                    <span class="order-detail-label">Duration:</span>
                    <span class="order-detail-value">${invoiceData.plan?.durationDays || '30'} days</span>
                </div>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Plan</th>
                        <th>Device Limit</th>
                        <th>Duration</th>
                        <th class="amount">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${invoiceData.description || 'Service Subscription'}</td>
                        <td>${invoiceData.plan?.name || 'Premium'}</td>
                        <td>${invoiceData.plan?.deviceLimit || '20'}</td>
                        <td>${invoiceData.plan?.durationDays || '30'} days</td>
                        <td class="amount">${formatCurrency(invoiceData.amount)} ${currency}</td>
                    </tr>
                </tbody>
            </table>

            <div class="summary">
                <div class="summary-item">
                    <span><strong>Status:</strong></span>
                    <span class="status-badge">${invoiceData.status?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                <div class="summary-item">
                    <span><strong>Total Amount:</strong></span>
                    <span class="total-amount">${formatCurrency(invoiceData.amount)} ${currency}</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div>If you have any questions about this invoice, please contact our support team.</div>
            <div class="contact-info">
                ${companyName} • ${companyEmail} • ${companyPhone}<br>
                Generated on ${new Date().toLocaleDateString()}
            </div>
        </div>
    </div>
</body>
</html>`;
}