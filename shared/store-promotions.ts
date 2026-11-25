export const STORE_SHIPPING_FEE = 25_000;
export const STORE_ORDER_DISCOUNT_RATE = 0.1;

export function getStorePromotion(physicalQuantity: number) {
  const quantity = Math.max(0, Math.floor(Number(physicalQuantity) || 0));
  return {
    quantity,
    discountRate: quantity >= 2 ? STORE_ORDER_DISCOUNT_RATE : 0,
    shippingFee: quantity >= 3 ? 0 : quantity >= 1 ? STORE_SHIPPING_FEE : 0,
    qualifiesForOrderDiscount: quantity >= 2,
    qualifiesForFreeShipping: quantity >= 3,
  };
}
