// Frankfurter API — European Central Bank rates, no API key needed.
// Updated daily. Daily rates are standard for currency (banks use the same).

interface CurrencyRate {
  target: string;
  rate: string;
  direction: 'up' | 'down' | 'flat';
}

function previousBusinessDay(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() - 2); // Sunday → Friday
  if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1); // Saturday → Friday
  return d.toISOString().slice(0, 10);
}

export async function fetchCurrency(
  base: string,
  targets: string[]
): Promise<{ base: string; rates: CurrencyRate[] } | null> {
  try {
    const to = targets.join(',');
    const [todayRes, prevRes] = await Promise.all([
      fetch(`https://api.frankfurter.app/latest?from=${base}&to=${to}`),
      fetch(`https://api.frankfurter.app/${previousBusinessDay()}?from=${base}&to=${to}`),
    ]);

    if (!todayRes.ok) {
      console.error(`[Fetcher:currency] Frankfurter ${todayRes.status}`);
      return null;
    }

    const today = await todayRes.json();
    const prev = prevRes.ok ? await prevRes.json() : null;

    const rates: CurrencyRate[] = targets
      .filter((t) => today.rates?.[t])
      .map((t) => {
        const todayRate: number = today.rates[t];
        const prevRate: number | undefined = prev?.rates?.[t];
        let direction: 'up' | 'down' | 'flat' = 'flat';
        if (prevRate !== undefined) {
          if (todayRate > prevRate) direction = 'up';
          else if (todayRate < prevRate) direction = 'down';
        }
        return { target: t, rate: todayRate.toFixed(4), direction };
      });

    return rates.length > 0 ? { base: base.toUpperCase(), rates } : null;
  } catch (err) {
    console.error('[Fetcher:currency] Error:', err);
    return null;
  }
}
