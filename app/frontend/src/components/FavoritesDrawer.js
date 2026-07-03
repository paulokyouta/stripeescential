import React from "react";
import { Link } from "react-router-dom";
import { X, Trash2, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "../contexts/CartContext";
import { useApp } from "../contexts/AppContext";
import { productPath } from "../lib/slug";

const FavoritesDrawer = () => {
  const { t, formatPrice } = useApp();
  const fmt = (v) => formatPrice(undefined, v);
  const {
    favorites, favCount, removeFavorite,
    addItem, openDrawer,
    favDrawerOpen, closeFavDrawer,
  } = useCart();

  const addToCart = (fav) => {
    addItem({ id: fav.id, name_en: fav.name, price_gbp: fav.price, images: [fav.image] });
    openDrawer();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeFavDrawer}
        className={`fixed inset-0 z-[70] bg-[#3B2618]/40 transition-opacity duration-300 ${
          favDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 z-[71] h-full w-full max-w-md bg-[#F9F6F0] shadow-2xl flex flex-col transition-transform duration-300 ${
          favDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0D3C3]">
          <h2 className="font-semibold tracking-wide text-2xl text-[#3B2618]">
            {t("fav.title")} <span className="text-sm text-[#A68A72]">({favCount})</span>
          </h2>
          <button onClick={closeFavDrawer} aria-label="Close favorites" className="p-1 text-[#3B2618] hover:text-[#8B5E3C]">
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Items */}
        {favorites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <Heart className="w-10 h-10 text-[#C8B5A0] mb-4" strokeWidth={1.25} />
            <p className="text-sm text-[#A68A72] mb-6">{t("fav.empty")}</p>
            <Link
              to="/shop"
              onClick={closeFavDrawer}
              className="text-xs tracking-luxe uppercase text-[#8B5E3C] border-b border-[#8B5E3C] pb-0.5 hover:text-[#5C3A21]"
            >
              {t("fav.browse")}
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[#E0D3C3]">
            {favorites.map((fav) => (
              <div key={fav.id} className="flex gap-4 py-4">
                <Link to={productPath(fav)} onClick={closeFavDrawer} className="shrink-0">
                  <div className="w-20 h-24 bg-[#EDE4D8] overflow-hidden">
                    <img src={fav.image} alt={fav.name} className="w-full h-full object-cover" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <Link
                    to={productPath(fav)}
                    onClick={closeFavDrawer}
                    className="font-semibold tracking-wide text-base text-[#3B2618] hover:text-[#8B5E3C] truncate"
                  >
                    {fav.name}
                  </Link>
                  <p className="text-sm text-[#8B5E3C] mt-0.5">{fmt(fav.price)}</p>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <button
                      onClick={() => addToCart(fav)}
                      className="inline-flex items-center gap-2 border border-[#8B5E3C] text-[#8B5E3C] px-3 py-1.5 text-[10px] tracking-luxe uppercase hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.5} />
                      {t("fav.add_to_cart")}
                    </button>
                    <button
                      onClick={() => removeFavorite(fav.id)}
                      className="p-1.5 text-[#A68A72] hover:text-[#964545]"
                      aria-label="Remove favorite"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </>
  );
};

export default FavoritesDrawer;
