import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { ArrowLeft, Flame, Leaf, Clock, Gift, Truck, Package, MapPin, Heart, Plus, Minus, ShoppingBag } from "lucide-react";
import WhatsAppIcon from "../components/WhatsAppIcon";
import { buildWaUrl, productMessage } from "../lib/whatsapp";
import { useCart } from "../contexts/CartContext";
import { productSlug } from "../lib/slug";
import { getProducts } from "../lib/dataCache";
import ProductCard from "../components/ProductCard";
import { isPriceOnRequest } from "../lib/price";
import { isOnSale, salePrice, discountPercent } from "../lib/sale";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatPrice, whatsappNumber, t } = useApp();
  const { addItem, openDrawer, isFavorite, toggleFavorite } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const products = await getProducts();
        // Resolver por id interno (links antigos) ou por slug amigável
        const found =
          products.find(p => String(p.id) === String(id)) ||
          products.find(p => productSlug(p) === String(id));
        setProduct(found || null);

        // Recomendados: outros produtos, com prioridade para notas em comum e destaques
        if (found) {
          const notes = (found.scent_notes_en || "").toLowerCase().split(/[,;/]/).map(s => s.trim()).filter(Boolean);
          const others = products.filter(p => p.id !== found.id);
          const shareNote = (p) => notes.some(n => (p.scent_notes_en || "").toLowerCase().includes(n));
          const score = (p) => (shareNote(p) ? 2 : 0) + (p.featured ? 1 : 0);
          const ranked = others.map(p => [p, score(p)]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
          setRelated(ranked.slice(0, 4));
        } else {
          setRelated([]);
        }
        // Redirecionar link antigo (id/slug desatualizado) para a URL canónica
        if (found) {
          const canonical = productSlug(found);
          if (canonical && String(id) !== canonical) {
            navigate(`/product/${canonical}`, { replace: true });
          }
        }
      } catch (err) {
        console.error("ProductDetail load error", err);
        setProduct(null);
      }
    };

    if (id) {
      setQty(1);
      window.scrollTo(0, 0);
      loadProduct();
    }
  }, [id, navigate]);

  if (!product) return <div className="px-6 py-20 text-sm text-[#A68A72]">…</div>;

  const name = product.name_en;
  const desc = product.description_en;
  const notes = product.scent_notes_en;
  const images = product.images?.length ? product.images : [""];
  const waHref = buildWaUrl(whatsappNumber, productMessage(product));
  const fav = isFavorite(product.id);
  const onSale = isOnSale(product);

  const handleAddToCart = () => {
    addItem(product, qty);
    openDrawer();
  };

  return (
    <main data-testid="product-detail-page" className="bg-[#F9F6F0]">
      {/* Header */}
      <div className="px-6 md:px-12 lg:px-16 pt-8 pb-4">
        <div className="max-w-6xl mx-auto">
          <Link to="/shop" className="inline-flex items-center gap-2 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21]">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> {t("product.back")}
          </Link>
        </div>
      </div>

      {/* Hero section — Imagem + Informação */}
      <div className="px-6 md:px-12 lg:px-16 py-8">
        <div className="fade-in grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* Galeria de imagens */}
          <div className="w-full max-w-xs mx-auto sm:max-w-sm lg:max-w-[440px] lg:mx-0">
            <div className="product-img-wrap aspect-[4/5] bg-[#EDE4D8] mb-4 overflow-hidden">
              <img src={images[imgIdx]} alt={name} className="w-full h-full object-cover" />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`shrink-0 w-14 h-[68px] bg-[#EDE4D8] overflow-hidden transition-all ${
                      i === imgIdx ? "border-2 border-[#8B5E3C] opacity-100" : "border border-[#D4C4B0] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Informações do produto */}
          <div className="lg:pt-2">
            {/* Heading */}
            <p className="text-[11px] tracking-[0.28em] uppercase text-[#8B5E3C] mb-3">{t("product.collection")}</p>
            <h1 className="font-semibold tracking-wide text-3xl md:text-4xl leading-[1.15] text-[#3B2618] mb-3 md:mb-4">{name}</h1>
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              {isPriceOnRequest(product) ? (
                <p className="text-lg md:text-2xl font-semibold text-[#8B5E3C]">{t("product.price_on_request")}</p>
              ) : onSale ? (
                <>
                  <p className="text-lg md:text-2xl font-semibold text-[#964545]">{formatPrice(undefined, salePrice(product))}</p>
                  <p className="text-base md:text-lg text-[#A68A72] line-through">{formatPrice(undefined, product.price_gbp)}</p>
                  <span className="text-xs tracking-luxe uppercase text-[#F9F6F0] bg-[#964545] px-2.5 py-1">−{discountPercent(product)}%</span>
                </>
              ) : (
                <p className="text-lg md:text-2xl font-semibold text-[#8B5E3C]">{formatPrice(undefined, product.price_gbp)}</p>
              )}
            </div>

            {/* Descrição */}
            {desc && (
              <p className="text-sm md:text-base leading-relaxed text-[#3B2618]/85 mb-6 md:mb-8">{desc}</p>
            )}

            {/* Scent Notes */}
            {notes && (
              <div className="mb-10">
                <p className="text-xs md:text-sm tracking-luxe uppercase text-[#8B5E3C] mb-4">{t("product.scent_profile")}</p>
                <div className="flex flex-wrap gap-3">
                  {notes.split(",").map((note, i) => (
                    <span
                      key={i}
                      className="inline-block px-3 py-2 md:px-4 md:py-2.5 bg-[#EDE4D8] text-[#3B2618] text-xs md:text-sm rounded-sm"
                    >
                      {note.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Área de compra */}
            <div className="pt-4">
              {/* Quantidade + Add to cart + Favorito */}
              <div className="flex items-stretch gap-3 mb-3">
                <div className="flex items-center border border-[#D4C4B0]">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 h-full text-[#3B2618] hover:bg-[#EDE4D8]"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <span className="px-4 text-sm text-[#3B2618] tabular-nums min-w-[40px] text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    className="px-3 h-full text-[#3B2618] hover:bg-[#EDE4D8]"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
                <button
                  data-testid="add-to-cart-btn"
                  onClick={handleAddToCart}
                  className="press shine flex-1 inline-flex items-center justify-center gap-2 bg-[#8B5E3C] text-[#F9F6F0] py-3 md:py-4 px-6 text-xs md:text-sm tracking-luxe uppercase hover:bg-[#5C3A21] transition-colors font-semibold"
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                  {t("product.add_to_cart")}
                </button>
                <button
                  onClick={() => toggleFavorite(product)}
                  aria-label={fav ? "Remove from favorites" : "Add to favorites"}
                  className="shrink-0 w-12 flex items-center justify-center border border-[#D4C4B0] hover:border-[#8B5E3C] transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 ${fav ? "text-[#8B5E3C]" : "text-[#3B2618]/70"}`}
                    strokeWidth={1.5}
                    fill={fav ? "#8B5E3C" : "none"}
                  />
                </button>
              </div>

              {/* WhatsApp direto (secundário) */}
              <a
                data-testid="detail-whatsapp-btn"
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 w-full border border-[#8B5E3C] text-[#8B5E3C] py-3 md:py-4 px-8 text-xs md:text-sm tracking-luxe uppercase hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors font-semibold mb-4"
              >
                <WhatsAppIcon className="w-5 h-5" />
                {t("product.order_whatsapp")}
              </a>
              <p className="text-sm text-[#A68A72] text-center">
                {t("product.whatsapp_hint")}
              </p>

              {/* Informação de entrega */}
              <div className="mt-8 border border-[#E0D3C3] divide-y divide-[#E0D3C3]">
                <div className="flex items-center gap-4 px-5 py-4">
                  <Truck className="w-5 h-5 text-[#8B5E3C] shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-[#3B2618]/80">{t("product.delivery_uk_pre")} <span className="text-[#3B2618] font-medium">{t("product.delivery_uk_days")}</span></p>
                </div>
                <div className="flex items-center gap-4 px-5 py-4">
                  <Package className="w-5 h-5 text-[#8B5E3C] shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-[#3B2618]/80">{t("product.delivery_processed")}</p>
                </div>
                <div className="flex items-center gap-4 px-5 py-4">
                  <MapPin className="w-5 h-5 text-[#8B5E3C] shrink-0" strokeWidth={1.5} />
                  <p className="text-sm text-[#3B2618]/80">{t("product.delivery_shipped")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-[#D4C4B0] to-transparent mx-6 md:mx-12 lg:mx-16" />

      {/* Features section (padding fino, conteúdo legível) */}
      <div className="px-6 md:px-12 lg:px-16 py-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          {[
            { Icon: Flame, title: t("product.feat.handpoured"), text: t("product.feat.handpoured_t") },
            { Icon: Leaf, title: t("product.feat.natural"), text: t("product.feat.natural_t") },
            { Icon: Clock, title: t("product.feat.lasting"), text: t("product.feat.lasting_t") },
            { Icon: Gift, title: t("product.feat.gift"), text: t("product.feat.gift_t") },
          ].map(({ Icon, title, text }, i) => (
            <div key={i} className="text-center flex flex-col items-center">
              <Icon className="w-7 h-7 text-[#8B5E3C] mb-3" strokeWidth={1.25} />
              <p className="text-sm tracking-luxe uppercase text-[#3B2618] mb-1.5 font-semibold">{title}</p>
              <p className="text-sm text-[#3B2618]/60 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Também pode gostar */}
      {related.length > 0 && (
        <>
          <div className="h-px bg-gradient-to-r from-transparent via-[#D4C4B0] to-transparent mx-6 md:mx-12 lg:mx-16" />
          <div className="px-6 md:px-12 lg:px-16 py-14 max-w-6xl mx-auto">
            <h2 className="font-semibold tracking-wide text-2xl md:text-3xl text-[#3B2618] mb-8 text-center">
              {t("product.you_may_like")}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
};

export default ProductDetail;
