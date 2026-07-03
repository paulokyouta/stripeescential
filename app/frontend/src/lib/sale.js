// Promoção: preço promocional opcional por produto (sale_price_gbp).
// - vazio/null            -> sem promoção
// - número > 0 e < preço  -> em promoção
export const salePrice = (p) => {
  const s = p?.sale_price_gbp;
  if (s === null || s === undefined || s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return null;
  const base = Number(p?.price_gbp);
  if (Number.isFinite(base) && n >= base) return null; // promo tem de ser menor
  return n;
};

export const isOnSale = (p) => salePrice(p) !== null;

// Preço efetivo (promoção se existir, senão o normal).
export const effectivePrice = (p) => {
  const s = salePrice(p);
  return s !== null ? s : (Number(p?.price_gbp) || 0);
};

export const discountPercent = (p) => {
  const s = salePrice(p);
  const base = Number(p?.price_gbp);
  if (s === null || !Number.isFinite(base) || base <= 0) return 0;
  return Math.round((1 - s / base) * 100);
};
