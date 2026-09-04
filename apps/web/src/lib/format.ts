/** ₹ formatting — money is always paise integers over the wire, per docs/API_SPEC.md §0. */
const rupeeFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** e.g. `formatRupees(4000)` → "₹40". */
export function formatRupees(paise: number): string {
  return rupeeFormatter.format(paise / 100);
}
