import { Types } from 'mongoose';
import { User } from '../../models/user.model';
import { listLedger, writeLedgerEntry, type LedgerEntryView } from './ledger.service';
import { publish } from '../../realtime/publisher';

export interface WalletSummary {
  balanceKobo: number;
  entries: LedgerEntryView[];
}

export async function getWallet(userId: string): Promise<WalletSummary> {
  const user = await User.findById(userId).select({ walletBalanceKobo: 1 }).lean();
  const entries = await listLedger('CUSTOMER_WALLET', userId, 50);
  return { balanceKobo: user?.walletBalanceKobo ?? 0, entries };
}

/**
 * Debit the wallet for an order inside one conditional update, then record the
 * ledger row. Returns false when the balance is too low (caller maps to 402).
 */
export async function debitForOrder(userId: string, orderId: string, totalKobo: number): Promise<boolean> {
  const updated = await User.findOneAndUpdate(
    { _id: new Types.ObjectId(userId), walletBalanceKobo: { $gte: totalKobo } },
    { $inc: { walletBalanceKobo: -totalKobo } },
    { new: true },
  );
  if (!updated) return false;

  await writeLedgerEntry({
    account: 'CUSTOMER_WALLET',
    ownerId: userId,
    orderId,
    amountKobo: -totalKobo,
    type: 'ORDER_PAYMENT',
    applyBalance: false,
    memo: 'Order paid from wallet',
  });
  publish(`user:${userId}`, 'wallet:update', { ownerId: userId, balanceKobo: updated.walletBalanceKobo });
  return true;
}

/** Credit the wallet, e.g. a refund. Safe to call twice for one order. */
export async function creditWallet(input: {
  userId: string;
  amountKobo: number;
  type: 'REFUND' | 'TOPUP' | 'ADJUSTMENT';
  orderId?: string;
  memo?: string;
}): Promise<void> {
  await writeLedgerEntry({
    account: 'CUSTOMER_WALLET',
    ownerId: input.userId,
    orderId: input.orderId,
    amountKobo: input.amountKobo,
    type: input.type,
    memo: input.memo,
    applyBalance: true,
  });
}
