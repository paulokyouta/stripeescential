// Lógica pura do carrinho — sem React, sem UI.
// Opera sobre um array de items: { id, name, price, image, qty }
// Mantida independente para facilitar testes e troca de UI/checkout.

import { effectivePrice } from "./sale";

export const cartItemFromProduct = (product, qty = 1) => ({
  id: product.id,
  name: product.name_en || "",
  slug: product.slug || "",
  price: product.price_on_request ? 0 : effectivePrice(product),
  priceOnRequest: !!product.price_on_request,
  image: product.images?.[0] || "/static/img/product-placeholder.jpg",
  qty: Math.max(1, qty),
});

export const addToCart = (items, product, qty = 1) => {
  const existing = items.find((it) => it.id === product.id);
  if (existing) {
    return items.map((it) =>
      it.id === product.id ? { ...it, qty: it.qty + qty } : it
    );
  }
  return [...items, cartItemFromProduct(product, qty)];
};

export const removeFromCart = (items, id) => items.filter((it) => it.id !== id);

export const updateQty = (items, id, qty) => {
  if (qty <= 0) return removeFromCart(items, id);
  return items.map((it) => (it.id === id ? { ...it, qty } : it));
};

export const cartSubtotal = (items) =>
  items.reduce((sum, it) => sum + it.price * it.qty, 0);

export const cartCount = (items) =>
  items.reduce((sum, it) => sum + it.qty, 0);
