// Finnhub free tier: 60 calls/min, real-time quotes.
// Crypto symbols must be mapped to exchange format (e.g. BINANCE:BTCUSDT).

interface MarketSymbol {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  direction: 'up' | 'down';
}

const CRYPTO_MAP: Record<string, string> = {
  'BTC-USD': 'BINANCE:BTCUSDT',
  'ETH-USD': 'BINANCE:ETHUSDT',
  'SOL-USD': 'BINANCE:SOLUSDT',
  'DOGE-USD': 'BINANCE:DOGEUSDT',
  'ADA-USD': 'BINANCE:ADAUSDT',
  'XRP-USD': 'BINANCE:XRPUSDT',
};

function toFinnhubSymbol(symbol: string): string {
  return CRYPTO_MAP[symbol.toUpperCase()] ?? symbol.toUpperCase();
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export async function fetchMarkets(
  symbols: string[]
): Promise<{ symbols: MarketSymbol[] } | null> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('[Fetcher:markets] FINNHUB_API_KEY not set — falling back to Claude search');
    return null;
  }

  const results = await Promise.allSettled(
    symbols.map(async (symbol): Promise<MarketSymbol> => {
      const finnhubSym = toFinnhubSymbol(symbol);
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(finnhubSym)}&token=${apiKey}`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) throw new Error(`Finnhub ${res.status} for "${symbol}"`);
      const d = await res.json();
      if (!d.c || d.c === 0) throw new Error(`No data returned for "${symbol}"`);
      const change = d.d ?? 0;
      const changePct = d.dp ?? 0;
      return {
        symbol: symbol.toUpperCase(),
        price: `$${fmt(d.c)}`,
        change: `${change >= 0 ? '+' : '-'}$${fmt(Math.abs(change))}`,
        changePercent: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`,
        direction: change >= 0 ? 'up' : 'down',
      };
    })
  );

  const fulfilled = results
    .filter((r): r is PromiseFulfilledResult<MarketSymbol> => r.status === 'fulfilled')
    .map((r) => r.value);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Fetcher:markets] Failed for "${symbols[i]}":`, r.reason);
    }
  });

  return fulfilled.length > 0 ? { symbols: fulfilled } : null;
}
