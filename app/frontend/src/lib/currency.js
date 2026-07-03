import { API } from "./api";

// Preços guardados em GBP. rate = quanto vale 1 GBP nessa moeda.
// Fallback hardcoded — usado se a API falhar ou ainda não tiver carregado.
const FALLBACK_RATES = { GBP: 1, EUR: 1.18 };
const CACHE_KEY = "ef_fx_rates";
const CACHE_TTL = 60 * 60 * 1000; // 1h

export const CURRENCIES = {
  GBP: { code: "GBP", symbol: "£", label: "GBP (£)" },
  EUR: { code: "EUR", symbol: "€", label: "EUR (€)" },
};

export const DEFAULT_CURRENCY = "GBP";

export const isCurrency = (code) => Object.prototype.hasOwnProperty.call(CURRENCIES, code);

// Taxas em memória — atualizadas por fetchRates()
let liveRates = { ...FALLBACK_RATES };

export const getRates = () => liveRates;

// Busca taxas GBP→* via rota interna /api/currency (sem CORS no browser).
// Cache 1h em localStorage (estado offline) + nunca lança.
export async function fetchRates() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { ts, rates } = JSON.parse(cached);
      if (Date.now() - ts < CACHE_TTL && rates) {
        liveRates = { GBP: 1, ...rates };
        return;
      }
    }
  } catch {}

  try {
    const res = await fetch(`${API}/currency`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const rates = data.rates || {};
    if (rates && Object.keys(rates).length) {
      liveRates = { GBP: 1, ...rates };
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), rates }));
    }
  } catch {
    // falha silenciosa — mantém cache anterior ou fallback hardcoded
  }
}

export const convertFromGbp = (gbp, code) =>
  (gbp ?? 0) * (liveRates[code] ?? FALLBACK_RATES[code] ?? 1);

export const formatMoney = (gbp, code = DEFAULT_CURRENCY) => {
  const c = CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];
  return `${c.symbol}${convertFromGbp(gbp, code).toFixed(2)}`;
};
