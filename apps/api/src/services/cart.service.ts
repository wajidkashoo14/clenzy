import type { CartEstimateInput, CartEstimateLine, CartEstimateResult } from '@clenzy/shared';
import { isValidObjectId } from 'mongoose';
import { PRICING_DEFAULTS } from '../config/pricing.js';
import { ServiceItem, type ServiceItemDocument } from '../models/ServiceItem.js';
import { AppError } from '../utils/AppError.js';

type ItemLean = ServiceItemDocument & { _id: unknown };

/** Highest-`minQty` tier the quantity qualifies for, else the base price. See docs/DATABASE.md "serviceItems". */
function resolveTieredPrice(item: ItemLean, quantity: number): number {
  if (!item.tieredPricing || item.tieredPricing.length === 0) return item.price;

  const applicable = item.tieredPricing
    .filter((tier) => quantity >= tier.minQty)
    .sort((a, b) => b.minQty - a.minQty)[0];

  return applicable ? applicable.unitPrice : item.price;
}

/**
 * The single pricing authority for the cart — see docs/API_SPEC.md §5:
 * "the client never computes totals, it only displays what the server
 * returns." Every rupee shown in the cart UI traces back to this function.
 */
export async function estimateCart(input: CartEstimateInput): Promise<CartEstimateResult> {
  const itemIds = input.items.map((line) => line.serviceItemId);
  const invalidId = itemIds.find((id) => !isValidObjectId(id));
  if (invalidId) throw AppError.notFound('One of the items in your cart was not found.');

  const dbItems = await ServiceItem.find({ _id: { $in: itemIds }, isActive: true }).lean();
  const dbItemsById = new Map(dbItems.map((item) => [String(item._id), item]));

  const lines: CartEstimateLine[] = [];
  let itemsSubtotal = 0;
  let expressSurchargeBase = 0;
  let taxTotal = 0;

  for (const requested of input.items) {
    const dbItem = dbItemsById.get(requested.serviceItemId);
    if (!dbItem) {
      // Either genuinely missing, or matched but filtered out by isActive:true above.
      const existsButInactive = await ServiceItem.exists({ _id: requested.serviceItemId });
      if (existsButInactive) {
        throw AppError.unprocessable(
          'ITEM_INACTIVE',
          'One of the items in your cart is no longer available.',
        );
      }
      throw AppError.notFound('One of the items in your cart was not found.');
    }

    if (
      input.areaId &&
      dbItem.availableInAreas.length > 0 &&
      !dbItem.availableInAreas.some((areaId) => String(areaId) === input.areaId)
    ) {
      throw AppError.unprocessable(
        'ITEM_NOT_AVAILABLE_IN_AREA',
        `${dbItem.name} isn't available for delivery in your area.`,
      );
    }

    const clampedQuantity = Math.min(
      dbItem.maxQuantity,
      Math.max(dbItem.minQuantity, requested.quantity),
    );
    const usesPerItemExpressPrice = Boolean(input.isExpress && dbItem.expressPrice != null);
    const unitPrice = usesPerItemExpressPrice
      ? dbItem.expressPrice!
      : resolveTieredPrice(dbItem, clampedQuantity);
    const lineTotal = unitPrice * clampedQuantity;

    lines.push({
      serviceItemId: String(dbItem._id),
      name: dbItem.name,
      unit: dbItem.unit,
      quantity: clampedQuantity,
      unitPrice,
      lineTotal,
    });

    itemsSubtotal += lineTotal;
    taxTotal += Math.round((lineTotal * dbItem.taxRatePercent) / 100);
    if (input.isExpress && !usesPerItemExpressPrice) expressSurchargeBase += lineTotal;
  }

  const expressSurcharge =
    input.isExpress && expressSurchargeBase > 0
      ? Math.max(
          Math.round(expressSurchargeBase * PRICING_DEFAULTS.expressSurchargeRate),
          PRICING_DEFAULTS.minExpressSurchargePaise,
        )
      : 0;

  const combinedSubtotal = itemsSubtotal + expressSurcharge;
  const deliveryFee =
    combinedSubtotal === 0 || combinedSubtotal >= PRICING_DEFAULTS.freeDeliveryThresholdPaise
      ? 0
      : PRICING_DEFAULTS.deliveryFeePaise;
  const couponDiscount = 0; // Coupons aren't built yet — a later phase.

  return {
    items: lines,
    itemsSubtotal,
    expressSurcharge,
    deliveryFee,
    couponDiscount,
    taxTotal,
    grandTotal: itemsSubtotal + expressSurcharge + deliveryFee + taxTotal - couponDiscount,
    minOrderValue: PRICING_DEFAULTS.minOrderValuePaise,
    meetsMinimumOrder: combinedSubtotal >= PRICING_DEFAULTS.minOrderValuePaise,
    isExpress: Boolean(input.isExpress),
  };
}
