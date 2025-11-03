/**
 * Invoice Generator Service
 * Generates unique invoice numbers and manages invoice data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InvoiceGenerator {
  /**
   * Generate unique invoice number
   * Format: INV-YYYY-MM-NNNNNN
   */
  static async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    // Get the count of invoices for this month
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59);
    
    const invoiceCount = await prisma.payment.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        invoiceNumber: {
          not: null
        }
      }
    });
    
    const sequence = String(invoiceCount + 1).padStart(6, '0');
    return `INV-${year}-${month}-${sequence}`;
  }

  /**
   * Generate order description based on type and metadata
   */
  static generateOrderDescription(orderType: string, subType?: string, metadata?: any): string {
    switch (orderType) {
      case 'SUBSCRIPTION':
        if (metadata?.planName) {
          return `${metadata.planName} Subscription${subType ? ` - ${subType}` : ''}`;
        }
        return `Subscription Plan${subType ? ` - ${subType}` : ''}`;
      
      case 'DEVICE_PURCHASE':
        return `Device Purchase${subType ? ` - ${subType}` : ''}`;
      
      case 'SERVICE_FEE':
        return `Service Fee${subType ? ` - ${subType}` : ''}`;
      
      case 'ADDON':
        return `Add-on Service${subType ? ` - ${subType}` : ''}`;
      
      case 'REFUND':
        return `Refund${subType ? ` - ${subType}` : ''}`;
      
      default:
        return `Order${subType ? ` - ${subType}` : ''}`;
    }
  }

  /**
   * Create invoice data structure
   */
  static createInvoiceData(payment: any, user: any, plan?: any) {
    return {
      invoiceNumber: payment.invoiceNumber,
      orderId: payment.orderId,
      orderType: payment.orderType,
      subType: payment.subType,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: payment.description,
      createdAt: payment.createdAt,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      plan: plan ? {
        name: plan.name,
        deviceLimit: plan.deviceLimit,
        durationDays: plan.durationDays
      } : null,
      metadata: payment.metadata
    };
  }
}