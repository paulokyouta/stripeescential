import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  addToCart as addToCartLogic,
  removeFromCart,
  updateQty as updateQtyLogic,
  cartSubtotal,
  cartCount,
} from "../lib/cart";
import { buildOrder, startCheckout } from "../lib/checkout";

const CartCtx = createContext(null);

const CART_KEY = "ef_cart";
const FAV_KEY = "ef_favorites";
const BOX_KEY = "ef_box";

const loadJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const CartProvider = ({ children, whatsappNumber, currency }) => {
  const [items, setItems] = useState(() => loadJSON(CART_KEY, []));
  const [favorites, setFavorites] = useState(() => loadJSON(FAV_KEY, []));
  const [box, setBox] = useState(() => loadJSON(BOX_KEY, []));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favDrawerOpen, setFavDrawerOpen] = useState(false);
  const [boxDrawerOpen, setBoxDrawerOpen] = useState(false);

  // Persistência
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  }, [favorites]);
  useEffect(() => {
    localStorage.setItem(BOX_KEY, JSON.stringify(box));
  }, [box]);

  // --- Carrinho ---
  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => addToCartLogic(prev, product, qty));
  }, []);
  const removeItem = useCallback((id) => {
    setItems((prev) => removeFromCart(prev, id));
  }, []);
  const setItemQty = useCallback((id, qty) => {
    setItems((prev) => updateQtyLogic(prev, id, qty));
  }, []);
  const clearCart = useCallback(() => setItems([]), []);

  const openDrawer = useCallback(() => { setFavDrawerOpen(false); setBoxDrawerOpen(false); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openFavDrawer = useCallback(() => { setDrawerOpen(false); setBoxDrawerOpen(false); setFavDrawerOpen(true); }, []);
  const closeFavDrawer = useCallback(() => setFavDrawerOpen(false), []);
  const openBoxDrawer = useCallback(() => { setDrawerOpen(false); setFavDrawerOpen(false); setBoxDrawerOpen(true); }, []);
  const closeBoxDrawer = useCallback(() => setBoxDrawerOpen(false), []);

  const subtotal = useMemo(() => cartSubtotal(items), [items]);
  const count = useMemo(() => cartCount(items), [items]);

  // Checkout — delega no provider ativo (WhatsApp agora, Stripe depois)
  const checkout = useCallback(async () => {
    if (items.length === 0) return;
    const order = buildOrder(items);
    return startCheckout(order, { whatsappNumber, currency });
  }, [items, whatsappNumber, currency]);

  // --- Box (montar uma caixa e comprar) ---
  const addToBox = useCallback((product, qty = 1) => {
    setBox((prev) => addToCartLogic(prev, product, qty));
  }, []);
  const removeFromBox = useCallback((id) => {
    setBox((prev) => removeFromCart(prev, id));
  }, []);
  const setBoxQty = useCallback((id, qty) => {
    setBox((prev) => updateQtyLogic(prev, id, qty));
  }, []);
  const clearBox = useCallback(() => setBox([]), []);
  // Adiciona a box montada ao carrinho como um único item "Box" (bundle).
  const addBoxToCart = useCallback((name = "Box") => {
    if (box.length === 0) return false;
    const line = {
      id: `box-${Date.now()}`,
      name,
      price: cartSubtotal(box),
      priceOnRequest: box.some((it) => it.priceOnRequest),
      image: box[0]?.image || "/static/img/product-placeholder.jpg",
      qty: 1,
      isBox: true,
      boxItems: box.map((it) => ({
        name: it.name, qty: it.qty, price: it.price, priceOnRequest: !!it.priceOnRequest,
      })),
    };
    setItems((prev) => [...prev, line]);
    setBox([]);
    return true;
  }, [box]);
  const boxSubtotal = useMemo(() => cartSubtotal(box), [box]);
  const boxCount = useMemo(() => cartCount(box), [box]);
  const inBox = useCallback((id) => box.some((it) => it.id === id), [box]);
  const checkoutBox = useCallback(async () => {
    if (box.length === 0) return;
    const order = buildOrder(box);
    return startCheckout(order, { whatsappNumber, currency, box: true });
  }, [box, whatsappNumber, currency]);

  // --- Favoritos ---
  const isFavorite = useCallback(
    (id) => favorites.some((f) => f.id === id),
    [favorites]
  );
  const toggleFavorite = useCallback((product) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === product.id)) {
        return prev.filter((f) => f.id !== product.id);
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name_en || "",
          slug: product.slug || "",
          price: product.price_gbp ?? 0,
          image: product.images?.[0] || "/static/img/product-placeholder.jpg",
        },
      ];
    });
  }, []);
  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value = {
    // carrinho
    items, addItem, removeItem, setItemQty, clearCart,
    subtotal, count, checkout,
    drawerOpen, openDrawer, closeDrawer,
    // favoritos
    favorites, isFavorite, toggleFavorite, removeFavorite,
    favCount: favorites.length,
    favDrawerOpen, openFavDrawer, closeFavDrawer,
    // box
    box, addToBox, removeFromBox, setBoxQty, clearBox, addBoxToCart,
    boxSubtotal, boxCount, inBox, checkoutBox,
    boxDrawerOpen, openBoxDrawer, closeBoxDrawer,
  };

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
};
