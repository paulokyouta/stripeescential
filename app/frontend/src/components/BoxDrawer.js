import React from "react";
import { Link } from "react-router-dom";
import { X, Plus, Minus, Trash2, Package, ShoppingBag } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useApp } from "../contexts/AppContext";
import { productPath } from "../lib/slug";

const BoxDrawer = () => {
  const { t, formatPrice } = useApp();
  const fmt = (v) => formatPrice(undefined, v);
  const {
    box, boxSubtotal, boxCount,
    setBoxQty, removeFromBox, clearBox, addBoxToCart,
    boxDrawerOpen, closeBoxDrawer, openDrawer,
  } = useCart();

  const anyOnRequest = box.some((it) => it.priceOnRequest);

  const handleAddToCart = () => {
    if (addBoxToCart(t("box.cart_name"))) {
      closeBoxDrawer();
      openDrawer();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeBoxDrawer}
        className={`fixed inset-0 z-[70] bg-[#3B2618]/40 transition-opacity duration-300 ${
          boxDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[71] h-full w-full max-w-md bg-[#F9F6F0] shadow-2xl flex flex-col transition-transform duration-300 ${
          boxDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0D3C3]">
          <h2 className="font-semibold tracking-wide text-2xl text-[#3B2618]">
            {t("box.your_box")} <span className="text-sm text-[#A68A72]">({boxCount})</span>
          </h2>
          <button onClick={closeBoxDrawer} aria-label="Close box" className="p-1 text-[#3B2618] hover:text-[#8B5E3C]">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        {box.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Package className="w-10 h-10 text-[#C8B5A0] mb-4" strokeWidth={1.25} />
            <p className="text-sm text-[#A68A72] mb-6">{t("box.empty")}</p>
            <button
              onClick={closeBoxDrawer}
              className="text-xs tracking-luxe uppercase text-[#8B5E3C] border-b border-[#8B5E3C] pb-0.5 hover:text-[#5C3A21]"
            >
              {t("box.add")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E0D3C3]">
              {box.map((it) => (
                <div key={it.id} className="flex gap-4 py-4">
                  <Link to={productPath(it)} onClick={closeBoxDrawer} className="shrink-0">
                    <div className="w-20 h-24 bg-[#EDE4D8] overflow-hidden">
                      <img src={it.image} alt={it.name} className="w-full h-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <Link
                      to={productPath(it)}
                      onClick={closeBoxDrawer}
                      className="font-semibold tracking-wide text-base text-[#3B2618] hover:text-[#8B5E3C] truncate"
                    >
                      {it.name}
                    </Link>
                    <p className="text-sm text-[#8B5E3C] mt-0.5">{it.priceOnRequest ? t("product.price_on_request") : fmt(it.price)}</p>

                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center border border-[#D4C4B0]">
                        <button onClick={() => setBoxQty(it.id, it.qty - 1)} className="px-2 py-1.5 text-[#3B2618] hover:bg-[#EDE4D8]" aria-label="Decrease quantity">
                          <Minus className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                        <span className="px-3 text-sm text-[#3B2618] tabular-nums">{it.qty}</span>
                        <button onClick={() => setBoxQty(it.id, it.qty + 1)} className="px-2 py-1.5 text-[#3B2618] hover:bg-[#EDE4D8]" aria-label="Increase quantity">
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <button onClick={() => removeFromBox(it.id)} className="p-1.5 text-[#A68A72] hover:text-[#964545]" aria-label="Remove item">
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[#E0D3C3] px-6 py-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs tracking-luxe uppercase text-[#A68A72]">{t("box.subtotal")}</span>
                <span className="font-semibold tracking-wide text-xl text-[#3B2618]">{fmt(boxSubtotal)}</span>
              </div>
              {anyOnRequest && <p className="text-xs text-[#8B5E3C] mb-1">+ {t("product.price_on_request").toLowerCase()}</p>}
              <div className="flex items-center justify-between mb-4">
                <button onClick={clearBox} className="text-xs tracking-luxe uppercase text-[#A68A72] hover:text-[#964545]">
                  {t("box.clear")}
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className="press shine inline-flex items-center justify-center gap-3 w-full bg-[#8B5E3C] text-[#F9F6F0] py-4 px-8 text-xs tracking-luxe uppercase hover:bg-[#5C3A21] transition-colors font-semibold"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                {t("box.add_to_cart")}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default BoxDrawer;
