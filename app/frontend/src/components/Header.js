import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Search, ShoppingBag, Heart } from "lucide-react";
import { getProducts } from "../lib/dataCache";
import { useApp } from "../contexts/AppContext";
import { useCart } from "../contexts/CartContext";
import { productPath } from "../lib/slug";
import LangCurrencySwitcher from "./LangCurrencySwitcher";
import WhatsAppIcon from "./WhatsAppIcon";
import { buildWaUrl, generalMessage } from "../lib/whatsapp";

const Header = () => {
  const { t, whatsappNumber, formatPrice } = useApp();
  const { count, favCount, openDrawer, openFavDrawer } = useCart();
  // Header fixo (não editável no Puck) — valores em código.
  const logoSrc = "/static/img/logo-full.png";
  const brandAlt = "Escential Fragrance";
  const customNav = null;
  const hs = {};
  const navColor = hs.text || undefined;
  const navActive = hs.active || undefined;
  const logoH = hs.logoHeight ? `${hs.logoHeight}px` : undefined;
  const [scrolled, setScrolled] = useState(false);
  const [headerH, setHeaderH] = useState(0);
  const headerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState([]);
  const nav = useNavigate();
  const searchRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [hoveredKey, setHoveredKey] = useState(null);
  const loc = useLocation();
  const navRef = useRef(null);
  const navRefs = useRef({});

  const activeKey = useMemo(() => {
    const p = loc.pathname;
    if (p === "/") return "home";
    if (p === "/shop") return "shop";
    if (p === "/box") return "box";
    if (p === "/about") return "about";
    if (p === "/scent") return "fragrances";
    if (p === "/contact") return "contact";
    if (p === "/review") return "feedback";
    return null;
  }, [loc.pathname]);

  const updateIndicator = useCallback(() => {
    if (!navRef.current) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const key = hoveredKey || activeKey;
    if (!key) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const activeEl = navRefs.current[`nav-${key}`];
    if (!activeEl) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = activeEl.getBoundingClientRect();
    setIndicatorStyle({
      left: itemRect.left - navRect.left,
      width: itemRect.width,
      opacity: 1,
    });
  }, [hoveredKey, activeKey]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu mobile fecha sozinho ao fazer scroll
  useEffect(() => {
    if (!menuOpen) return;
    const onScroll = () => closeMenu();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeaderH(el.offsetHeight));
    ro.observe(el);
    setHeaderH(el.offsetHeight);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (loc.pathname !== "/") {
      setActiveHash("");
      return;
    }

    const updateHash = () => setActiveHash(window.location.hash || "");
    updateHash();

    if (window.location.hash === "") {
      window.scrollTo({ top: 0, behavior: "auto" });
      setActiveHash("");
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (window.scrollY < 120) return;
          const id = `#${entry.target.id}`;
          setActiveHash(id);
          window.history.replaceState(null, "", id);
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
    );

    // Observe hash sections
    const fragrances = document.querySelector("#fragrances");
    const about = document.querySelector("#about");
    const contact = document.querySelector("#contact");

    if (fragrances) observer.observe(fragrances);
    if (about) observer.observe(about);
    if (contact) observer.observe(contact);

    window.addEventListener("hashchange", updateHash);
    const onScroll = () => {
      if (window.scrollY < 100 && activeHash !== "") {
        setActiveHash("");
        window.history.replaceState(null, "", "/");
        return;
      }
      const nearBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 50;
      if (nearBottom) {
        setActiveHash("#contact");
        window.history.replaceState(null, "", "#contact");
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (fragrances) observer.unobserve(fragrances);
      if (about) observer.unobserve(about);
      if (contact) observer.unobserve(contact);
      window.removeEventListener("hashchange", updateHash);
      window.removeEventListener("scroll", onScroll);
    };
  }, [loc.pathname, activeHash]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      nav(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const openSearch = async () => {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 50);
    if (searchProducts.length === 0) {
      try {
        const data = await getProducts();
        setSearchProducts(data || []);
      } catch {}
    }
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [searchOpen]);

  const searchResults = searchQuery.trim().length > 0
    ? searchProducts.filter(p =>
        p.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.scent_notes_en?.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  const popularSearches = searchProducts.slice(0, 5).map(p => p.name_en).filter(Boolean);
  const featuredProducts = searchProducts.filter(p => p.featured);
  const bestSellers = (featuredProducts.length > 0 ? featuredProducts : searchProducts).slice(0, 4);

  if (loc.pathname.startsWith("/admin")) return null;

  const isHome = loc.pathname === "/";
  const transparent = isHome && !scrolled;

  const headerStyle = transparent
    ? {}
    : { background: hs.bg || undefined, borderColor: hs.border || undefined };

  const waHref = buildWaUrl(whatsappNumber, generalMessage());
  const isActive = (path) => loc.pathname === path;

  const getHashHref = (hash) => (loc.pathname === "/" ? hash : `/${hash}`);
  const handleHashNav = (hash) => (event) => {
    if (loc.pathname === "/") {
      event.preventDefault();
      const target = document.querySelector(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", hash);
      }
    }
  };
  const handleHomeClick = () => {
    if (loc.pathname === "/") {
      setActiveHash("");
      window.history.replaceState(null, "", "/");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Fecho do menu mobile com animação de saída (mesma duração da abertura)
  const closeMenu = () => {
    setMenuClosing(true);
    setTimeout(() => { setMenuOpen(false); setMenuClosing(false); }, 200);
  };
  const toggleMenu = () => (menuOpen ? closeMenu() : setMenuOpen(true));
  const menuAnimCls = menuClosing ? "mobile-menu-anim-out" : "mobile-menu-anim";

  // mapa link → chave do indicador
  const linkNavKey = { "/": "home", "/shop": "shop", "/box": "box", "/about": "about", "/scent": "fragrances", "/contact": "contact", "/review": "feedback" };

  // Aba customizada (definida no admin). link: "/shop", "#about" ou "https://..."
  const renderCustomItem = (item, i, mobile = false) => {
    const link = (item.link || "/").trim();
    const active = link.startsWith("/") && isActive(link);
    const base = mobile
      ? "block text-xs tracking-[0.22em] uppercase"
      : "text-[13px] tracking-[0.22em] uppercase transition-colors relative pb-1 whitespace-nowrap";
    // Desktop: sem after: — o span indicador desliza e trata do underline
    const cls = active
      ? `${base} text-[#3B2618]`
      : `${base} text-[#3B2618]/85 hover:text-[#8B5E3C]`;
    const style = { color: active ? navActive : navColor, fontWeight: 700 };
    const close = () => mobile && closeMenu();

    // Traduzir labels de nav padrão; custom items mantêm o label da BD
    const navKeyMap = {
      "/": "nav.home",
      "/shop": "nav.shop",
      "/about": "nav.about",
      "/scent": "nav.fragrances",
      "/contact": "nav.contact",
      "/review": "nav.feedback",
    };
    const displayLabel = navKeyMap[link] ? t(navKeyMap[link]) : item.label;

    const navKey = linkNavKey[link] || null;
    const refCb = !mobile && navKey ? (node) => { if (node) navRefs.current[`nav-${navKey}`] = node; } : undefined;
    const hoverProps = !mobile && navKey ? { onMouseEnter: () => setHoveredKey(navKey) } : {};

    if (link.startsWith("#")) {
      return (
        <a key={i} href={getHashHref(link)} onClick={(e) => { close(); handleHashNav(link)(e); }} className={cls} style={style} ref={refCb} {...hoverProps}>
          {displayLabel}
        </a>
      );
    }
    if (link.startsWith("/")) {
      return (
        <Link key={i} to={link} aria-current={active ? "page" : undefined} onClick={() => { close(); if (link === "/" && loc.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cls} style={style} ref={refCb} {...hoverProps}>
          {displayLabel}
        </Link>
      );
    }
    return (
      <a key={i} href={link} target="_blank" rel="noopener noreferrer" onClick={close} className={cls} style={style}>
        {item.label}
      </a>
    );
  };

  const NavLink = ({ to, hash, children, testId, onClick, onMouseEnter }) => {
    const active = hash ? loc.pathname === "/" && activeHash === hash : isActive(to);
    const href = hash ? getHashHref(hash) : to;
    const Component = hash ? "a" : Link;
    const props = hash ? { href } : { to };
    const setRef = useCallback(
      (node) => {
        if (node) navRefs.current[testId] = node;
      },
      [testId]
    );

    return (
      <Component
        {...props}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        data-testid={testId}
        ref={setRef}
        aria-current={active ? "page" : undefined}
        style={{ color: active ? navActive : navColor, fontWeight: 700, whiteSpace: "nowrap" }}
        className={`text-[13px] tracking-[0.22em] uppercase transition-colors relative pb-1 ${
          active ? "text-[#3B2618]" : "text-[#3B2618]/85 hover:text-[#8B5E3C]"
        }`}
      >
        {children}
      </Component>
    );
  };

  return (
    <>
    <header
      ref={headerRef}
      data-testid="site-header"
      style={headerStyle}
      className={`fixed top-0 left-0 w-full z-40 transition-[background,border-color] duration-300 ${
        transparent
          ? "bg-transparent border-transparent"
          : "bg-[#F9F6F0]/95 backdrop-blur-xl border-b border-[#8B5E3C]/10"
      }`}
    >
      <div className="px-6 min-[1120px]:px-10 py-2 min-[1120px]:py-2 grid grid-cols-[1fr_auto_1fr] items-center min-[1120px]:flex min-[1120px]:items-center min-[1120px]:justify-between min-[1120px]:gap-8">

        {/* Coluna esquerda: lupa mobile, logo desktop, lang+search tablet */}
        <div className="flex items-center">
          <button
            data-testid="header-search-btn"
            onClick={searchOpen ? closeSearch : openSearch}
            aria-label="search"
            className="min-[1120px]:hidden p-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
          >
            {searchOpen ? <X className="w-5 h-5" strokeWidth={1.5} /> : <Search className="w-5 h-5" strokeWidth={1.5} />}
          </button>
          <button
            onClick={openFavDrawer}
            aria-label="favorites"
            className="min-[1120px]:hidden relative p-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
          >
            <Heart className="w-5 h-5" strokeWidth={1.5} />
            {favCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#8B5E3C] text-[#F9F6F0] text-[9px] rounded-full leading-none">
                {favCount}
              </span>
            )}
          </button>
          <Link to="/" data-testid="logo-link" className="hidden min-[1120px]:flex shrink-0 items-center" style={{ marginLeft: "clamp(0px, calc((100vw - 1120px) * 0.3), 120px)" }}>
            <img src={logoSrc} alt={brandAlt} style={{ height: logoH }} className="h-16 min-[1280px]:h-24 w-auto object-contain" />
          </Link>
        </div>

        {/* Coluna central: logo mobile, nav no desktop */}
        <div className="flex justify-center">
          <Link to="/" className="min-[1120px]:hidden flex items-center">
            <img src={logoSrc} alt={brandAlt} style={{ height: logoH }} className="h-24 w-auto object-contain" />
          </Link>
          <nav ref={navRef} className="hidden min-[1120px]:flex items-center gap-6 min-[1280px]:gap-9 min-[1440px]:gap-12 relative" onMouseLeave={() => setHoveredKey(null)}>
            {customNav ? (
              customNav.map((item, i) => renderCustomItem(item, i, false))
            ) : (
              <>
                <NavLink to="/" testId="nav-home" onClick={handleHomeClick} onMouseEnter={() => setHoveredKey("home")}>{t("nav.home")}</NavLink>
                <NavLink to="/shop" testId="nav-shop" onMouseEnter={() => setHoveredKey("shop")}>{t("nav.shop")}</NavLink>
                <NavLink to="/scent" testId="nav-fragrances" onMouseEnter={() => setHoveredKey("fragrances")}>{t("nav.fragrances")}</NavLink>
                <NavLink to="/about" testId="nav-about" onMouseEnter={() => setHoveredKey("about")}>{t("nav.about")}</NavLink>
                <NavLink to="/contact" testId="nav-contact" onMouseEnter={() => setHoveredKey("contact")}>{t("nav.contact")}</NavLink>
                <NavLink to="/review" testId="nav-feedback" onMouseEnter={() => setHoveredKey("feedback")}>{t("nav.feedback")}</NavLink>
              </>
            )}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 0,
                height: "1px",
                left: indicatorStyle.left,
                width: indicatorStyle.width,
                opacity: indicatorStyle.opacity,
                background: navActive || "#8B5E3C",
                transition: "left 0.32s cubic-bezier(0.25,0.46,0.45,0.94), width 0.32s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.18s ease",
                pointerEvents: "none",
              }}
            />
          </nav>
        </div>

        {/* Coluna direita: favoritos, carrinho, menu, (lang+search em desktop) */}
        <div className="flex items-center gap-1 sm:gap-2 min-[1120px]:gap-2 justify-end">
          {/* Lang + search desktop only (1120px+) */}
          <div className="hidden min-[1120px]:flex items-center gap-2">
            <LangCurrencySwitcher />
            <button
              className="p-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
              aria-label="search"
              onClick={openSearch}
            >
              <Search className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {/* Favoritos (desktop only — no mobile está junto à lupa na col esquerda) */}
          <button
            onClick={openFavDrawer}
            aria-label="favorites"
            className="hidden min-[1120px]:block relative p-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
          >
            <Heart className="w-5 h-5" strokeWidth={1.5} />
            {favCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#8B5E3C] text-[#F9F6F0] text-[9px] rounded-full leading-none">
                {favCount}
              </span>
            )}
          </button>

          {/* Carrinho */}
          <button
            onClick={openDrawer}
            aria-label="cart"
            className="relative p-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
          >
            <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[#8B5E3C] text-[#F9F6F0] text-[9px] rounded-full leading-none">
                {count}
              </span>
            )}
          </button>

          <button
            data-testid="mobile-menu-btn"
            onClick={toggleMenu}
            className="min-[1120px]:hidden p-2"
            aria-label="menu"
          >
            {menuOpen ? <X strokeWidth={1.5} className="w-6 h-6" /> : <Menu strokeWidth={1.5} className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {false && (
        <div>
          {/* Barra de input */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E0D3C3]">
            <Search className="w-4 h-4 text-[#A68A72] shrink-0" strokeWidth={1.5} />
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full bg-transparent outline-none text-sm text-[#3B2618] placeholder:text-[#A68A72]"
              />
            </form>
            <button onClick={closeSearch} aria-label="fechar pesquisa">
              <X className="w-5 h-5 text-[#3B2618]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-8">
              {searchQuery.trim() === "" ? (
                <div className="flex flex-col sm:flex-row gap-10">
                  {/* Populares */}
                  {popularSearches.length > 0 && (
                    <div className="sm:w-44 shrink-0">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-5">Popular now</div>
                      <ul className="space-y-3.5">
                        {popularSearches.map((s, i) => (
                          <li key={i}>
                            <button onClick={() => setSearchQuery(s)} className="text-sm font-medium text-[#3B2618] hover:text-[#8B5E3C] text-left transition-colors">
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Best Sellers */}
                  {bestSellers.length > 0 && (
                    <div className="flex-1">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-6">Best Sellers</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                        {bestSellers.map(p => (
                          <Link key={p.id} to={productPath(p)} onClick={closeSearch} className="group">
                            <div className="aspect-[3/4] bg-[#EDE4D8] mb-3 overflow-hidden rounded-sm">
                              {p.images?.[0] && <img src={p.images[0]} alt={p.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                            </div>
                            <div className="text-sm text-[#3B2618] leading-tight font-medium">{p.name_en}</div>
                            <div className="text-xs text-[#A68A72] mt-1">{formatPrice(undefined, p.price_gbp)}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-[#A68A72]">No results found.</p>
              ) : (
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-6">Results</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                    {searchResults.map(p => (
                      <Link key={p.id} to={productPath(p)} onClick={closeSearch} className="group">
                        <div className="aspect-[3/4] bg-[#EDE4D8] mb-3 overflow-hidden rounded-sm">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                        </div>
                        <div className="text-sm text-[#3B2618] leading-tight font-medium">{p.name_en}</div>
                        <div className="text-xs text-[#A68A72] mt-1">{formatPrice(undefined, p.price_gbp)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {menuOpen && customNav && (
        <div className={`${menuAnimCls} absolute left-0 right-0 shadow-xl min-[1120px]:hidden border-t border-[#8B5E3C]/10 px-6 py-6 space-y-4 bg-[#F9F6F0]`} style={{ top: "100%" }}>
          {customNav.map((item, i) => renderCustomItem(item, i, true))}
          <div className="pt-2 border-t border-[#8B5E3C]/10">
            <LangCurrencySwitcher variant="mobile" />
          </div>
        </div>
      )}

      {menuOpen && !customNav && (
        <div className={`${menuAnimCls} absolute left-0 right-0 shadow-xl min-[1120px]:hidden border-t border-[#8B5E3C]/10 px-6 py-6 space-y-4 bg-[#F9F6F0]`} style={{ top: "100%" }}>
          {[
            { to: "/", label: t("nav.home"), key: "home" },
            { to: "/shop", label: t("nav.shop"), key: "shop" },
            { to: "/scent", label: t("nav.fragrances"), key: "fragrances" },
            { to: "/about", label: t("nav.about"), key: "about" },
            { to: "/contact", label: t("nav.contact"), key: "contact" },
            { to: "/review", label: t("nav.feedback"), key: "feedback" },
          ].map((item) => (
            <Link
              key={item.key}
              to={item.to}
              aria-current={activeKey === item.key ? "page" : undefined}
              onClick={() => { closeMenu(); if (item.to === "/" && loc.pathname === "/") window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{ color: activeKey === item.key ? navActive : navColor }}
              className={`block text-xs tracking-[0.22em] uppercase transition-colors ${
                activeKey === item.key ? "text-[#8B5E3C]" : "text-[#3B2618] hover:text-[#8B5E3C]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-[#8B5E3C]/10">
            <LangCurrencySwitcher variant="mobile" />
          </div>
        </div>
      )}
    </header>

      {/* Nas páginas sem hero o header é fixed e sai do fluxo — este div compensa */}
      {!isHome && <div aria-hidden="true" style={{ height: headerH }} />}

      {/* Overlay fullscreen de pesquisa — fora do header para escapar ao stacking context */}
      {searchOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col min-[1120px]:items-center min-[1120px]:justify-start min-[1120px]:pt-24 min-[1120px]:bg-black/30 min-[1120px]:backdrop-blur-sm">
          <div className="bg-[#F9F6F0] flex flex-col w-full h-full min-[1120px]:h-auto min-[1120px]:max-h-[75vh] min-[1120px]:max-w-4xl min-[1120px]:shadow-2xl search-open-anim">
          {/* Barra de input */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E0D3C3]">
            <Search className="w-4 h-4 text-[#A68A72] shrink-0" strokeWidth={1.5} />
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <input
                ref={searchRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="w-full bg-transparent outline-none text-sm text-[#3B2618] placeholder:text-[#A68A72]"
              />
            </form>
            <button onClick={closeSearch} aria-label="fechar pesquisa">
              <X className="w-5 h-5 text-[#3B2618]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto px-6 py-8">
              {searchQuery.trim() === "" ? (
                <div className="flex flex-col sm:flex-row gap-10">
                  {popularSearches.length > 0 && (
                    <div className="sm:w-44 shrink-0">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-5">Popular now</div>
                      <ul className="space-y-3.5">
                        {popularSearches.map((s, i) => (
                          <li key={i}>
                            <button onClick={() => setSearchQuery(s)} className="text-sm font-medium text-[#3B2618] hover:text-[#8B5E3C] text-left transition-colors">
                              {s}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {bestSellers.length > 0 && (
                    <div className="flex-1">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-5">Best Sellers</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {bestSellers.map(p => (
                          <Link key={p.id} to={productPath(p)} onClick={closeSearch} className="group">
                            <div className="aspect-[3/4] bg-[#EDE4D8] mb-2 overflow-hidden">
                              {p.images?.[0] && <img src={p.images[0]} alt={p.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                            </div>
                            <div className="text-xs text-[#3B2618] leading-snug">{p.name_en}</div>
                            <div className="text-xs text-[#A68A72] mt-0.5">{formatPrice(undefined, p.price_gbp)}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-[#A68A72]">No results found.</p>
              ) : (
                <div>
                  <div className="text-[10px] tracking-[0.25em] uppercase text-[#8B5E3C] mb-6">Results</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8">
                    {searchResults.map(p => (
                      <Link key={p.id} to={productPath(p)} onClick={closeSearch} className="group">
                        <div className="aspect-[3/4] bg-[#EDE4D8] mb-3 overflow-hidden rounded-sm">
                          {p.images?.[0] && <img src={p.images[0]} alt={p.name_en} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                        </div>
                        <div className="text-sm text-[#3B2618] leading-tight font-medium">{p.name_en}</div>
                        <div className="text-xs text-[#A68A72] mt-1">{formatPrice(undefined, p.price_gbp)}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
          {/* Backdrop clicável para fechar no desktop */}
          <div className="hidden min-[1120px]:block fixed inset-0 z-[-1]" onClick={closeSearch} />
        </div>
      )}
    </>
  );
};

export default Header;
