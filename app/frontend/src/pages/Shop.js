import { useEffect, useState, useMemo, useRef } from "react";
import { useApp } from "../contexts/AppContext";
import { useCart } from "../contexts/CartContext";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../lib/dataCache";
import { convertFromGbp, CURRENCIES, DEFAULT_CURRENCY } from "../lib/currency";
import { translateNote } from "../lib/notes";
import { isOnSale } from "../lib/sale";
import { ChevronDown, SlidersHorizontal, Package, X } from "lucide-react";

// Dropdown de ordenação estilizado (o <select> nativo não se estiliza)
const SortSelect = ({ value, onChange, options, align = "right" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = options.find((o) => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 text-base text-[#3B2618] border-b border-[#C8B5A0] py-1 pr-1 hover:border-[#8B5E3C] transition-colors"
      >
        {current?.label}
        <ChevronDown className={`w-4 h-4 text-[#8B5E3C] transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>
      {open && (
        <div className={`absolute ${align === "left" ? "left-0" : "right-0"} z-50 mt-2 min-w-[210px] bg-[#F9F6F0] border border-[#E0D3C3] rounded-lg shadow-xl py-1 overflow-hidden`}>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm tracking-wide transition-colors ${
                o.value === value ? "bg-[#EDE4D8] text-[#3B2618]" : "text-[#3B2618]/80 hover:bg-[#EDE4D8]/60 hover:text-[#8B5E3C]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Secção colapsável da sidebar (fora do componente p/ nao remontar inputs)
const Section = ({ open, onToggle, title, children }) => (
  <div className="border-b border-[#E0D3C3]/70 py-5 last:border-b-0 last:pb-0">
    <button onClick={onToggle} className="w-full flex items-center justify-between text-left">
      <span className="text-base text-[#3B2618]">{title}</span>
      <ChevronDown
        className={`w-4 h-4 text-[#8B5E3C] transition-transform ${open ? "rotate-180" : ""}`}
        strokeWidth={1.5}
      />
    </button>
    {open && <div className="mt-4">{children}</div>}
  </div>
);

const Shop = () => {
  const { t, currency, lang, settings } = useApp();
  const showBox = settings?.show_box_button !== false;
  const cur = CURRENCIES[currency] ? currency : DEFAULT_CURRENCY;
  const symbol = CURRENCIES[cur].symbol;
  const { boxCount, openBoxDrawer, addBoxToCart, openDrawer } = useCart();
  const [boxMode, setBoxMode] = useState(false);

  // Botão Montar/Concluir: ao concluir, adiciona a box ao carrinho
  const handleBoxButton = () => {
    if (boxMode) {
      if (boxCount > 0) {
        addBoxToCart(t("box.cart_name"));
        openDrawer();
      }
      setBoxMode(false);
    } else {
      setBoxMode(true);
    }
  };
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  const [sortBy, setSortBy] = useState("order");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [onlySale, setOnlySale] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openSections, setOpenSections] = useState({ notes: false, price: true, featured: true, sale: true });

  const toggleSection = (key) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  // Notas de aroma + contagem por nota
  const noteCounts = useMemo(() => {
    const map = new Map();
    products.forEach((p) =>
      (p.scent_notes_en || "").split(/[,;/]/).forEach((n) => {
        const t = n.trim();
        if (t) map.set(t, (map.get(t) || 0) + 1);
      })
    );
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);

  const toggleNote = (note) =>
    setSelectedNotes((prev) => (prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]));

  // Limites de preço na moeda escolhida (para o slider)
  const priceBounds = useMemo(() => {
    const prices = products
      .map((p) => convertFromGbp(Number(p.price_gbp), cur))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!prices.length) return { min: 0, max: 100 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products, cur]);

  // Ao mudar de moeda, limpa o filtro de preço (limites mudam)
  useEffect(() => {
    setMinPrice(""); setMaxPrice("");
  }, [cur]);

  // Bloqueia o scroll de fundo quando o painel de filtros mobile está aberto
  useEffect(() => {
    document.body.style.overflow = mobileFiltersOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getProducts();
        setProducts(data || []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load products.");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadProducts();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (query) {
      list = list.filter((p) =>
        p.name_en?.toLowerCase().includes(query) ||
        p.description_en?.toLowerCase().includes(query) ||
        p.scent_notes_en?.toLowerCase().includes(query)
      );
    }
    if (onlyFeatured) list = list.filter((p) => p.featured);
    if (onlySale) list = list.filter((p) => isOnSale(p));
    if (selectedNotes.length) {
      list = list.filter((p) => {
        const notes = (p.scent_notes_en || "").toLowerCase();
        return selectedNotes.some((n) => notes.includes(n.toLowerCase()));
      });
    }
    if (minPrice !== "") {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) list = list.filter((p) => convertFromGbp(p.price_gbp, cur) >= min);
    }
    if (maxPrice !== "") {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) list = list.filter((p) => convertFromGbp(p.price_gbp, cur) <= max);
    }
    switch (sortBy) {
      case "alpha_az":   list.sort((a, b) => (a.name_en || "").localeCompare(b.name_en || "")); break;
      case "alpha_za":   list.sort((a, b) => (b.name_en || "").localeCompare(a.name_en || "")); break;
      case "price_asc":  list.sort((a, b) => a.price_gbp - b.price_gbp); break;
      case "price_desc": list.sort((a, b) => b.price_gbp - a.price_gbp); break;
      case "featured":   list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
      default:           list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return list;
  }, [products, query, sortBy, minPrice, maxPrice, onlyFeatured, onlySale, selectedNotes, cur]);

  const activeFilters =
    (minPrice !== "" ? 1 : 0) + (maxPrice !== "" ? 1 : 0) + (onlyFeatured ? 1 : 0) + (onlySale ? 1 : 0) + selectedNotes.length;
  const clearFilters = () => {
    setMinPrice(""); setMaxPrice(""); setOnlyFeatured(false); setOnlySale(false); setSelectedNotes([]);
  };

  const sortOptions = [
    { value: "order", label: t("shop.sort.order") },
    { value: "alpha_az", label: t("shop.sort.az") },
    { value: "alpha_za", label: t("shop.sort.za") },
    { value: "price_asc", label: t("shop.sort.price_asc") },
    { value: "price_desc", label: t("shop.sort.price_desc") },
  ];

  // Slider de preço
  const loVal = minPrice === "" ? priceBounds.min : Math.max(priceBounds.min, Number(minPrice) || priceBounds.min);
  const hiVal = maxPrice === "" ? priceBounds.max : Math.min(priceBounds.max, Number(maxPrice) || priceBounds.max);
  const pricePct = (v) =>
    priceBounds.max === priceBounds.min ? 0 : ((v - priceBounds.min) / (priceBounds.max - priceBounds.min)) * 100;
  const onLo = (v) => setMinPrice(String(Math.min(v, hiVal)));
  const onHi = (v) => setMaxPrice(String(Math.max(v, loVal)));

  const FilterPanel = (
    <div className="bg-white/50 backdrop-blur-sm border border-[#E0D3C3]/70 rounded-xl p-6 shadow-[0_1px_4px_rgba(59,38,24,0.06)]">
      <div className="mb-5">
        <p className="font-semibold tracking-wide text-xl text-[#8B5E3C]">{t("shop.filter")}</p>
        <div className="mt-2 h-px w-full bg-gradient-to-r from-[#8B5E3C]/60 to-transparent" />
      </div>

      {/* Notas de aroma */}
      {noteCounts.length > 0 && (
        <Section open={openSections.notes} onToggle={() => toggleSection("notes")} title={t("shop.fragrance_notes")}>
          <div className="space-y-3">
            {noteCounts.map(([note, count]) => {
              const active = selectedNotes.includes(note);
              return (
                <label key={note} className="flex items-center gap-3 cursor-pointer group">
                  <span
                    className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
                      active ? "border-[#8B5E3C] bg-[#8B5E3C]" : "border-[#C8B5A0] group-hover:border-[#8B5E3C]"
                    }`}
                  >
                    {active && <span className="block w-1.5 h-1.5 bg-[#F9F6F0]" />}
                  </span>
                  <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleNote(note)} />
                  <span className="text-base text-[#3B2618]/75 group-hover:text-[#3B2618] transition-colors">
                    {translateNote(note, lang)} <span className="text-[#A68A72]">({count})</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Section>
      )}

      {/* Faixa de preço */}
      <Section open={openSections.price} onToggle={() => toggleSection("price")} title={t("shop.price_range")}>
        {priceBounds.max > priceBounds.min && (
          <div className="mb-5">
            <div className="flex justify-between text-sm text-[#8B5E3C] mb-2">
              <span>{symbol}{loVal}</span>
              <span>{symbol}{hiVal}</span>
            </div>
            <div className="relative h-4 flex items-center">
              <div className="absolute inset-x-0 h-1 bg-[#E0D3C3] rounded-full" />
              <div
                className="absolute h-1 bg-[#8B5E3C] rounded-full"
                style={{ left: `${pricePct(loVal)}%`, right: `${100 - pricePct(hiVal)}%` }}
              />
              <input
                type="range" min={priceBounds.min} max={priceBounds.max} value={loVal}
                onChange={(e) => onLo(Number(e.target.value))}
                className="range-thumb absolute inset-x-0 w-full pointer-events-none"
                aria-label={t("shop.min")}
              />
              <input
                type="range" min={priceBounds.min} max={priceBounds.max} value={hiVal}
                onChange={(e) => onHi(Number(e.target.value))}
                className="range-thumb absolute inset-x-0 w-full pointer-events-none"
                aria-label={t("shop.max")}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#A68A72]">{symbol}</span>
            <input
              type="number" min="0" placeholder={t("shop.min")} value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full border border-[#E0D3C3] bg-white text-base py-2.5 pl-7 pr-2 outline-none focus:border-[#8B5E3C] transition-colors text-[#3B2618] placeholder:text-[#C8B5A0]"
            />
          </div>
          <span className="text-[#C8B5A0]">–</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-[#A68A72]">{symbol}</span>
            <input
              type="number" min="0" placeholder={t("shop.max")} value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full border border-[#E0D3C3] bg-white text-base py-2.5 pl-7 pr-2 outline-none focus:border-[#8B5E3C] transition-colors text-[#3B2618] placeholder:text-[#C8B5A0]"
            />
          </div>
        </div>
      </Section>

      {/* Em destaque */}
      <Section open={openSections.featured} onToggle={() => toggleSection("featured")} title={t("shop.featured")}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <span
            className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
              onlyFeatured ? "border-[#8B5E3C] bg-[#8B5E3C]" : "border-[#C8B5A0] group-hover:border-[#8B5E3C]"
            }`}
          >
            {onlyFeatured && <span className="block w-1.5 h-1.5 bg-[#F9F6F0]" />}
          </span>
          <input type="checkbox" className="sr-only" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} />
          <span className="text-base text-[#3B2618]/75 group-hover:text-[#3B2618] transition-colors">{t("shop.featured_only")}</span>
        </label>
      </Section>

      {/* Promoções */}
      <Section open={openSections.sale} onToggle={() => toggleSection("sale")} title={t("shop.on_sale")}>
        <label className="flex items-center gap-3 cursor-pointer group">
          <span
            className={`w-3.5 h-3.5 border flex-shrink-0 flex items-center justify-center transition-colors ${
              onlySale ? "border-[#964545] bg-[#964545]" : "border-[#C8B5A0] group-hover:border-[#964545]"
            }`}
          >
            {onlySale && <span className="block w-1.5 h-1.5 bg-[#F9F6F0]" />}
          </span>
          <input type="checkbox" className="sr-only" checked={onlySale} onChange={(e) => setOnlySale(e.target.checked)} />
          <span className="text-base text-[#3B2618]/75 group-hover:text-[#3B2618] transition-colors">{t("shop.on_sale_only")}</span>
        </label>
      </Section>

      {activeFilters > 0 && (
        <button
          onClick={clearFilters}
          className="mt-5 text-xs tracking-luxe uppercase text-[#A68A72] hover:text-[#8B5E3C] transition-colors"
        >
          {t("shop.clear")}
        </button>
      )}
    </div>
  );

  return (
    <main data-testid="shop-page">
      {/* Cabeçalho */}
      <div className="fade-in text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] mb-5">{t("shop.eyebrow")}</p>
        <h2 className="font-serif-display text-4xl md:text-5xl leading-[1.15] text-[#3B2618] mb-8">{t("shop.title")}</h2>
        <div className="line-grow w-10 h-px bg-[#8B5E3C]/40 mx-auto mb-8" />
        <p className="text-base md:text-lg leading-relaxed text-[#3B2618]/70 mb-3">
          {t("shop.intro")}
        </p>
        <p className="text-sm text-[#A68A72]">
          {t("shop.hint")}
        </p>
        {query && (
          <p className="mt-5 text-sm text-[#8B5E3C]">
            {filtered.length} {t("shop.results_for")} "{query}"
          </p>
        )}
      </div>

      {/* Conteúdo: sidebar + grid */}
      <div className="px-6 md:px-12 lg:px-20 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-10 lg:gap-14">

          {/* Sidebar desktop */}
          <aside className="hidden lg:block self-start sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto filter-scroll pr-1">
            {FilterPanel}
          </aside>

          {/* Coluna direita */}
          <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E0D3C3] pb-4 mb-8">
              {/* Esquerda: filtro (mobile) + ordenação (desktop) */}
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="lg:hidden flex items-center gap-2 text-xs tracking-luxe uppercase text-[#3B2618]"
                >
                  <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
                  {t("shop.filter").replace(":", "")}{activeFilters > 0 ? ` (${activeFilters})` : ""}
                </button>
                <div className="hidden lg:flex items-center gap-3">
                  <label className="text-sm tracking-luxe uppercase text-[#3B2618]">{t("shop.sort_by")}</label>
                  <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} align="left" />
                </div>
              </div>

              {/* Direita: box + contagem */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {showBox && boxMode && boxCount > 0 && (
                  <button onClick={openBoxDrawer} className="hidden sm:inline text-[13px] tracking-[0.22em] uppercase text-[#8B5E3C] hover:text-[#5C3A21] transition-colors">
                    {t("box.view")} ({boxCount})
                  </button>
                )}
                {showBox && (
                <button
                  onClick={handleBoxButton}
                  className={`press inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[11px] sm:text-xs uppercase tracking-[0.22em] font-bold text-[#F9F6F0] transition-all duration-300 shadow-[0_14px_34px_-14px_rgba(59,38,24,0.55)] hover:-translate-y-0.5 ${
                    boxMode
                      ? "bg-[#5C3A21] hover:bg-[#4A2F1A]"
                      : "bg-[#8B5E3C] hover:bg-[#5C3A21]"
                  }`}
                >
                  <Package className="w-4 h-4" strokeWidth={2} />
                  {boxMode ? t("box.done") : t("box.start")}
                </button>
                )}
                <span className="hidden sm:inline text-xs text-[#A68A72] tracking-luxe uppercase">
                  {filtered.length} {t("shop.product_count")}
                </span>
              </div>
            </div>

            {/* Chips de filtros ativos */}
            {activeFilters > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                {selectedNotes.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleNote(n)}
                    className="press inline-flex items-center gap-1.5 bg-[#EDE4D8] text-[#3B2618] text-xs px-3 py-1.5 rounded-full hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors"
                  >
                    {translateNote(n, lang)} <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                ))}
                {(minPrice !== "" || maxPrice !== "") && (
                  <button
                    onClick={() => { setMinPrice(""); setMaxPrice(""); }}
                    className="press inline-flex items-center gap-1.5 bg-[#EDE4D8] text-[#3B2618] text-xs px-3 py-1.5 rounded-full hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors"
                  >
                    {symbol}{minPrice || "0"}–{maxPrice || "∞"} <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
                {onlyFeatured && (
                  <button
                    onClick={() => setOnlyFeatured(false)}
                    className="press inline-flex items-center gap-1.5 bg-[#EDE4D8] text-[#3B2618] text-xs px-3 py-1.5 rounded-full hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors"
                  >
                    {t("shop.featured")} <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
                {onlySale && (
                  <button
                    onClick={() => setOnlySale(false)}
                    className="press inline-flex items-center gap-1.5 bg-[#964545] text-[#F9F6F0] text-xs px-3 py-1.5 rounded-full hover:bg-[#7d3838] transition-colors"
                  >
                    {t("shop.on_sale")} <X className="w-3 h-3" strokeWidth={2} />
                  </button>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-1 text-xs tracking-luxe uppercase text-[#A68A72] hover:text-[#8B5E3C] transition-colors"
                >
                  {t("shop.clear")}
                </button>
              </div>
            )}

            {/* Filtros mobile (painel deslizante com botão fixo) */}
            <div className={`lg:hidden fixed inset-0 z-[80] ${mobileFiltersOpen ? "" : "pointer-events-none"}`}>
                <div
                  onClick={() => setMobileFiltersOpen(false)}
                  className={`absolute inset-0 bg-[#3B2618]/40 transition-opacity duration-300 ${mobileFiltersOpen ? "opacity-100" : "opacity-0"}`}
                />
                <div className={`absolute inset-x-0 bottom-0 top-16 bg-[#F9F6F0] rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-out ${mobileFiltersOpen ? "translate-y-0" : "translate-y-full"}`}>
                  {/* Cabeçalho */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#E0D3C3]">
                    <span className="font-semibold tracking-wide text-lg text-[#3B2618]">
                      {t("shop.filter").replace(":", "")}{activeFilters > 0 ? ` (${activeFilters})` : ""}
                    </span>
                    <button onClick={() => setMobileFiltersOpen(false)} aria-label="Close" className="p-1 text-[#3B2618] hover:text-[#8B5E3C]">
                      <X className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>
                  {/* Corpo com scroll */}
                  <div className="flex-1 overflow-y-auto px-5 py-4">
                    <div className="relative z-40 bg-white/50 backdrop-blur-sm border border-[#E0D3C3]/70 rounded-xl p-4 mb-4 flex items-center gap-3">
                      <label className="text-xs tracking-luxe uppercase text-[#3B2618]">{t("shop.sort_by")}</label>
                      <SortSelect value={sortBy} onChange={setSortBy} options={sortOptions} align="left" />
                    </div>
                    {FilterPanel}
                  </div>
                  {/* Botão fixo — aplicar / mostrar resultados */}
                  <div className="border-t border-[#E0D3C3] p-4">
                    <button
                      onClick={() => setMobileFiltersOpen(false)}
                      className="press shine w-full bg-[#8B5E3C] text-[#F9F6F0] py-3.5 px-6 rounded-full text-xs tracking-luxe uppercase font-semibold hover:bg-[#5C3A21] transition-colors"
                    >
                      {t("shop.show_results").replace("{n}", filtered.length)}
                    </button>
                  </div>
                </div>
              </div>

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-[#EDE4D8] mb-4" style={{ aspectRatio: "3 / 4" }} />
                    <div className="h-4 bg-[#EDE4D8] rounded w-3/4 mb-2" />
                    <div className="h-3 bg-[#EDE4D8] rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 text-[#964545]">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-10 h-10 text-[#C8B5A0] mx-auto mb-4" strokeWidth={1.25} />
                <p className="text-[#8B5E3C]">
                  {query ? `${t("shop.none_for")} "${query}".` : t("shop.none")}
                </p>
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="press mt-5 text-xs tracking-luxe uppercase text-[#8B5E3C] border border-[#8B5E3C] px-5 py-2.5 hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors">
                    {t("shop.clear")}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-6 lg:gap-x-8 lg:gap-y-10">
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} boxMode={boxMode} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botão flutuante da box — estilo widget de chat, fixo à direita */}
      {showBox && boxMode && boxCount > 0 && (
        <button
          onClick={openBoxDrawer}
          aria-label={`${t("box.view")} (${boxCount})`}
          className="pop-in press fixed bottom-6 right-6 z-[60] flex items-center justify-center w-14 h-14 rounded-full bg-[#8B5E3C] text-[#F9F6F0] shadow-[0_10px_30px_-6px_rgba(59,38,24,0.6)] hover:bg-[#5C3A21] hover:scale-105 transition-all duration-300"
        >
          <Package className="w-6 h-6" strokeWidth={1.5} />
          <span key={boxCount} className="pop-in absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full bg-[#964545] text-[#F9F6F0] text-[11px] font-bold tabular-nums ring-2 ring-[#F9F6F0]">
            {boxCount}
          </span>
        </button>
      )}
    </main>
  );
};

export default Shop;
