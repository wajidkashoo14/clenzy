import { renderToBuffer } from '@react-pdf/renderer';
import { getOrder } from './orders.service.js';
import { InvoiceDocument } from './invoiceTemplate.js';

/** See docs/API_SPEC.md §7 — GET /orders/:orderNumber/invoice. Ownership is enforced by getOrder's own {orderNumber, userId} scoping. */
export async function generateInvoicePdf(userId: string, orderNumber: string): Promise<Buffer> {
  const order = await getOrder(userId, orderNumber);
  return renderToBuffer(<InvoiceDocument order={order} />);
}
