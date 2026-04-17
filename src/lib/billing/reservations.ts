import { BillingReservationModel } from '@/lib/models/BillingReservation';

export const BILLING_RESERVATION_TTL_MS = 10 * 60 * 1000;

export function getReservationExpiryDate() {
  return new Date(Date.now() + BILLING_RESERVATION_TTL_MS);
}

export async function cleanupExpiredBillingReservations(shopId?: string) {
  const filter: Record<string, unknown> = {
    expiresAt: { $lte: new Date() },
  };

  if (shopId) {
    filter.shopId = shopId;
  }

  await BillingReservationModel.deleteMany(filter);
}

export async function getReservedQtyByOtherUsers(params: {
  shopId: string;
  productIds: string[];
  currentUserId?: string;
}) {
  const { shopId, productIds, currentUserId = '' } = params;

  if (productIds.length === 0) {
    return new Map<string, number>();
  }

  const rows = await BillingReservationModel.aggregate([
    {
      $match: {
        shopId,
        productId: { $in: productIds },
        expiresAt: { $gt: new Date() },
        ...(currentUserId ? { userId: { $ne: currentUserId } } : {}),
      },
    },
    {
      $group: {
        _id: '$productId',
        qty: { $sum: '$qty' },
      },
    },
  ]);

  return new Map<string, number>(rows.map((row: { _id: string; qty: number }) => [String(row._id), Number(row.qty ?? 0)]));
}
