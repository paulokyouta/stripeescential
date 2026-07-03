// Camada de checkout — desacoplada do carrinho e da UI.
//
// O carrinho/UI chama sempre `startCheckout(order, opts)` sem saber qual
// o provider ativo. Para migrar para Stripe no futuro, basta:
//   1. implementar o provider `stripe` (start: cria sessão e redireciona);
//   2. mudar ACTIVE_PROVIDER para "stripe".
// O carrinho, o drawer e os botões NÃO precisam de mudar.

import { buildWaUrl } from "./whatsapp";
import { cartSubtotal, cartCount } from "./cart";
import { formatMoney, DEFAULT_CURRENCY } from "./currency";

// Provider ativo. Trocar para "stripe" quando a integração existir.
export const ACTIVE_PROVIDER = "whatsapp";

// Preços do pedido estão em GBP; formata na moeda escolhida pelo visitante.
const fmt = (v, currency = DEFAULT_CURRENCY) => formatMoney(v, currency);

// Constrói um "pedido" normalizado a partir dos items do carrinho.
// Estrutura estável que qualquer provider consome.
export const buildOrder = (items) => ({
  items: items.map((it) => ({
    id: it.id,
    name: it.name,
    price: it.price,
    qty: it.qty,
    priceOnRequest: !!it.priceOnRequest,
    lineTotal: it.price * it.qty,
    boxItems: it.boxItems || null,
  })),
  subtotal: cartSubtotal(items),
  count: cartCount(items),
});

// Uma linha do pedido; se for uma box, lista o conteúdo por baixo.
const lineText = (it, currency) => {
  const base = it.priceOnRequest
    ? `• ${it.name} × ${it.qty} — preço a confirmar`
    : `• ${it.name} × ${it.qty} — ${fmt(it.lineTotal, currency)}`;
  if (it.boxItems && it.boxItems.length) {
    const sub = it.boxItems.map((b) => `   – ${b.name} × ${b.qty}`).join("\n");
    return `${base}\n${sub}`;
  }
  return base;
};

// Mensagem de WhatsApp gerada automaticamente a partir do pedido.
export const formatWhatsAppMessage = (order, currency = DEFAULT_CURRENCY) => {
  const lines = order.items.map((it) => lineText(it, currency)).join("\n");
  return (
    `Hi Escential! I'd like to order:\n\n${lines}\n\n` +
    `Subtotal: ${fmt(order.subtotal, currency)}\n\n` +
    `Please confirm availability and delivery. Thank you!`
  );
};

// Mensagem para uma box montada pelo cliente.
export const formatBoxWhatsAppMessage = (order, currency = DEFAULT_CURRENCY) => {
  const lines = order.items.map((it) => lineText(it, currency)).join("\n");
  return (
    `Hi Escential! I'd like to order this box:\n\n${lines}\n\n` +
    `Box total: ${fmt(order.subtotal, currency)}\n\n` +
    `Please confirm availability and delivery. Thank you!`
  );
};

// --- Providers ---
const providers = {
  whatsapp: {
    id: "whatsapp",
    label: "Order via WhatsApp",
    async start(order, { whatsappNumber, currency, box } = {}) {
      const message = box
        ? formatBoxWhatsAppMessage(order, currency)
        : formatWhatsAppMessage(order, currency);
      const url = buildWaUrl(whatsappNumber, message);
      window.open(url, "_blank", "noopener,noreferrer");
      return { ok: true, provider: "whatsapp" };
    },
  },

  // Placeholder para futuro — mantém a mesma interface `start(order, opts)`.
  // stripe: {
  //   id: "stripe",
  //   label: "Pay with card",
  //   async start(order, opts) {
  //     // criar sessão no backend e redirecionar para Stripe Checkout
  //   },
  // },
};

// Ponto de entrada único usado pelo carrinho/UI.
export const startCheckout = (order, opts = {}, providerId = ACTIVE_PROVIDER) => {
  const provider = providers[providerId] || providers.whatsapp;
  return provider.start(order, opts);
};

export const getCheckoutLabel = (providerId = ACTIVE_PROVIDER) =>
  (providers[providerId] || providers.whatsapp).label;
