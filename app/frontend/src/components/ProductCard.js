import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Package, X } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { useCart } from "../contexts/CartContext";
import { productPath } from "../lib/slug";
import { isPriceOnRequest } from "../lib/price";
import { isOnSale, salePrice, discountPercent } from "../lib/sale";

const ProductCard = ({ product, index = 0, compact = false, boxMode = false }) => {
  const { formatPrice, t } = useApp();
  const { addItem, openDrawer, isFavorite, toggleFavorite, addToBox, removeFromBox, inBox } = useCart();
  const name = product.name_en;
  const img = product.images?.[0] || "/static/img/product-placeholder.jpg";
  const fav = isFavorite(product.id);
  const href = productPath(product);
  const onSale = isOnSale(product);
  const added = boxMode && inBox(product.id);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    openDrawer();
  };

  const [pulse, setPulse] = useState(false);
  const handleAddBox = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (inBox(product.id)) removeFromBox(product.id);
    else addToBox(product, 1);
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
  };

  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  const onAdd = boxMode ? handleAddBox : handleAdd;
  const AddIcon = boxMode ? (added ? X : Package) : ShoppingBag;
  const addLabel = boxMode ? (added ? t("box.remove") : t("box.add_full")) : t("product.add");

  return (
    <div
      data-testid={`product-card-${product.id}`}
      className={`fade-up fade-up-delay-${Math.min(index, 7)} group`}
    >
      <div className={`product-img-wrap relative overflow-hidden rounded-sm bg-[#EDE4D8] ${compact ? "mb-2" : "mb-4"}`} style={{ aspectRatio: "3 / 4", width: "100%" }}>
        <Link to={href} className="block absolute inset-0">
          <img
            src={img}
            alt={name}
            className="object-cover"
            loading="lazy"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          />
        </Link>

        {onSale && (
          <span className="absolute top-2.5 left-2.5 bg-[#964545] text-[#F9F6F0] text-[9px] tracking-[0.2em] uppercase px-2.5 py-1 z-10">
            −{discountPercent(product)}%
          </span>
        )}

        {/* Modo box: imagens escurecidas, clicar adiciona/remove da box */}
        {boxMode && (
          <button
            onClick={handleAddBox}
            aria-label={addLabel}
            className={`absolute inset-0 z-[5] flex items-center justify-center transition-colors duration-300 ${
              added ? "bg-[#3B2618]/55 hover:bg-[#3B2618]/65" : "bg-[#3B2618]/40 hover:bg-[#3B2618]/55"
            }`}
          >
            <span
              className={`inline-flex items-center gap-2 text-[11px] tracking-luxe uppercase px-4 py-2.5 rounded-full shadow-lg ${
                pulse ? "box-pop" : ""
              } ${added ? "bg-[#964545] text-[#F9F6F0]" : "bg-[#F9F6F0] text-[#3B2618]"}`}
            >
              <AddIcon className="w-4 h-4" strokeWidth={1.75} />
              {addLabel}
            </span>
          </button>
        )}

        {/* Favorito */}
        <button
          onClick={handleFav}
          aria-label={fav ? "Remove from favorites" : "Add to favorites"}
          className="press absolute top-2.5 right-2.5 z-10 p-1.5 transition-colors"
        >
          <Heart
            className={`w-5 h-5 transition-colors ${fav ? "text-[#8B5E3C]" : "text-white"}`}
            strokeWidth={1.75}
            fill={fav ? "#8B5E3C" : "none"}
            style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" }}
          />
        </button>

      </div>

      <div>
        <Link to={href} className="block">
          <h3 className="font-semibold text-[#3B2618] hover:text-[#8B5E3C] transition-colors pb-0.5 text-sm sm:text-base tracking-wide">
            {name}
          </h3>
        </Link>
        <div className="flex items-center justify-between mt-1 gap-2 min-h-[24px]">
          <p className={`${compact ? "text-sm" : "text-base"} flex items-center gap-2`}>
            {isPriceOnRequest(product) ? (
              <span className="text-[#A68A72]">{t("product.price_on_request")}</span>
            ) : onSale ? (
              <>
                <span className="text-[#964545] font-medium">{formatPrice(undefined, salePrice(product))}</span>
                <span className="text-[#A68A72] line-through">{formatPrice(undefined, product.price_gbp)}</span>
              </>
            ) : (
              <span className="text-[#A68A72]">{formatPrice(undefined, product.price_gbp)}</span>
            )}
          </p>
          {/* Botão de adicionar — sempre visível, separado do favorito */}
          <button
            data-testid={boxMode ? `add-box-${product.id}` : `add-cart-${product.id}`}
            onClick={onAdd}
            className={`press inline-flex items-center gap-1 text-[10px] tracking-luxe uppercase transition-colors ${
              boxMode && pulse ? "box-pop" : ""
            } ${added ? "text-[#5C3A21]" : "text-[#8B5E3C] hover:text-[#5C3A21]"}`}
            aria-label={addLabel}
          >
            <AddIcon className={compact ? "w-4 h-4" : "w-5 h-5"} strokeWidth={1.5} />
            {!compact && <span className="hidden sm:inline">{addLabel}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
