import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { OrderPayload } from '@clenzy/shared';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#20211d' },
  brand: { fontSize: 18, fontWeight: 700, color: '#1f4d3a', marginBottom: 4 },
  meta: { color: '#6b6a63', marginBottom: 20 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #20211d',
    paddingBottom: 4,
    marginBottom: 4,
    fontWeight: 700,
  },
  col1: { width: '50%' },
  col2: { width: '16.67%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontWeight: 700 },
  divider: { borderBottom: '1 solid #e5e2d9', marginVertical: 8 },
});

function money(paise: number): string {
  return `Rs ${(paise / 100).toFixed(2)}`;
}

/** See docs/PROJECT_REQUIREMENTS.md's order-detail route: itemization + invoice download. No GSTIN/letterhead spec exists yet — plain itemized statement. */
export function InvoiceDocument({ order }: { order: OrderPayload }) {
  return (
    <Document title={`Invoice ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>Clenzy</Text>
        <Text style={styles.meta}>
          Invoice for order {order.orderNumber} — placed{' '}
          {new Date(order.createdAt).toLocaleDateString('en-IN')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivered to</Text>
          <Text>{order.deliveryAddress.contactName}</Text>
          <Text>
            {order.deliveryAddress.line1}, {order.deliveryAddress.area},{' '}
            {order.deliveryAddress.city} – {order.deliveryAddress.pincode}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Item</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col2}>Rate</Text>
            <Text style={styles.col2}>Amount</Text>
          </View>
          {order.items.map((item) => (
            <View style={styles.row} key={item.serviceItemId}>
              <Text style={styles.col1}>{item.name}</Text>
              <Text style={styles.col2}>{item.quantity}</Text>
              <Text style={styles.col2}>{money(item.unitPrice)}</Text>
              <Text style={styles.col2}>{money(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text>Items subtotal</Text>
            <Text>{money(order.pricing.itemsSubtotal)}</Text>
          </View>
          {order.pricing.expressSurcharge > 0 && (
            <View style={styles.totalRow}>
              <Text>Express surcharge</Text>
              <Text>{money(order.pricing.expressSurcharge)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text>Delivery fee</Text>
            <Text>{money(order.pricing.deliveryFee)}</Text>
          </View>
          {order.pricing.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</Text>
              <Text>-{money(order.pricing.discountAmount)}</Text>
            </View>
          )}
          {order.pricing.taxAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Tax</Text>
              <Text>{money(order.pricing.taxAmount)}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalLabel}>{money(order.pricing.grandTotal)}</Text>
          </View>
          <Text style={styles.meta}>
            Paid via {order.paymentMethod === 'cod' ? 'cash on delivery' : 'online payment'} —
            status: {order.paymentStatus}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
