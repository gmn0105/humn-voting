/**
 * Capital poll payout: when a capital poll closes with a single winner,
 * the organizer's account (CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS) sends ALIEN
 * to the winner's recipient_wallet. v1: Stub only.
 */

export async function executeCapitalPayout(
  _pollId: string,
  amount: number,
  recipientWallet: string,
): Promise<{ ok: boolean; error?: string }> {
  const fromAddress = process.env.CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS;
  if (!fromAddress) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[capital-payout] CAPITAL_PAYOUT_FROM_ALIEN_ADDRESS not set; payout skipped");
    }
    return { ok: true };
  }
  // TODO: Call Alien payout API: transfer `amount` ALIEN from fromAddress to recipientWallet.
  if (process.env.NODE_ENV !== "test") {
    console.info("[capital-payout] stub", { fromAddress, amount, recipientWallet });
  }
  return { ok: true };
}
