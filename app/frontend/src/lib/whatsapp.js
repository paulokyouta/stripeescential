// Helpers for WhatsApp deep-links
export const buildWaUrl = (number, message) => {
  const cleaned = (number || "").replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message || "")}`;
};

export const openWhatsApp = (number, message) => {
  const url = buildWaUrl(number, message);
  window.open(url, "_blank", "noopener,noreferrer");
};

export const productMessage = (product) => {
  const name = product.name_en;
  const price = `£${(product.price_gbp ?? 0).toFixed(2)}`;
  return `Hi! I'm interested in "${name}" (${price}). Could you give me more information?`;
};

export const generalMessage = () =>
  "Hi Escential! I'd like to know more about your candle boxes.";
