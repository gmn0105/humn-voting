export default function TreasuryCard({
  totalPool = "500 ALIEN",
  timeLeft = "02:14:23",
  verifiedHumans = 37,
}: {
  totalPool?: string;
  timeLeft?: string;
  verifiedHumans?: number;
}) {
  return (
    <div className="w-full rounded-xl bg-white p-6 text-[#0c0c0c] shadow-sm">
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Total Pool
          </p>
          <p className="mt-1 text-2xl font-semibold sm:text-3xl">{totalPool}</p>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Time Left
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold sm:text-3xl">
            {timeLeft}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Verified Humans
          </p>
          <p className="mt-1 text-2xl font-semibold sm:text-3xl">
            {verifiedHumans}
          </p>
        </div>
      </div>
    </div>
  );
}
