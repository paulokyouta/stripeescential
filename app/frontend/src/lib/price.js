// Preço sob consulta: produto sem preço fixo.
// Flag no produto: price_on_request (boolean).
export const isPriceOnRequest = (p) => !!(p && p.price_on_request);
