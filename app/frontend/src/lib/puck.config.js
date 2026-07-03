import React from "react";
import { Link } from "react-router-dom";
import { imageField } from "./ImageField";
import { mediaField, isVideo as isVideoUrl } from "./MediaField";
import { buildWaUrl } from "./whatsapp";
import { API } from "./api";
import { getProducts } from "./dataCache";
import { productSlug } from "./slug";
import ProductCard from "../components/ProductCard";
import { useApp } from "../contexts/AppContext";

// Paleta da marca (mesma do site)
const BROWN = "#8B5E3C";
const BROWN_DARK = "#5C3A21";
const DARK = "#3B2618";
const CREAM = "#F9F6F0";
const SAND = "#EDE4D8";

const alignClass = (a) =>
  a === "center" ? "text-center" : a === "right" ? "text-right" : "text-left";

// Posicao de cada elemento (texto/botao) dentro de blocos com imagem de fundo
const selfClass = (h) =>
  h === "right"
    ? "self-end text-right"
    : h === "center"
    ? "self-center text-center"
    : "self-start text-left";
// Posicao vertical do grupo todo (coluna)
const justifyColClass = (v) =>
  v === "top" ? "justify-start" : v === "bottom" ? "justify-end" : "justify-center";

const posOptions = (vertical) =>
  vertical
    ? [
        { label: "Cima", value: "top" },
        { label: "Meio", value: "center" },
        { label: "Baixo", value: "bottom" },
      ]
    : [
        { label: "Esquerda", value: "left" },
        { label: "Centro", value: "center" },
        { label: "Direita", value: "right" },
      ];

// ---- Helpers de estilo livre ----

// Campo de cor reutilizavel (color picker + caixa de texto p/ hex ou "transparent")
const colorField = (label) => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => {
    const v = value || "";
    const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="color"
          value={isHex ? v : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 34, height: 28, padding: 0, border: "1px solid #ddd", background: "none", cursor: "pointer" }}
        />
        <input
          type="text"
          value={v}
          placeholder="#000000 / transparent"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, padding: "6px 8px", border: "1px solid #ddd", fontSize: 13, minWidth: 0 }}
        />
        {v ? (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Limpar"
            style={{ border: "1px solid #ddd", background: "#fff", cursor: "pointer", padding: "3px 8px" }}
          >
            ×
          </button>
        ) : null}
      </div>
    );
  },
});

const weightField = (label = "Peso") => ({
  type: "select",
  label,
  options: [
    { label: "Fino", value: "300" },
    { label: "Normal", value: "400" },
    { label: "Medio", value: "500" },
    { label: "Semi-negrito", value: "600" },
    { label: "Negrito", value: "700" },
    { label: "Extra", value: "800" },
  ],
});

const fontField = (label = "Tipo de letra") => ({
  type: "radio",
  label,
  options: [
    { label: "Serif (titulos)", value: "serif" },
    { label: "Normal", value: "sans" },
  ],
});

const alignField = (label = "Alinhamento") => ({
  type: "radio",
  label,
  options: [
    { label: "Esq", value: "left" },
    { label: "Centro", value: "center" },
    { label: "Dir", value: "right" },
  ],
});

// margem horizontal p/ centrar/alinhar um bloco com largura maxima
const blockMargin = (align) => ({
  marginLeft: align === "center" || align === "right" ? "auto" : undefined,
  marginRight: align === "center" || align === "left" ? "auto" : undefined,
});

const justifyMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
};
const alignMap = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

// px helper: numero -> "Npx" (0 e' valido, p/ padding/raio). Vazio -> undefined.
const px = (n) => (n != null && n !== "" ? `${n}px` : undefined);
// pxAuto: como px, mas 0 (ou vazio) -> undefined (p/ tamanhos "0 = auto").
const pxAuto = (n) => (n ? `${n}px` : undefined);

// cor (hex/transparent) + opacidade (0-100) -> rgba()
const hexA = (hex, pct) => {
  const o = (pct == null ? 100 : pct) / 100;
  if (!hex || hex === "transparent") return `rgba(59,38,24,${o})`;
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(59,38,24,${o})`;
  return `rgba(${r},${g},${b},${o})`;
};

// Campos de overlay reutilizaveis (para Hero/Banner)
const overlayFields = () => ({
  overlayType: {
    type: "radio",
    label: "Tipo de overlay",
    options: [
      { label: "Gradiente", value: "gradiente" },
      { label: "Solido", value: "solido" },
      { label: "Nenhum", value: "nenhum" },
    ],
  },
  overlayColor: colorField("Cor do overlay"),
  overlayOpacity: { type: "number", label: "Intensidade (0-100)", min: 0, max: 100 },
});
const overlayBg = (type, color, opacity) => {
  if (type === "nenhum") return undefined;
  if (type === "solido") return hexA(color, opacity);
  return `linear-gradient(to right, ${hexA(color, opacity)}, ${hexA(color, (opacity || 0) * 0.45)}, transparent)`;
};

// Sim/Nao
const yesNo = (label) => ({
  type: "radio",
  label,
  options: [
    { label: "Nao", value: "nao" },
    { label: "Sim", value: "sim" },
  ],
});

// Campos de superficie (fundo + espacamento vertical da seccao)
const surfaceFields = () => ({
  bg: colorField("Fundo"),
  padTop: { type: "number", label: "Espaco acima (px)" },
  padBottom: { type: "number", label: "Espaco abaixo (px)" },
});
const surfaceStyle = (bg, padTop, padBottom) => ({
  background: bg || "transparent",
  paddingTop: padTop != null ? `${padTop}px` : undefined,
  paddingBottom: padBottom != null ? `${padBottom}px` : undefined,
});

// Posicao da imagem (object-position)
const objectPositionField = (label = "Posicao da imagem") => ({
  type: "select",
  label,
  options: [
    { label: "Centro", value: "center" },
    { label: "Topo", value: "top" },
    { label: "Baixo", value: "bottom" },
    { label: "Esquerda", value: "left" },
    { label: "Direita", value: "right" },
  ],
});

const ratioField = (label = "Formato") => ({
  type: "select",
  label,
  options: [
    { label: "Automatico", value: "auto" },
    { label: "Paisagem (4:3)", value: "4 / 3" },
    { label: "Largo (16:9)", value: "16 / 9" },
    { label: "Quadrado (1:1)", value: "1 / 1" },
    { label: "Retrato (3:4)", value: "3 / 4" },
    { label: "Retrato alto (5:4)", value: "5 / 4" },
  ],
});

const fitField = (label = "Preenchimento") => ({
  type: "radio",
  label,
  options: [
    { label: "Cobrir", value: "cover" },
    { label: "Conter", value: "contain" },
  ],
});

// Classe responsiva de colunas (literais p/ o Tailwind apanhar)
const colsClass = (n) =>
  n === "4" ? "sm:grid-cols-2 lg:grid-cols-4" : n === "2" ? "sm:grid-cols-2" : "sm:grid-cols-3";

// filtro CSS (p&b + desfoque)
const imgFilter = (grayscale, blur) =>
  [grayscale === "sim" ? "grayscale(1)" : "", blur ? `blur(${blur}px)` : ""].filter(Boolean).join(" ") || undefined;

// Botao que funciona com link interno (/shop) ou externo (https / wa.me)
// Estilos inline (sem classes Tailwind dinamicas, para compilar estaticamente)
const SmartButton = ({ text, link, variant }) => {
  const outline = variant === "outline";
  const style = {
    display: "inline-block",
    padding: "16px 36px",
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    textDecoration: "none",
    transition: "background-color .2s, color .2s",
    cursor: "pointer",
    background: outline ? "transparent" : BROWN,
    color: outline ? BROWN : CREAM,
    border: outline ? `1px solid ${BROWN}` : "1px solid transparent",
  };
  const isInternal = link && link.startsWith("/");
  if (isInternal) {
    return (
      <Link to={link} style={style}>
        {text}
      </Link>
    );
  }
  return (
    <a href={link || "#"} target="_blank" rel="noopener noreferrer" style={style}>
      {text}
    </a>
  );
};

// ---- Icones (SVG inline, sem dependencias) ----
const ICONS = {
  estrela: "M12 2l3 6.5 7 .9-5 4.8 1.2 7L12 17.8 5.6 21.2 6.8 14.2 1.8 9.4l7-.9z",
  coracao: "M12 21s-7.5-4.6-10-9.1C.4 8.8 2 5.5 5.2 5.5c2 0 3.2 1.2 3.8 2.3.6-1.1 1.8-2.3 3.8-2.3 3.2 0 4.8 3.3 3.2 6.4C19.5 16.4 12 21 12 21z",
  check: "M20 6L9 17l-5-5",
  telefone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  email: "M4 4h16v16H4z M22 6l-10 7L2 6",
  local: "M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  relogio: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 6v6l4 2",
  folha: "M11 20A7 7 0 0 1 4 13c0-6 7-11 16-11 0 9-5 16-11 16z M4 21c2-4 5-7 9-9",
  fogo: "M12 2s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s-3 2-3 6a6 6 0 0 0 12 0c0-6-6-12-6-12z",
  seta: "M5 12h14 M13 6l6 6-6 6",
  instagram: "M2 7a5 5 0 0 1 5-5h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5z M16 11.4a4 4 0 1 1-8 .6 4 4 0 0 1 8-.6z M17.5 6.5h.01",
  whatsapp: "M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5z",
};

const ICON_OPTIONS = [
  { label: "Estrela", value: "estrela" },
  { label: "Coracao", value: "coracao" },
  { label: "Visto", value: "check" },
  { label: "Telefone", value: "telefone" },
  { label: "Email", value: "email" },
  { label: "Localizacao", value: "local" },
  { label: "Relogio", value: "relogio" },
  { label: "Folha", value: "folha" },
  { label: "Fogo", value: "fogo" },
  { label: "Seta", value: "seta" },
  { label: "Instagram", value: "instagram" },
  { label: "WhatsApp", value: "whatsapp" },
];

const IconSvg = ({ name, size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {(ICONS[name] || ICONS.estrela).split(" M").map((d, i) => (
      <path key={i} d={(i === 0 ? d : "M" + d)} />
    ))}
  </svg>
);

// ---- Formulario (envia para WhatsApp) ----
const FormBlock = ({ title, fields, button, whatsapp, color, bg, radius }) => {
  const list = (fields || "").split(",").map((s) => s.trim()).filter(Boolean);
  const [vals, setVals] = React.useState({});
  const submit = (e) => {
    e.preventDefault();
    const msg = list.map((f) => `${f}: ${vals[f] || ""}`).join("\n");
    window.open(buildWaUrl(whatsapp, msg), "_blank", "noopener,noreferrer");
  };
  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid rgba(59,38,24,.25)",
    borderRadius: radius ? `${radius}px` : 4,
    fontSize: 14,
    background: "#fff",
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {title ? <div style={{ fontSize: 18, fontWeight: 600, color: "#3B2618", marginBottom: 4 }}>{title}</div> : null}
      {list.map((f) =>
        /mensagem|message|coment/i.test(f) ? (
          <textarea key={f} placeholder={f} rows={4} style={inputStyle} onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))} />
        ) : (
          <input key={f} placeholder={f} style={inputStyle} onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))} />
        )
      )}
      <button
        type="submit"
        style={{
          background: bg || "#8B5E3C",
          color: color || "#F9F6F0",
          padding: "12px 18px",
          border: "none",
          borderRadius: radius ? `${radius}px` : 4,
          cursor: "pointer",
          fontSize: 13,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {button || "Enviar"}
      </button>
    </form>
  );
};

// ---- Sub-componentes para seccoes ricas (reutilizaveis) ----

// Campos reutilizaveis do cabecalho de seccao (texto + estilo)
const headFields = () => ({
  eyebrow: { type: "text", label: "Texto pequeno" },
  eyebrowColor: colorField("Cor do texto pequeno"),
  eyebrowSize: { type: "number", label: "Tamanho do texto pequeno (px, 0=auto)" },
  title: { type: "text", label: "Titulo" },
  titleColor: colorField("Cor do titulo"),
  titleSize: { type: "number", label: "Tamanho do titulo (px, 0=auto)" },
  headAlign: alignField("Alinhamento do cabecalho"),
});
const headDefaults = (eyebrow, title, titleSize = 0) => ({
  eyebrow,
  eyebrowColor: BROWN,
  eyebrowSize: 0,
  title,
  titleColor: DARK,
  titleSize,
  headAlign: "center",
});

const SectionHead = ({ eyebrow, title, eyebrowColor, eyebrowSize, titleColor, titleSize, headAlign = "center" }) => (
  <div className={`max-w-2xl mb-12 ${headAlign === "center" ? "mx-auto" : ""} ${alignClass(headAlign)}`}>
    {eyebrow ? (
      <div
        className={`tracking-[0.3em] uppercase mb-3 ${eyebrowSize ? "" : "text-[12px]"}`}
        style={{ color: eyebrowColor || BROWN, fontSize: pxAuto(eyebrowSize) }}
      >
        {eyebrow}
      </div>
    ) : null}
    {title ? (
      <h2
        className={`font-serif-display leading-[1.1] ${titleSize ? "" : "text-3xl sm:text-4xl lg:text-5xl"}`}
        style={{ color: titleColor || DARK, fontSize: pxAuto(titleSize) }}
      >
        {title}
      </h2>
    ) : null}
  </div>
);

// Passa as props de cabecalho para o SectionHead
const headProps = (p) => ({
  eyebrow: p.eyebrow,
  title: p.title,
  eyebrowColor: p.eyebrowColor,
  eyebrowSize: p.eyebrowSize,
  titleColor: p.titleColor,
  titleSize: p.titleSize,
  headAlign: p.headAlign,
});

const FaqBlock = ({ items, questionColor, questionSize, answerColor, answerSize, iconColor, dividerColor }) => {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="max-w-3xl mx-auto">
      {(items || []).map((it, i) => (
        <div key={i} className="border-t py-5" style={{ borderColor: dividerColor || "rgba(139,94,60,.18)" }}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            className="w-full flex items-center justify-between gap-4 text-left"
            aria-expanded={open === i}
          >
            <span className={`font-serif-display ${questionSize ? "" : "text-lg"}`} style={{ color: questionColor || DARK, fontSize: pxAuto(questionSize) }}>{it.question}</span>
            <span style={{ color: iconColor || BROWN, fontSize: 22, lineHeight: 1 }}>{open === i ? "–" : "+"}</span>
          </button>
          {open === i && it.answer ? (
            <p className="mt-3 leading-relaxed" style={{ color: answerColor || "rgba(59,38,24,.75)", fontSize: pxAuto(answerSize) }}>{it.answer}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const NewsletterBlock = ({ email, placeholder, button, color, bg }) => {
  const [val, setVal] = React.useState("");
  const submit = (e) => {
    e.preventDefault();
    const to = email || "escentialfragrance05@gmail.com";
    window.location.href = `mailto:${to}?subject=Newsletter&body=${encodeURIComponent("Subscribe: " + val)}`;
  };
  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto w-full">
      <input
        type="email"
        required
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder || "Your email"}
        className="flex-1 px-4 py-3 text-sm outline-none"
        style={{ border: "1px solid rgba(0,0,0,.15)", background: "#fff" }}
      />
      <button
        type="submit"
        className="px-7 py-3 text-[11px] tracking-[0.22em] uppercase whitespace-nowrap"
        style={{ background: bg || BROWN, color: color || CREAM }}
      >
        {button || "Subscribe"}
      </button>
    </form>
  );
};

const FeaturedProductsBlock = ({ source, limit, compact = false }) => {
  const [products, setProducts] = React.useState([]);
  React.useEffect(() => {
    let on = true;
    getProducts()
      .then((d) => { if (on) setProducts(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { on = false; };
  }, []);
  let list = [...products];
  if (source === "home") {
    // So produtos marcados "Mostrar na Home" (sem fallback)
    list = list.filter((p) => p.show_home);
  } else if (source === "featured") {
    const f = list.filter((p) => p.featured);
    if (f.length) list = f;
  }
  list = list.slice(0, limit || 4);
  if (list.length === 0) {
    return <p className="text-center text-sm" style={{ color: "#A68A72" }}>Sem produtos para mostrar.</p>;
  }
  const gridCls = compact
    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-3 md:gap-4"
    : "grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8";
  return (
    <div className={gridCls}>
      {list.map((p, i) => <ProductCard key={p.id} product={p} index={i} compact={compact} />)}
    </div>
  );
};

// Pre-visualizacao do header do site (so dentro do editor, para dar contexto)
const EditorHeaderPreview = () => {
  const { settings } = useApp();
  const logo = settings?.branding?.logo || "/static/img/logo-full.png";
  const hs = settings?.header || {};
  const customNav =
    Array.isArray(settings?.nav) && settings.nav.length > 0
      ? settings.nav.map((n) => n.label)
      : ["Home", "Shop", "About", "Fragrances", "Contact"];
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
          padding: "10px 40px",
          background: hs.bg || "#F9F6F0",
          borderBottom: `1px solid ${hs.border || "rgba(139,94,60,.15)"}`,
          pointerEvents: "none",
        }}
      >
        <img src={logo} alt="logo" style={{ height: hs.logoHeight ? `${hs.logoHeight}px` : 60, width: "auto", objectFit: "contain" }} />
        <nav style={{ display: "flex", gap: 36, flexWrap: "wrap" }}>
          {customNav.map((t, i) => (
            <span key={i} style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: hs.text || "#3B2618" }}>
              {t}
            </span>
          ))}
        </nav>
        <div style={{ width: 60 }} />
      </div>
    </div>
  );
};

// Pre-visualizacao do footer (so dentro do editor) — apenas visual, sem edicao
const EditorFooterPreview = () => {
  const { settings } = useApp();
  const fs = settings?.footer || {};
  const logo = settings?.branding?.logo || "/static/img/logo-full.png";
  return (
    <div
      style={{
        padding: "20px 40px",
        background: fs.bg || "#F9F6F0",
        borderTop: `1px solid ${fs.border || "rgba(139,94,60,.15)"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      <img src={logo} alt="logo" style={{ height: 48, width: "auto", objectFit: "contain" }} />
    </div>
  );
};

// Revela cada seccao de topo ao entrar no ecra (efeito editorial). Desligado no editor.
const RevealRoot = ({ children, editor }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (editor || !ref.current) return;
    const sections = Array.from(ref.current.children).filter(
      (el) => !el.dataset.noReveal
    );
    sections.forEach((el) => el.classList.add("reveal"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("reveal-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [editor, children]);
  return (
    <main ref={ref} data-testid="home-page" style={{ background: CREAM }}>
      {children}
    </main>
  );
};

// Hook de parallax partilhado
const useParallax = (sectionRef, imgRef, speed = 0.2) => {
  React.useEffect(() => {
    const img = imgRef.current;
    const section = sectionRef.current;
    if (!img || !section) return;
    let raf = null;
    const update = () => {
      raf = null;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      img.style.transform = `translateY(${-rect.top * speed}px)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
};

// Grelha de fragrâncias com cartões clicáveis (produto correspondente ou Shop filtrado)
const FragrancesInner = (p) => {
  const [products, setProducts] = React.useState([]);

  React.useEffect(() => {
    getProducts()
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]));
  }, []);

  // Resolve destino: produto com nome igual -> /product/:id ; senão -> /shop?q=nome
  const resolveHref = (cat) => {
    const name = String(cat.name || "").trim();
    if (!name) return "/shop";
    const match = products.find(
      (prod) => String(prod.name_en || "").trim().toLowerCase() === name.toLowerCase()
    );
    if (match) return `/product/${productSlug(match) || match.id}`;
    return `/shop?q=${encodeURIComponent(name)}`;
  };

  return (
    <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || CREAM, p.padTop, p.padBottom)}>
      {(p.eyebrow || p.title) ? (
        <div className={`mb-14 max-w-xl ${p.headAlign === "center" ? "mx-auto" : ""} ${alignClass(p.headAlign)}`}>
          {p.eyebrow ? (
            <div className="tracking-[0.3em] uppercase mb-3" style={{ color: p.eyebrowColor || BROWN, fontSize: "10px" }}>
              {p.eyebrow}
            </div>
          ) : null}
          {p.title ? (
            <h2 className="font-serif-display leading-[1.1]" style={{ color: p.titleColor || DARK, fontSize: pxAuto(p.titleSize) }}>
              {p.title}
            </h2>
          ) : null}
        </div>
      ) : null}
      <div className={`grid grid-cols-1 ${colsClass(p.columns)} max-w-5xl mx-auto`} style={{ gap: px(p.gap) || "40px" }}>
        {(p.items || []).map((cat, i) => (
          <Link
            key={i}
            to={resolveHref(cat)}
            className={`group block transition-transform duration-300 hover:-translate-y-1 ${alignClass(p.cardAlign)}`}
            style={{
              background: p.cardBg || "transparent",
              padding: px(p.cardPadding),
              borderRadius: px(p.cardRadius),
              border: p.cardBorderWidth ? `${p.cardBorderWidth}px solid ${p.cardBorderColor || "#000"}` : undefined,
              boxShadow: p.cardShadow === "sim" ? "0 14px 32px rgba(59,38,24,.14)" : undefined,
            }}
          >
            <div
              className="mb-5 overflow-hidden"
              style={{ aspectRatio: p.imgRatio !== "auto" ? p.imgRatio : undefined, borderRadius: px(p.imgRadius), background: SAND }}
            >
              <img
                src={cat.image}
                alt={String(cat.name || "")}
                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                style={{ objectFit: p.imgFit || "cover", display: "block" }}
              />
            </div>
            <h3 className="tracking-[0.25em] uppercase mb-2 transition-colors group-hover:text-[#8B5E3C]" style={{ color: p.nameColor || DARK, fontSize: pxAuto(p.nameSize) }}>
              {String(cat.name || "")}
            </h3>
            <p className="leading-relaxed mb-3" style={{ color: p.descColor || "rgba(59,38,24,.75)", fontSize: pxAuto(p.descSize) }}>
              {cat.desc}
            </p>
            {p.showNotes === "sim" && cat.notes ? (
              <p style={{ color: p.notesColor || "#A68A72", fontSize: pxAuto(p.notesSize) }}>
                <span style={{ color: p.nameColor || DARK, fontWeight: 600 }}>Notas:</span> {cat.notes}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
};

// Hero (páginas About / Fragrances / Contact) com parallax
const HeroInner = (p) => {
  const sectionRef = React.useRef(null);
  const wrapRef = React.useRef(null);
  useParallax(sectionRef, wrapRef);
  const height = p.heightCustom ? `${p.heightCustom}px` : p.height || "68vh";
  const ob = overlayBg(p.overlayType, p.overlayColor || DARK, p.overlayOpacity);
  const tmw = p.textMaxWidth ? `${p.textMaxWidth}px` : undefined;
  return (
    <section ref={sectionRef} data-no-reveal="true" className="relative w-full overflow-hidden" style={{ height, minHeight: 420, maxHeight: 760 }}>
      <div ref={wrapRef} className="absolute left-0 right-0 w-full" style={{ top: "-20%", height: "140%", willChange: "transform" }}>
        <img
          src={p.image}
          alt={p.title}
          className="hero-img w-full h-full"
          style={{ objectFit: p.imgFit || "cover", objectPosition: p.imgObjectPos || "center" }}
        />
      </div>
      {ob ? <div className="absolute inset-0" style={{ background: ob }} /> : null}
      <div className={`relative h-full w-full flex flex-col px-6 md:px-12 lg:px-20 ${justifyColClass(p.vpos)}`}>
        <h1
          className={`fade-up fade-up-delay-1 font-serif-display tracking-[0.08em] leading-[1.05] max-w-xl ${p.titleSize ? "" : "text-5xl sm:text-6xl lg:text-7xl"} ${selfClass(p.titlePos)}`}
          style={{ color: p.titleColor || CREAM, fontSize: pxAuto(p.titleSize), maxWidth: tmw, opacity: 0 }}
        >
          {p.title}
        </h1>
        {p.subtitle ? (
          <p
            className={`fade-up fade-up-delay-2 mt-5 tracking-[0.22em] uppercase max-w-xl ${p.subtitleSize ? "" : "text-sm sm:text-base"} ${selfClass(p.subtitlePos)}`}
            style={{ color: p.subtitleColor || "rgba(249,246,240,.9)", fontSize: pxAuto(p.subtitleSize), maxWidth: tmw, opacity: 0 }}
          >
            {p.subtitle}
          </p>
        ) : null}
        {p.ctaText ? (
          <div className={`fade-up fade-up-delay-3 mt-9 ${selfClass(p.ctaPos)}`} style={{ opacity: 0 }}>
            <SmartButton text={p.ctaText} link={p.ctaLink} variant={p.ctaVariant || "solid"} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

const HeroSplitInner = (p) => {
  const wrapRef = React.useRef(null);
  const sectionRef = React.useRef(null);
  useParallax(sectionRef, wrapRef);

  const vh = p.minHeight || 92;
  const oc = p.overlayColor || CREAM;
  const oa = ((p.overlayOpacity ?? 85) / 100).toFixed(2);
  const m = oc.replace("#", "");
  const expand = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(expand.slice(0, 2), 16);
  const g = parseInt(expand.slice(2, 4), 16);
  const b = parseInt(expand.slice(4, 6), 16);
  const rgba = (a) => `rgba(${r},${g},${b},${a})`;
  let overlay = null;
  if (p.overlayType === "solid") overlay = rgba(oa);
  else if (p.overlayType === "grad-left") overlay = `linear-gradient(to right, ${rgba(oa)} 0%, ${rgba(Math.max(0, oa - 0.3))} 45%, transparent 75%)`;
  else if (p.overlayType === "grad-right") overlay = `linear-gradient(to left, ${rgba(oa)} 0%, ${rgba(Math.max(0, oa - 0.3))} 45%, transparent 75%)`;
  const isLeft = p.textSide !== "right";

  return (
    <section ref={sectionRef} data-no-reveal="true" className="relative w-full overflow-hidden" style={{ minHeight: `${vh}vh` }}>
      <div
        ref={wrapRef}
        className="absolute left-0 right-0 w-full cursor-pointer"
        style={{ top: "-20%", height: "140%", willChange: "transform" }}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <img
          src={p.image}
          alt={p.title}
          className="hero-img w-full h-full"
          style={{ objectFit: p.imgFit || "cover", objectPosition: p.imgObjectPos || "center" }}
        />
      </div>
      {overlay ? (
        <div
          className="absolute inset-0"
          style={{
            background: overlay,
            maskImage: "linear-gradient(to bottom, transparent 0px, black 88px)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0px, black 88px)",
          }}
        />
      ) : null}
      <div
        className={`relative h-full w-full flex flex-col justify-center py-24 ${isLeft ? "items-start" : "items-end"}`}
        style={{
          minHeight: `${vh}vh`,
          paddingLeft: p.padLeft ? `clamp(20px, ${(p.padLeft / 14.4).toFixed(1)}vw, ${p.padLeft}px)` : "clamp(20px, 10vw, 10%)",
          paddingRight: "5%",
        }}
      >
        <div
          className={`fade-up fade-up-delay-1 flex flex-col ${isLeft ? "items-start text-left" : "items-end text-right"}`}
          style={{ opacity: 0, maxWidth: 540 }}
        >
          {p.eyebrow ? (
            <div className="tracking-[0.3em] uppercase mb-5 text-[11px]" style={{ color: p.eyebrowColor || BROWN }}>
              {p.eyebrow}
            </div>
          ) : null}
          <h1
            className={`font-serif-display leading-[1.08] ${p.titleSize ? "" : "text-4xl sm:text-5xl lg:text-6xl"}`}
            style={{ color: p.titleColor || DARK, fontSize: pxAuto(p.titleSize), whiteSpace: "pre-line" }}
          >
            {p.title}
          </h1>
          {p.subtitle ? (
            <div className="mt-6 font-semibold" style={{ color: p.subtitleColor || DARK, fontSize: 16 }}>
              {p.subtitle}
            </div>
          ) : null}
          {(p.bullets || []).length ? (
            <ul className="mt-5 flex flex-col gap-3">
              {(p.bullets || []).map((bul, i) => (
                <li key={i} className={`flex items-center gap-3 ${isLeft ? "" : "flex-row-reverse"}`}
                  style={{ color: p.textColor || "rgba(59,38,24,.85)", fontSize: 14 }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${p.bulletColor || BROWN}`, flexShrink: 0, display: "inline-block" }} />
                  <span>{bul.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {p.ctaText ? (
            <div className="mt-10">
              {(p.ctaLink || "").startsWith("/") ? (
                <Link to={p.ctaLink} style={{ display: "inline-block", background: p.btnBg || DARK, color: p.btnColor || CREAM, padding: "16px 38px", borderRadius: 999, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none" }}>
                  {p.ctaText}
                </Link>
              ) : (
                <a href={p.ctaLink || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: p.btnBg || DARK, color: p.btnColor || CREAM, padding: "16px 38px", borderRadius: 999, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", textDecoration: "none" }}>
                  {p.ctaText}
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export const puckConfig = {
  root: {
    render: ({ children, puck }) => {
      const editor = !!(puck && (puck.isEditing || (puck.metadata && puck.metadata.editor)));
      if (editor) {
        return (
          <main data-testid="home-page" style={{ background: CREAM }}>
            <EditorHeaderPreview />
            {children}
            <EditorFooterPreview />
          </main>
        );
      }
      return <RevealRoot editor={false}>{children}</RevealRoot>;
    },
  },

  components: {
    // ---------- HERO (banner grande com imagem de fundo) ----------
    Hero: {
      label: "Hero (banner topo)",
      fields: {
        image: imageField("Imagem"),
        title: { type: "text", label: "Titulo", contentEditable: true },
        subtitle: { type: "text", label: "Subtitulo", contentEditable: true },
        ctaText: { type: "text", label: "Texto do botao" },
        ctaLink: { type: "text", label: "Link do botao" },
        ctaVariant: {
          type: "radio",
          label: "Estilo do botao",
          options: [
            { label: "Cheio", value: "solid" },
            { label: "Contorno", value: "outline" },
          ],
        },
        height: {
          type: "select",
          label: "Altura",
          options: [
            { label: "Media", value: "55vh" },
            { label: "Grande", value: "68vh" },
            { label: "Ecra inteiro", value: "92vh" },
          ],
        },
        heightCustom: { type: "number", label: "Altura personalizada (px, 0 = usar acima)" },
        imgFit: fitField("Preenchimento da imagem"),
        imgObjectPos: objectPositionField(),
        ...overlayFields(),
        vpos: {
          type: "radio",
          label: "Posicao vertical (grupo)",
          options: posOptions(true),
        },
        titlePos: { type: "radio", label: "Titulo: posicao", options: posOptions(false) },
        subtitlePos: { type: "radio", label: "Subtitulo: posicao", options: posOptions(false) },
        ctaPos: { type: "radio", label: "Botao: posicao", options: posOptions(false) },
        textMaxWidth: { type: "number", label: "Largura max. do texto (px, 0 = auto)" },
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px, 0 = auto)" },
        subtitleColor: colorField("Cor do subtitulo"),
        subtitleSize: { type: "number", label: "Tamanho do subtitulo (px, 0 = auto)" },
      },
      defaultProps: {
        image: "/static/img/hero.webp",
        title: "Velas Artesanais",
        subtitle: "Aromas que transformam o ambiente",
        ctaText: "Ver Coleccao",
        ctaLink: "/shop",
        ctaVariant: "solid",
        height: "68vh",
        heightCustom: 0,
        imgFit: "cover",
        imgObjectPos: "center",
        overlayType: "gradiente",
        overlayColor: DARK,
        overlayOpacity: 45,
        vpos: "center",
        titlePos: "left",
        subtitlePos: "left",
        ctaPos: "left",
        textMaxWidth: 0,
        titleColor: CREAM,
        titleSize: 0,
        subtitleColor: "rgba(249,246,240,.9)",
        subtitleSize: 0,
      },
      render: (p) => <HeroInner {...p} />,
    },

    // ---------- HERO SPLIT (imagem fundo + texto sobreposto) ----------
    HeroSplit: {
      label: "Hero (imagem + texto sobreposto)",
      fields: {
        image: imageField("Imagem"),
        imgFit: fitField("Preenchimento da imagem"),
        imgObjectPos: objectPositionField(),
        minHeight: { type: "number", label: "Altura (vh)", min: 40, max: 100 },
        overlayType: {
          type: "radio",
          label: "Overlay",
          options: [
            { label: "Nenhum", value: "none" },
            { label: "Gradiente esq.", value: "grad-left" },
            { label: "Gradiente dir.", value: "grad-right" },
            { label: "Solido", value: "solid" },
          ],
        },
        overlayColor: colorField("Cor do overlay"),
        overlayOpacity: { type: "number", label: "Intensidade overlay (0-100)", min: 0, max: 100 },
        textSide: {
          type: "radio",
          label: "Lado do texto",
          options: [
            { label: "Esquerda", value: "left" },
            { label: "Direita", value: "right" },
          ],
        },
        eyebrow: { type: "text", label: "Texto pequeno (topo)", contentEditable: true },
        title: { type: "textarea", label: "Titulo", contentEditable: true },
        subtitle: { type: "text", label: "Subtitulo (negrito)", contentEditable: true },
        bullets: {
          type: "array",
          label: "Pontos (lista)",
          arrayFields: { text: { type: "text", contentEditable: true } },
          getItemSummary: (it) => it.text || "Ponto",
        },
        ctaText: { type: "text", label: "Texto do botao" },
        ctaLink: { type: "text", label: "Link do botao" },
        eyebrowColor: colorField("Cor do texto pequeno"),
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px, 0=auto)" },
        subtitleColor: colorField("Cor do subtitulo"),
        bulletColor: colorField("Cor dos circulos"),
        textColor: colorField("Cor da lista"),
        btnBg: colorField("Cor do botao"),
        btnColor: colorField("Cor do texto do botao"),
        padLeft: { type: "number", label: "Margem esquerda do texto (px)" },
      },
      defaultProps: {
        image: "/static/img/hero.webp",
        imgFit: "cover",
        imgObjectPos: "center",
        minHeight: 92,
        overlayType: "grad-left",
        overlayColor: CREAM,
        overlayOpacity: 85,
        textSide: "left",
        eyebrow: "ESCENTIAL",
        title: "Turning spaces\ninto memories.",
        subtitle: "Find your Escential scent.",
        bullets: [
          { text: "Hand-poured natural wax candles." },
          { text: "Long-lasting, clean fragrance." },
        ],
        ctaText: "Shop our full range",
        ctaLink: "/shop",
        eyebrowColor: BROWN,
        titleColor: DARK,
        titleSize: 0,
        subtitleColor: DARK,
        bulletColor: BROWN,
        textColor: "rgba(59,38,24,.85)",
        btnBg: DARK,
        btnColor: CREAM,
      },
      render: (p) => <HeroSplitInner {...p} />,
    },

    // ---------- HEADING ----------
    Heading: {
      label: "Titulo",
      fields: {
        text: { type: "text", label: "Texto", contentEditable: true },
        fontSize: { type: "number", label: "Tamanho (px)", min: 8 },
        color: colorField("Cor"),
        weight: weightField(),
        font: fontField(),
        align: alignField(),
        letterSpacing: { type: "number", label: "Espaco entre letras (px)" },
        lineHeight: { type: "number", label: "Altura da linha (x)", min: 0.5 },
        maxWidth: { type: "number", label: "Largura maxima (px, 0 = total)" },
        spacing: { type: "number", label: "Espaco acima/abaixo (px)" },
      },
      defaultProps: {
        text: "Titulo da seccao",
        fontSize: 44,
        color: DARK,
        weight: "400",
        font: "serif",
        align: "center",
        letterSpacing: 1,
        lineHeight: 1.1,
        maxWidth: 0,
        spacing: 24,
      },
      render: ({ text, fontSize, color, weight, font, align, letterSpacing, lineHeight, maxWidth, spacing }) => (
        <div className="px-6 md:px-12 lg:px-20" style={{ paddingTop: spacing, paddingBottom: spacing }}>
          <h2
            className={`${font === "serif" ? "font-serif-display" : ""} ${alignClass(align)}`}
            style={{
              color: color || DARK,
              fontSize: fontSize ? `${fontSize}px` : undefined,
              fontWeight: weight ? Number(weight) : undefined,
              letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
              lineHeight: lineHeight || undefined,
              maxWidth: maxWidth ? `${maxWidth}px` : undefined,
              ...blockMargin(align),
            }}
          >
            {text}
          </h2>
        </div>
      ),
    },

    // ---------- TEXTO ----------
    Text: {
      label: "Texto",
      fields: {
        text: { type: "textarea", label: "Texto", contentEditable: true },
        fontSize: { type: "number", label: "Tamanho (px)", min: 8 },
        color: colorField("Cor"),
        weight: weightField(),
        font: fontField(),
        align: alignField(),
        lineHeight: { type: "number", label: "Altura da linha (x)", min: 0.5 },
        letterSpacing: { type: "number", label: "Espaco entre letras (px)" },
        maxWidth: { type: "number", label: "Largura maxima (px, 0 = total)" },
        spacing: { type: "number", label: "Espaco acima/abaixo (px)" },
      },
      defaultProps: {
        text: "Escreve aqui o teu texto...",
        fontSize: 16,
        color: "#5C3A21",
        weight: "400",
        font: "sans",
        align: "center",
        lineHeight: 1.7,
        letterSpacing: 0,
        maxWidth: 672,
        spacing: 16,
      },
      render: ({ text, fontSize, color, weight, font, align, lineHeight, letterSpacing, maxWidth, spacing }) => (
        <div className="px-6 md:px-12 lg:px-20" style={{ paddingTop: spacing, paddingBottom: spacing }}>
          <p
            className={`${font === "serif" ? "font-serif-display" : ""} ${alignClass(align)}`}
            style={{
              color: color || "#5C3A21",
              fontSize: fontSize ? `${fontSize}px` : undefined,
              fontWeight: weight ? Number(weight) : undefined,
              lineHeight: lineHeight || undefined,
              letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
              maxWidth: maxWidth ? `${maxWidth}px` : undefined,
              whiteSpace: "pre-wrap",
              ...blockMargin(align),
            }}
          >
            {text}
          </p>
        </div>
      ),
    },

    // ---------- IMAGEM ----------
    ImageBlock: {
      label: "Imagem",
      fields: {
        src: imageField("Imagem"),
        alt: { type: "text", label: "Texto alternativo" },
        ratio: ratioField(),
        fit: fitField(),
        objectPos: objectPositionField(),
        maxWidth: { type: "number", label: "Largura maxima (px, 0 = total)" },
        height: { type: "number", label: "Altura (px, 0 = auto)" },
        radius: { type: "number", label: "Arredondar cantos (px)" },
        borderWidth: { type: "number", label: "Espessura da borda (px)" },
        borderColor: colorField("Cor da borda"),
        opacity: { type: "number", label: "Opacidade (0-100)", min: 0, max: 100 },
        grayscale: yesNo("Preto e branco"),
        blur: { type: "number", label: "Desfoque (px)" },
        align: alignField(),
        shadow: yesNo("Sombra"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        src: "/static/img/story.jpg",
        alt: "",
        ratio: "4 / 3",
        fit: "cover",
        objectPos: "center",
        maxWidth: 860,
        height: 0,
        radius: 0,
        borderWidth: 0,
        borderColor: "",
        opacity: 100,
        grayscale: "nao",
        blur: 0,
        align: "center",
        shadow: "nao",
        padTop: 32,
        padBottom: 32,
      },
      render: ({ src, alt, ratio, fit, objectPos, maxWidth, height, radius, borderWidth, borderColor, opacity, grayscale, blur, align, shadow, padTop, padBottom }) => (
        <div className="px-6 md:px-12 lg:px-20" style={{ paddingTop: px(padTop), paddingBottom: px(padBottom) }}>
          <div
            className="overflow-hidden"
            style={{
              maxWidth: maxWidth ? `${maxWidth}px` : "100%",
              height: height ? `${height}px` : undefined,
              aspectRatio: !height && ratio !== "auto" ? ratio : undefined,
              borderRadius: radius ? `${radius}px` : undefined,
              border: borderWidth ? `${borderWidth}px solid ${borderColor || "#000"}` : undefined,
              background: SAND,
              boxShadow: shadow === "sim" ? "0 18px 40px rgba(59,38,24,.22)" : undefined,
              ...blockMargin(align),
            }}
          >
            <img
              src={src}
              alt={alt}
              className="w-full h-full"
              style={{
                objectFit: fit || "cover",
                objectPosition: objectPos || "center",
                display: "block",
                opacity: opacity != null ? opacity / 100 : 1,
                filter: imgFilter(grayscale, blur),
              }}
            />
          </div>
        </div>
      ),
    },

    // ---------- BOTAO ----------
    Button: {
      label: "Botao",
      fields: {
        text: { type: "text", label: "Texto" },
        link: { type: "text", label: "Link (/shop ou https://...)" },
        bg: colorField("Cor de fundo"),
        color: colorField("Cor do texto"),
        fontSize: { type: "number", label: "Tamanho texto (px)", min: 8 },
        letterSpacing: { type: "number", label: "Espaco entre letras (px)" },
        padX: { type: "number", label: "Espaco lateral (px)" },
        padY: { type: "number", label: "Espaco cima/baixo (px)" },
        radius: { type: "number", label: "Arredondar cantos (px)" },
        borderWidth: { type: "number", label: "Espessura da borda (px)" },
        borderColor: colorField("Cor da borda"),
        uppercase: {
          type: "radio",
          label: "Maiusculas",
          options: [
            { label: "Sim", value: "sim" },
            { label: "Nao", value: "nao" },
          ],
        },
        align: alignField(),
      },
      defaultProps: {
        text: "Ver mais",
        link: "/shop",
        bg: BROWN,
        color: CREAM,
        fontSize: 11,
        letterSpacing: 2,
        padX: 36,
        padY: 16,
        radius: 0,
        borderWidth: 0,
        borderColor: "",
        uppercase: "sim",
        align: "center",
      },
      render: ({ text, link, bg, color, fontSize, letterSpacing, padX, padY, radius, borderWidth, borderColor, uppercase, align }) => {
        const style = {
          display: "inline-block",
          background: bg || "transparent",
          color: color || CREAM,
          fontSize: `${fontSize || 11}px`,
          letterSpacing: `${letterSpacing || 0}px`,
          padding: `${padY != null ? padY : 16}px ${padX != null ? padX : 36}px`,
          borderRadius: radius ? `${radius}px` : 0,
          border: borderWidth ? `${borderWidth}px solid ${borderColor || color || BROWN}` : "none",
          textTransform: uppercase === "nao" ? "none" : "uppercase",
          textDecoration: "none",
          cursor: "pointer",
          lineHeight: 1.2,
        };
        const isInternal = link && link.startsWith("/");
        const inner = isInternal ? (
          <Link to={link} style={style}>{text}</Link>
        ) : (
          <a href={link || "#"} target="_blank" rel="noopener noreferrer" style={style}>{text}</a>
        );
        return <div className={`px-6 md:px-12 lg:px-20 py-6 ${alignClass(align)}`}>{inner}</div>;
      },
    },

    // ---------- BANNER COM TEXTO ----------
    Banner: {
      label: "Banner (imagem + texto)",
      fields: {
        image: imageField("Imagem"),
        eyebrow: { type: "text", label: "Texto pequeno (topo)", contentEditable: true },
        title: { type: "text", label: "Titulo", contentEditable: true },
        ctaText: { type: "text", label: "Botao 1: texto" },
        ctaLink: { type: "text", label: "Botao 1: link" },
        ctaVariant: {
          type: "radio",
          label: "Botao 1: estilo",
          options: [
            { label: "Cheio", value: "solid" },
            { label: "Contorno", value: "outline" },
          ],
        },
        cta2Text: { type: "text", label: "Botao 2: texto (opcional)" },
        cta2Link: { type: "text", label: "Botao 2: link" },
        cta2Variant: {
          type: "radio",
          label: "Botao 2: estilo",
          options: [
            { label: "Cheio", value: "solid" },
            { label: "Contorno", value: "outline" },
          ],
        },
        height: {
          type: "select",
          label: "Altura",
          options: [
            { label: "Baixa", value: "42vh" },
            { label: "Media", value: "55vh" },
            { label: "Alta", value: "70vh" },
          ],
        },
        heightCustom: { type: "number", label: "Altura personalizada (px, 0 = usar acima)" },
        imgFit: fitField("Preenchimento da imagem"),
        imgObjectPos: objectPositionField(),
        ...overlayFields(),
        vpos: {
          type: "radio",
          label: "Posicao vertical (grupo)",
          options: posOptions(true),
        },
        eyebrowPos: { type: "radio", label: "Texto pequeno: posicao", options: posOptions(false) },
        titlePos: { type: "radio", label: "Titulo: posicao", options: posOptions(false) },
        ctaPos: { type: "radio", label: "Botao 1: posicao", options: posOptions(false) },
        cta2Pos: { type: "radio", label: "Botao 2: posicao", options: posOptions(false) },
        textMaxWidth: { type: "number", label: "Largura max. do texto (px, 0 = auto)" },
        eyebrowColor: colorField("Cor do texto pequeno"),
        eyebrowSize: { type: "number", label: "Tamanho do texto pequeno (px, 0 = auto)" },
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px, 0 = auto)" },
      },
      defaultProps: {
        image: "/static/img/feeling.webp",
        eyebrow: "Mais que uma fragrancia",
        title: "Uma experiencia",
        ctaText: "Fala connosco",
        ctaLink: "/shop",
        ctaVariant: "solid",
        cta2Text: "",
        cta2Link: "/shop",
        cta2Variant: "outline",
        height: "55vh",
        heightCustom: 0,
        imgFit: "cover",
        imgObjectPos: "center",
        overlayType: "gradiente",
        overlayColor: DARK,
        overlayOpacity: 65,
        vpos: "center",
        eyebrowPos: "left",
        titlePos: "left",
        ctaPos: "left",
        cta2Pos: "left",
        textMaxWidth: 0,
        eyebrowColor: CREAM,
        eyebrowSize: 0,
        titleColor: CREAM,
        titleSize: 0,
      },
      render: (p) => {
        const height = p.heightCustom ? `${p.heightCustom}px` : p.height || "55vh";
        const ob = overlayBg(p.overlayType, p.overlayColor || DARK, p.overlayOpacity);
        const tmw = p.textMaxWidth ? `${p.textMaxWidth}px` : undefined;
        return (
          <section className="relative w-full overflow-hidden" style={{ height, minHeight: 320, maxHeight: 640 }}>
            <img
              src={p.image}
              alt={p.title}
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: p.imgFit || "cover", objectPosition: p.imgObjectPos || "center" }}
            />
            {ob ? <div className="absolute inset-0" style={{ background: ob }} /> : null}
            <div className={`relative h-full w-full flex flex-col px-6 md:px-12 lg:px-20 ${justifyColClass(p.vpos)}`}>
              {p.eyebrow ? (
                <div
                  className={`tracking-[0.3em] uppercase max-w-xl ${p.eyebrowSize ? "" : "text-xs sm:text-sm"} ${selfClass(p.eyebrowPos)}`}
                  style={{ color: p.eyebrowColor || CREAM, fontSize: pxAuto(p.eyebrowSize), maxWidth: tmw }}
                >
                  {p.eyebrow}
                </div>
              ) : null}
              <h2
                className={`font-serif-display mt-3 max-w-xl ${p.titleSize ? "" : "text-4xl sm:text-5xl lg:text-6xl"} ${selfClass(p.titlePos)}`}
                style={{ color: p.titleColor || CREAM, fontSize: pxAuto(p.titleSize), maxWidth: tmw }}
              >
                {p.title}
              </h2>
              {p.ctaText ? (
                <div className={`mt-8 ${selfClass(p.ctaPos)}`}>
                  <SmartButton text={p.ctaText} link={p.ctaLink} variant={p.ctaVariant || "solid"} />
                </div>
              ) : null}
              {p.cta2Text ? (
                <div className={`mt-4 ${selfClass(p.cta2Pos)}`}>
                  <SmartButton text={p.cta2Text} link={p.cta2Link} variant={p.cta2Variant || "outline"} />
                </div>
              ) : null}
            </div>
          </section>
        );
      },
    },

    // ---------- STORY (imagem + texto lado a lado) ----------
    Story: {
      label: "Seccao Historia (imagem + texto)",
      fields: {
        // conteudo
        image: imageField("Imagem"),
        eyebrow: { type: "text", label: "Texto pequeno", contentEditable: true },
        title: { type: "text", label: "Titulo", contentEditable: true },
        text: { type: "textarea", label: "Texto", contentEditable: true },
        ctaText: { type: "text", label: "Texto do botao" },
        ctaLink: { type: "text", label: "Link do botao" },
        ctaVariant: {
          type: "radio",
          label: "Estilo do botao",
          options: [
            { label: "Cheio", value: "solid" },
            { label: "Contorno", value: "outline" },
          ],
        },
        // layout
        imageSide: {
          type: "radio",
          label: "Lado da imagem",
          options: [
            { label: "Esquerda", value: "left" },
            { label: "Direita", value: "right" },
          ],
        },
        imageWidth: {
          type: "select",
          label: "Largura da imagem",
          options: [
            { label: "Pequena (40%)", value: "0.8fr" },
            { label: "Media (50%)", value: "1fr" },
            { label: "Grande (60%)", value: "1.3fr" },
          ],
        },
        gap: { type: "number", label: "Espaco entre (px)" },
        textAlign: alignField("Alinhamento do texto"),
        ...surfaceFields(),
        // imagem
        imgRatio: ratioField("Formato da imagem"),
        imgFit: fitField("Preenchimento"),
        imgRadius: { type: "number", label: "Arredondar imagem (px)" },
        imgShadow: yesNo("Sombra na imagem"),
        // tipografia
        eyebrowColor: colorField("Cor do texto pequeno"),
        eyebrowSize: { type: "number", label: "Tamanho do texto pequeno (px)" },
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px)" },
        textColor: colorField("Cor do texto"),
        textSize: { type: "number", label: "Tamanho do texto (px)" },
        textLineHeight: { type: "number", label: "Altura da linha (x)", min: 0.5 },
        showDivider: yesNo("Mostrar divisor"),
        dividerColor: colorField("Cor do divisor"),
      },
      defaultProps: {
        image: "/static/img/story.jpg",
        eyebrow: "A nossa historia",
        title: "Feitas a mao, com alma",
        text: "Cada vela e criada artesanalmente com cera natural e fragrancias cuidadosamente selecionadas.",
        ctaText: "Saber mais",
        ctaLink: "/shop",
        ctaVariant: "outline",
        imageSide: "left",
        imageWidth: "1fr",
        gap: 56,
        textAlign: "left",
        bg: CREAM,
        padTop: 80,
        padBottom: 80,
        imgRatio: "4 / 3",
        imgFit: "cover",
        imgRadius: 0,
        imgShadow: "nao",
        eyebrowColor: BROWN,
        eyebrowSize: 10,
        titleColor: DARK,
        titleSize: 40,
        textColor: "rgba(59,38,24,.75)",
        textSize: 16,
        textLineHeight: 1.7,
        showDivider: "sim",
        dividerColor: "rgba(139,94,60,.4)",
      },
      render: (p) => {
        const imageCol = (
          <div key="img">
            <div
              className="overflow-hidden mx-auto"
              style={{
                aspectRatio: p.imgRatio !== "auto" ? p.imgRatio : undefined,
                borderRadius: px(p.imgRadius),
                background: SAND,
                boxShadow: p.imgShadow === "sim" ? "0 18px 40px rgba(59,38,24,.22)" : undefined,
              }}
            >
              <img src={p.image} alt={p.title} className="w-full h-full" style={{ objectFit: p.imgFit || "cover", display: "block" }} />
            </div>
          </div>
        );
        const textCol = (
          <div key="txt" className={alignClass(p.textAlign)}>
            {p.eyebrow ? (
              <div className="tracking-[0.3em] uppercase mb-4" style={{ color: p.eyebrowColor || BROWN, fontSize: pxAuto(p.eyebrowSize) || "10px" }}>
                {p.eyebrow}
              </div>
            ) : null}
            <h2 className="font-serif-display" style={{ color: p.titleColor || DARK, fontSize: pxAuto(p.titleSize), lineHeight: 1.1 }}>
              {p.title}
            </h2>
            {p.showDivider === "sim" ? (
              <div style={{ width: 40, height: 1, background: p.dividerColor || "rgba(139,94,60,.4)", margin: p.textAlign === "center" ? "24px auto" : "24px 0" }} />
            ) : null}
            <p
              className="leading-relaxed"
              style={{
                color: p.textColor || "rgba(59,38,24,.75)",
                fontSize: pxAuto(p.textSize),
                lineHeight: p.textLineHeight || undefined,
                maxWidth: 540,
                ...(p.textAlign === "center" ? { marginLeft: "auto", marginRight: "auto" } : {}),
              }}
            >
              {p.text}
            </p>
            {p.ctaText ? (
              <div className="mt-8">
                <SmartButton text={p.ctaText} link={p.ctaLink} variant={p.ctaVariant || "outline"} />
              </div>
            ) : null}
          </div>
        );
        const cols = p.imageSide === "right" ? [textCol, imageCol] : [imageCol, textCol];
        const imgFr = p.imageWidth || "1fr";
        const tmpl = p.imageSide === "right" ? `1.4fr ${imgFr}` : `${imgFr} 1.4fr`;
        return (
          <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || CREAM, p.padTop, p.padBottom)}>
            <div className="story-grid items-center" style={{ gap: px(p.gap) || "40px", "--story-cols": tmpl }}>
              {cols}
            </div>
          </section>
        );
      },
    },

    // ---------- EDITORIAL SPLIT (texto esquerda / imagem direita) ----------
    EditorialSplit: {
      label: "Secção editorial (texto + imagem)",
      fields: {
        image: imageField("Imagem (upload ou URL)"),
        eyebrow: { type: "text", label: "Texto pequeno (opcional)", contentEditable: true },
        title: { type: "text", label: "Título", contentEditable: true },
        text: { type: "textarea", label: "Descrição", contentEditable: true },
        text2: { type: "textarea", label: "Texto secundário", contentEditable: true },
        imageWidth: {
          type: "select",
          label: "Largura da imagem",
          options: [
            { label: "Média", value: "1fr" },
            { label: "Grande", value: "1.3fr" },
            { label: "Extra", value: "1.6fr" },
          ],
        },
        imgRatio: ratioField("Formato da imagem"),
        imgFit: fitField("Preenchimento da imagem"),
        imgRadius: { type: "number", label: "Arredondar imagem (px)" },
        gap: { type: "number", label: "Espaço entre texto e imagem (px)" },
        padTop: { type: "number", label: "Espaço acima (px)" },
        padBottom: { type: "number", label: "Espaço abaixo (px)" },
        eyebrowColor: colorField("Cor do texto pequeno"),
        titleColor: colorField("Cor do título"),
        titleSize: { type: "number", label: "Tamanho do título (px, 0=auto)" },
        textColor: colorField("Cor da descrição"),
        textSize: { type: "number", label: "Tamanho da descrição (px, 0=auto)" },
        text2Color: colorField("Cor do texto secundário"),
        text2Size: { type: "number", label: "Tamanho do texto secundário (px, 0=auto)" },
      },
      defaultProps: {
        image: "/static/img/feeling.webp",
        eyebrow: "",
        title: "Designed for everyday rituals",
        text: "Thoughtfully crafted scents created to bring atmosphere, comfort and quiet character into your home.",
        text2: "Each collection is designed to feel timeless, effortless and part of the space around it.",
        imageWidth: "1.3fr",
        imgRatio: "4 / 3",
        imgFit: "cover",
        imgRadius: 0,
        gap: 56,
        padTop: 112,
        padBottom: 112,
        eyebrowColor: BROWN,
        titleColor: DARK,
        titleSize: 0,
        textColor: "rgba(59,38,24,.72)",
        textSize: 16,
        text2Color: "rgba(59,38,24,.55)",
        text2Size: 15,
      },
      render: (p) => {
        const imgFr = p.imageWidth || "1.3fr";
        return (
          <section style={{ background: "transparent", paddingTop: px(p.padTop), paddingBottom: px(p.padBottom) }}>
            <div
              className="story-grid items-center px-6 md:px-12 lg:px-20"
              style={{ "--story-cols": `1fr ${imgFr}`, gap: px(p.gap) || "56px" }}
            >
              {/* TEXTO — sempre à esquerda */}
              <div className="flex flex-col justify-center">
                {p.eyebrow ? (
                  <div className="tracking-[0.3em] uppercase mb-4" style={{ color: p.eyebrowColor || BROWN, fontSize: "11px" }}>
                    {p.eyebrow}
                  </div>
                ) : null}
                <h2
                  className={`font-serif-display leading-[1.1] ${p.titleSize ? "" : "text-4xl sm:text-5xl"}`}
                  style={{ color: p.titleColor || DARK, fontSize: pxAuto(p.titleSize) }}
                >
                  {p.title}
                </h2>
                {p.text ? (
                  <p className="leading-relaxed mt-6" style={{ color: p.textColor || "rgba(59,38,24,.72)", fontSize: pxAuto(p.textSize) || "16px", maxWidth: 460 }}>
                    {p.text}
                  </p>
                ) : null}
                {p.text2 ? (
                  <p className="leading-relaxed mt-4" style={{ color: p.text2Color || "rgba(59,38,24,.55)", fontSize: pxAuto(p.text2Size) || "15px", maxWidth: 460 }}>
                    {p.text2}
                  </p>
                ) : null}
              </div>
              {/* IMAGEM — sempre à direita */}
              <div
                className="overflow-hidden"
                style={{
                  aspectRatio: p.imgRatio && p.imgRatio !== "auto" ? p.imgRatio : undefined,
                  background: SAND,
                  borderRadius: px(p.imgRadius),
                }}
              >
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full"
                  style={{ objectFit: p.imgFit || "cover", objectPosition: "center", display: "block" }}
                />
              </div>
            </div>
          </section>
        );
      },
    },

    // ---------- FRAGRANCIAS (grelha de cartoes) ----------
    Fragrances: {
      label: "Grelha de fragrancias",
      fields: {
        // cabecalho
        eyebrow: { type: "text", label: "Texto pequeno", contentEditable: true },
        title: { type: "text", label: "Titulo", contentEditable: true },
        eyebrowColor: colorField("Cor do texto pequeno"),
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px)" },
        headAlign: alignField("Alinhamento do cabecalho"),
        ...surfaceFields(),
        // grelha
        columns: {
          type: "radio",
          label: "Colunas",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        gap: { type: "number", label: "Espaco entre cartoes (px)" },
        // cartao
        cardBg: colorField("Fundo do cartao"),
        cardPadding: { type: "number", label: "Espaco interior do cartao (px)" },
        cardRadius: { type: "number", label: "Arredondar cartao (px)" },
        cardBorderWidth: { type: "number", label: "Borda do cartao (px)" },
        cardBorderColor: colorField("Cor da borda do cartao"),
        cardShadow: yesNo("Sombra no cartao"),
        cardAlign: alignField("Alinhamento do conteudo"),
        // imagem
        imgRatio: ratioField("Formato da imagem"),
        imgFit: fitField("Preenchimento"),
        imgRadius: { type: "number", label: "Arredondar imagem (px)" },
        // tipografia dos textos
        nameColor: colorField("Cor do nome"),
        nameSize: { type: "number", label: "Tamanho do nome (px)" },
        descColor: colorField("Cor da descricao"),
        descSize: { type: "number", label: "Tamanho da descricao (px)" },
        showNotes: yesNo("Mostrar notas"),
        notesColor: colorField("Cor das notas"),
        notesSize: { type: "number", label: "Tamanho das notas (px)" },
        // cartoes
        items: {
          type: "array",
          label: "Cartoes",
          arrayFields: {
            image: imageField("Imagem"),
            name: { type: "text", label: "Nome", contentEditable: true },
            desc: { type: "textarea", label: "Descricao", contentEditable: true },
            notes: { type: "text", label: "Notas", contentEditable: true },
          },
          getItemSummary: (item) => String(item.name || "") || "Cartao",
        },
      },
      defaultProps: {
        eyebrow: "As nossas fragrancias",
        title: "Encontra o teu aroma",
        eyebrowColor: BROWN,
        titleColor: DARK,
        titleSize: 40,
        headAlign: "left",
        bg: CREAM,
        padTop: 80,
        padBottom: 112,
        columns: "3",
        gap: 40,
        cardBg: "",
        cardPadding: 0,
        cardRadius: 0,
        cardBorderWidth: 0,
        cardBorderColor: "",
        cardShadow: "nao",
        cardAlign: "left",
        imgRatio: "5 / 4",
        imgFit: "cover",
        imgRadius: 0,
        nameColor: DARK,
        nameSize: 13,
        descColor: "rgba(59,38,24,.75)",
        descSize: 14,
        showNotes: "sim",
        notesColor: "#A68A72",
        notesSize: 12,
        items: [
          { image: "/static/img/story.jpg", name: "Citrico", desc: "Fresco e energizante.", notes: "Limao, bergamota" },
          { image: "/static/img/premium.jpg", name: "Floral", desc: "Suave e elegante.", notes: "Jasmim, rosa" },
          { image: "/static/img/feeling.webp", name: "Amadeirado", desc: "Quente e envolvente.", notes: "Sandalo, cedro" },
        ],
      },
      render: (p) => <FragrancesInner {...p} />,
    },

    // ---------- SECCAO (container vertical) ----------
    Section: {
      label: "Seccao (caixa livre)",
      fields: {
        background: {
          type: "select",
          label: "Fundo",
          options: [
            { label: "Creme", value: CREAM },
            { label: "Areia", value: SAND },
            { label: "Escuro", value: DARK },
            { label: "Transparente", value: "transparent" },
          ],
        },
        padding: {
          type: "select",
          label: "Espaco interior",
          options: [
            { label: "Pequeno", value: "py-8" },
            { label: "Medio", value: "py-16" },
            { label: "Grande", value: "py-28" },
          ],
        },
        content: { type: "slot" },
      },
      defaultProps: { background: CREAM, padding: "py-16", content: [] },
      render: ({ background, padding, content: Content }) => (
        <section className={`px-6 md:px-12 lg:px-20 ${padding}`} style={{ background }}>
          <Content />
        </section>
      ),
    },

    // ---------- CAIXA (container livre, montar do zero) ----------
    Box: {
      label: "Caixa (livre)",
      fields: {
        bg: colorField("Cor de fundo"),
        bgImage: imageField("Imagem de fundo (opcional)"),
        overlay: { type: "number", label: "Escurecer fundo (0-100)", min: 0, max: 100 },
        padding: { type: "number", label: "Espaco interior (px)" },
        radius: { type: "number", label: "Arredondar cantos (px)" },
        borderWidth: { type: "number", label: "Espessura da borda (px)" },
        borderColor: colorField("Cor da borda"),
        minHeight: { type: "number", label: "Altura minima (px, 0 = auto)" },
        maxWidth: { type: "number", label: "Largura maxima (px, 0 = total)" },
        fullWidth: {
          type: "radio",
          label: "Largura total (sem margens)",
          options: [
            { label: "Nao", value: "nao" },
            { label: "Sim", value: "sim" },
          ],
        },
        boxAlign: alignField("Posicao da caixa"),
        direction: {
          type: "radio",
          label: "Empilhar conteudo",
          options: [
            { label: "Vertical", value: "column" },
            { label: "Horizontal", value: "row" },
          ],
        },
        justify: {
          type: "select",
          label: "Alinhar (eixo principal)",
          options: [
            { label: "Inicio", value: "start" },
            { label: "Centro", value: "center" },
            { label: "Fim", value: "end" },
            { label: "Espacado", value: "between" },
          ],
        },
        crossAlign: {
          type: "select",
          label: "Alinhar (eixo cruzado)",
          options: [
            { label: "Inicio", value: "start" },
            { label: "Centro", value: "center" },
            { label: "Fim", value: "end" },
            { label: "Esticar", value: "stretch" },
          ],
        },
        gap: { type: "number", label: "Espaco entre itens (px)" },
        shadow: {
          type: "radio",
          label: "Sombra",
          options: [
            { label: "Nao", value: "nao" },
            { label: "Sim", value: "sim" },
          ],
        },
        content: { type: "slot" },
      },
      defaultProps: {
        bg: "",
        bgImage: "",
        overlay: 0,
        padding: 24,
        radius: 0,
        borderWidth: 0,
        borderColor: "",
        minHeight: 0,
        maxWidth: 0,
        fullWidth: "nao",
        boxAlign: "center",
        direction: "column",
        justify: "start",
        crossAlign: "stretch",
        gap: 16,
        shadow: "nao",
        content: [],
      },
      render: ({ bg, bgImage, overlay, padding, radius, borderWidth, borderColor, minHeight, maxWidth, fullWidth, boxAlign, direction, justify, crossAlign, gap, shadow, content: Content }) => (
        <div className={fullWidth === "sim" ? "" : "px-6 md:px-12 lg:px-20 py-4"}>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: direction || "column",
              justifyContent: justifyMap[justify] || "flex-start",
              alignItems: alignMap[crossAlign] || "stretch",
              gap: `${gap || 0}px`,
              background: bg || "transparent",
              padding: `${padding || 0}px`,
              borderRadius: radius ? `${radius}px` : undefined,
              border: borderWidth ? `${borderWidth}px solid ${borderColor || "#000"}` : undefined,
              minHeight: minHeight ? `${minHeight}px` : undefined,
              maxWidth: maxWidth ? `${maxWidth}px` : undefined,
              overflow: "hidden",
              boxShadow: shadow === "sim" ? "0 18px 40px rgba(59,38,24,.18)" : undefined,
              ...blockMargin(boxAlign),
            }}
          >
            {bgImage ? (
              <img
                src={bgImage}
                alt=""
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
              />
            ) : null}
            {bgImage && overlay ? (
              <div style={{ position: "absolute", inset: 0, background: `rgba(0,0,0,${(overlay || 0) / 100})`, zIndex: 1 }} />
            ) : null}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                display: "flex",
                flexDirection: direction || "column",
                justifyContent: justifyMap[justify] || "flex-start",
                alignItems: alignMap[crossAlign] || "stretch",
                gap: `${gap || 0}px`,
              }}
            >
              <Content />
            </div>
          </div>
        </div>
      ),
    },

    // ---------- COLUNAS (lado a lado, cada uma independente) ----------
    Columns: {
      label: "Colunas (lado a lado)",
      fields: {
        count: {
          type: "radio",
          label: "Nr de colunas",
          options: [
            { label: "2", value: 2 },
            { label: "3", value: 3 },
          ],
        },
        gap: {
          type: "select",
          label: "Espaco entre",
          options: [
            { label: "Pequeno", value: "gap-6" },
            { label: "Medio", value: "gap-12" },
            { label: "Grande", value: "gap-20" },
          ],
        },
        valign: {
          type: "radio",
          label: "Alinhar vertical",
          options: [
            { label: "Topo", value: "items-start" },
            { label: "Centro", value: "items-center" },
          ],
        },
        col1: { type: "slot" },
        col2: { type: "slot" },
        col3: { type: "slot" },
      },
      defaultProps: {
        count: 2,
        gap: "gap-12",
        valign: "items-center",
        col1: [],
        col2: [],
        col3: [],
      },
      render: ({ count, gap, valign, col1: C1, col2: C2, col3: C3 }) => (
        <div className="px-6 md:px-12 lg:px-20 py-10">
          <div
            className={`grid grid-cols-1 ${gap} ${valign} ${
              count === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"
            }`}
          >
            <div><C1 /></div>
            <div><C2 /></div>
            {count === 3 ? <div><C3 /></div> : null}
          </div>
        </div>
      ),
    },

    // ---------- GALERIA ----------
    Gallery: {
      label: "Galeria de imagens",
      fields: {
        cols: {
          type: "radio",
          label: "Colunas",
          options: [
            { label: "2", value: "sm:grid-cols-2" },
            { label: "3", value: "sm:grid-cols-3" },
            { label: "4", value: "sm:grid-cols-4" },
          ],
        },
        ratio: {
          type: "select",
          label: "Formato",
          options: [
            { label: "Quadrado", value: "1 / 1" },
            { label: "Retrato", value: "3 / 4" },
            { label: "Paisagem", value: "4 / 3" },
          ],
        },
        images: {
          type: "array",
          label: "Imagens",
          arrayFields: { src: imageField("Imagem") },
          getItemSummary: (_, i) => `Imagem ${i + 1}`,
        },
      },
      defaultProps: {
        cols: "sm:grid-cols-3",
        ratio: "1 / 1",
        images: [
          { src: "/static/img/story.jpg" },
          { src: "/static/img/premium.jpg" },
          { src: "/static/img/feeling.webp" },
        ],
      },
      render: ({ cols, ratio, images }) => (
        <div className="px-6 md:px-12 lg:px-20 py-10">
          <div className={`grid grid-cols-2 ${cols} gap-4`}>
            {(images || []).map((im, i) => (
              <div key={i} className="overflow-hidden" style={{ aspectRatio: ratio, background: SAND }}>
                <img src={im.src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // ---------- VIDEO (YouTube/Vimeo) ----------
    Video: {
      label: "Video (YouTube)",
      fields: {
        url: { type: "text", label: "Link do video (YouTube)" },
      },
      defaultProps: { url: "" },
      render: ({ url }) => {
        let embed = "";
        const u = (url || "").trim();
        const yt = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
        if (yt) embed = `https://www.youtube.com/embed/${yt[1]}`;
        else if (u.includes("/embed/")) embed = u;
        return (
          <div className="px-6 md:px-12 lg:px-20 py-10">
            <div className="max-w-3xl mx-auto" style={{ aspectRatio: "16 / 9", background: "#000" }}>
              {embed ? (
                <iframe
                  src={embed}
                  title="video"
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                  Cola um link do YouTube
                </div>
              )}
            </div>
          </div>
        );
      },
    },

    // ---------- DIVISORIA ----------
    Divider: {
      label: "Divisoria (linha)",
      fields: {
        width: {
          type: "select",
          label: "Largura",
          options: [
            { label: "Curta", value: "40px" },
            { label: "Media", value: "120px" },
            { label: "Total", value: "100%" },
          ],
        },
      },
      defaultProps: { width: "120px" },
      render: ({ width }) => (
        <div className="px-6 md:px-12 lg:px-20 py-6 flex justify-center">
          <div style={{ width, height: 1, background: "rgba(139,94,60,.4)" }} />
        </div>
      ),
    },

    // ---------- ESPACADOR ----------
    Spacer: {
      label: "Espaco",
      fields: {
        size: {
          type: "select",
          label: "Altura",
          options: [
            { label: "Pequeno", value: "32px" },
            { label: "Medio", value: "64px" },
            { label: "Grande", value: "120px" },
          ],
        },
      },
      defaultProps: { size: "64px" },
      render: ({ size }) => <div style={{ height: size }} />,
    },

    // ---------- ICONE ----------
    Icon: {
      label: "Icone",
      fields: {
        name: { type: "select", label: "Icone", options: ICON_OPTIONS },
        size: { type: "number", label: "Tamanho (px)", min: 8 },
        color: colorField("Cor"),
        align: alignField(),
      },
      defaultProps: { name: "estrela", size: 40, color: BROWN, align: "center" },
      render: ({ name, size, color, align }) => (
        <div className={`px-6 md:px-12 lg:px-20 py-4 flex ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}>
          <IconSvg name={name} size={size || 40} color={color || BROWN} />
        </div>
      ),
    },

    // ---------- GRID (grelha automatica) ----------
    Grid: {
      label: "Grid (grelha)",
      fields: {
        minColWidth: { type: "number", label: "Largura minima por coluna (px)", min: 80 },
        gap: { type: "number", label: "Espaco entre (px)" },
        content: { type: "slot" },
      },
      defaultProps: { minColWidth: 240, gap: 24, content: [] },
      render: ({ minColWidth, gap, content: Content }) => (
        <div className="px-6 md:px-12 lg:px-20 py-8">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(${minColWidth || 240}px, 1fr))`,
              gap: `${gap || 24}px`,
            }}
          >
            <Content />
          </div>
        </div>
      ),
    },

    // ---------- CONTACTO WHATSAPP ----------
    ContactWhatsApp: {
      label: "Contacto WhatsApp",
      fields: {
        heading: { type: "text", label: "Titulo" },
        text: { type: "textarea", label: "Texto" },
        btnText: { type: "text", label: "Texto do botao" },
        note: { type: "text", label: "Nota pequena" },
        bg: colorField("Fundo"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        heading: "Talk to us on WhatsApp",
        text: "Questions about a product, custom orders or gifting? Send us a message — we reply fast.",
        btnText: "Start a conversation",
        note: "Available Mon–Sat · Usually replies within a few hours",
        bg: CREAM,
        padTop: 96,
        padBottom: 96,
      },
      render: ({ heading, text, btnText, note, bg, padTop, padBottom }, { appContext }) => {
        const waNumber = "447767993428";
        const waMsg = "Hi Escential! I'd like to know more about your products.";
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(waMsg)}`;
        return (
          <section style={{ background: bg || CREAM, paddingTop: padTop ?? 96, paddingBottom: padBottom ?? 96 }}>
            <div className="flex flex-col items-center text-center px-6 max-w-xl mx-auto">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ color: "#25D366", marginBottom: 28 }}>
                <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <h2 className="font-serif-display text-3xl md:text-4xl" style={{ color: DARK, marginBottom: 20 }}>{heading}</h2>
              <p className="leading-relaxed text-base" style={{ color: "rgba(59,38,24,.72)", marginBottom: 36, maxWidth: 480 }}>{text}</p>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#25D366",
                  color: "#fff",
                  padding: "16px 40px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  marginBottom: 20,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {btnText}
              </a>
              {note ? <p className="text-xs tracking-wide" style={{ color: "rgba(59,38,24,.45)", letterSpacing: "0.08em" }}>{note}</p> : null}
            </div>
          </section>
        );
      },
    },

    // ---------- FORMULARIO ----------
    Form: {
      label: "Formulario",
      fields: {
        title: { type: "text", label: "Titulo (opcional)" },
        fields: { type: "text", label: "Campos (separados por virgula)" },
        button: { type: "text", label: "Texto do botao" },
        whatsapp: { type: "text", label: "WhatsApp (numero, ex: 351912345678)" },
        bg: colorField("Cor do botao"),
        color: colorField("Cor do texto do botao"),
        radius: { type: "number", label: "Arredondar (px)" },
        maxWidth: { type: "number", label: "Largura maxima (px, 0 = total)" },
        align: alignField("Posicao"),
      },
      defaultProps: {
        title: "Fala connosco",
        fields: "Nome, Email, Mensagem",
        button: "Enviar",
        whatsapp: "",
        bg: BROWN,
        color: CREAM,
        radius: 4,
        maxWidth: 480,
        align: "center",
      },
      render: ({ title, fields, button, whatsapp, bg, color, radius, maxWidth, align }) => (
        <div className="px-6 md:px-12 lg:px-20 py-8">
          <div style={{ maxWidth: maxWidth ? `${maxWidth}px` : "100%", ...blockMargin(align) }}>
            <FormBlock
              title={title}
              fields={fields}
              button={button}
              whatsapp={whatsapp}
              bg={bg}
              color={color}
              radius={radius}
            />
          </div>
        </div>
      ),
    },

    // ---------- DESTAQUES DE PRODUTOS (dinamico) ----------
    FeaturedProducts: {
      label: "Destaques de produtos",
      fields: {
        ...headFields(),
        source: {
          type: "radio",
          label: "Mostrar",
          options: [
            { label: "Home", value: "home" },
            { label: "Destacados", value: "featured" },
            { label: "Todos", value: "all" },
          ],
        },
        limit: { type: "number", label: "Quantos", min: 1 },
        ...surfaceFields(),
        showViewAll: yesNo("Mostrar link 'ver loja'"),
        viewAllText: { type: "text", label: "Texto do link" },
        viewAllColor: colorField("Cor do link"),
      },
      defaultProps: {
        ...headDefaults("Best sellers", "Loved by our customers"),
        source: "home",
        limit: 4,
        bg: CREAM,
        padTop: 64,
        padBottom: 96,
        showViewAll: "sim",
        viewAllText: "Ver toda a loja",
        viewAllColor: BROWN,
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || CREAM, p.padTop, p.padBottom)}>
          <SectionHead {...headProps(p)} />
          <FeaturedProductsBlock source={p.source} limit={p.limit} compact={true} />
          {p.showViewAll === "sim" ? (
            <div className="text-center mt-12">
              <Link to="/shop" className="text-[13px] tracking-[0.25em] uppercase border-b pb-0.5" style={{ color: p.viewAllColor || BROWN, borderColor: p.viewAllColor || BROWN }}>
                {p.viewAllText || "Ver toda a loja"}
              </Link>
            </div>
          ) : null}
        </section>
      ),
    },

    // ---------- BENEFICIOS / DIFERENCIAIS ----------
    Features: {
      label: "Beneficios / Diferenciais",
      fields: {
        ...headFields(),
        columns: {
          type: "radio",
          label: "Colunas",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
            { label: "4", value: "4" },
          ],
        },
        ...surfaceFields(),
        marginTop: { type: "number", label: "Margem acima (px, negativo = sobrepoe)" },
        itemAlign: alignField("Alinhamento dos itens"),
        iconSize: { type: "number", label: "Tamanho do icone (px)" },
        iconColor: colorField("Cor do icone"),
        itemTitleColor: colorField("Cor do titulo do item"),
        itemTitleSize: { type: "number", label: "Tamanho do titulo do item (px, 0=auto)" },
        itemTextColor: colorField("Cor do texto do item"),
        itemTextSize: { type: "number", label: "Tamanho do texto do item (px, 0=auto)" },
        items: {
          type: "array",
          label: "Itens",
          arrayFields: {
            icon: { type: "select", label: "Icone", options: ICON_OPTIONS },
            title: { type: "text", label: "Titulo" },
            text: { type: "textarea", label: "Texto" },
          },
          getItemSummary: (it) => it.title || "Item",
        },
      },
      defaultProps: {
        ...headDefaults("Why Escential", "Crafted with care"),
        columns: "3",
        bg: "transparent",
        padTop: 64,
        padBottom: 96,
        itemAlign: "center",
        iconSize: 40,
        iconColor: BROWN,
        itemTitleColor: DARK,
        itemTitleSize: 0,
        itemTextColor: "rgba(59,38,24,.75)",
        itemTextSize: 0,
        items: [
          { icon: "folha", title: "Natural wax", text: "Clean-burning, sustainable wax for a softer, longer scent." },
          { icon: "fogo", title: "Hand-poured", text: "Made in small batches with attention to every detail." },
          { icon: "relogio", title: "Long lasting", text: "A balanced fragrance that fills the room and lingers." },
        ],
      },
      render: (p) => {
        const jc = p.itemAlign === "left" ? "justify-start" : p.itemAlign === "right" ? "justify-end" : "justify-center";
        return (
          <section className="px-6 md:px-12 lg:px-20" style={{ ...surfaceStyle(p.bg || "transparent", p.padTop, p.padBottom), marginTop: p.marginTop != null ? `${p.marginTop}px` : undefined }}>
            <SectionHead {...headProps(p)} />
            <div
              className={`grid grid-cols-2 ${
                p.columns === "4" ? "lg:grid-cols-4" : p.columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"
              } gap-8`}
            >
              {(p.items || []).map((it, i) => (
                <div key={i} className={alignClass(p.itemAlign)}>
                  <div className={`flex ${jc} mb-4`}><IconSvg name={it.icon} size={p.iconSize || 40} color={p.iconColor || BROWN} /></div>
                  <h3 className={`tracking-[0.25em] uppercase mb-2 ${p.itemTitleSize ? "" : "text-xs"}`} style={{ color: p.itemTitleColor || DARK, fontSize: pxAuto(p.itemTitleSize) }}>{it.title}</h3>
                  <p className={`leading-relaxed ${p.itemTextSize ? "" : "text-sm"} ${p.itemAlign === "center" ? "mx-auto" : ""}`} style={{ color: p.itemTextColor || "rgba(59,38,24,.75)", fontSize: pxAuto(p.itemTextSize), maxWidth: 280 }}>{it.text}</p>
                </div>
              ))}
            </div>
          </section>
        );
      },
    },

    // ---------- ESTATISTICAS / NUMEROS ----------
    Stats: {
      label: "Numeros / Destaques",
      fields: {
        ...headFields(),
        ...surfaceFields(),
        valueColor: colorField("Cor do numero"),
        valueSize: { type: "number", label: "Tamanho do numero (px, 0=auto)" },
        labelColor: colorField("Cor da legenda"),
        labelSize: { type: "number", label: "Tamanho da legenda (px, 0=auto)" },
        items: {
          type: "array",
          label: "Itens",
          arrayFields: {
            value: { type: "text", label: "Numero" },
            label: { type: "text", label: "Legenda" },
          },
          getItemSummary: (it) => it.value || "Stat",
        },
      },
      defaultProps: {
        ...headDefaults("", ""),
        bg: SAND,
        padTop: 48,
        padBottom: 48,
        valueColor: DARK,
        valueSize: 0,
        labelColor: BROWN,
        labelSize: 0,
        items: [
          { value: "100%", label: "Cera natural" },
          { value: "24h+", label: "Duracao" },
          { value: "5★", label: "Avaliacoes" },
          { value: "Hand-made", label: "Pequenos lotes" },
        ],
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || SAND, p.padTop, p.padBottom)}>
          {(p.eyebrow || p.title) ? <SectionHead {...headProps(p)} /> : null}
          <div className={`grid grid-cols-2 ${(p.items || []).length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-8 max-w-5xl mx-auto`}>
            {(p.items || []).map((it, i) => (
              <div key={i} className="text-center">
                <div className={`font-serif-display ${p.valueSize ? "" : "text-3xl sm:text-4xl"}`} style={{ color: p.valueColor || DARK, fontSize: pxAuto(p.valueSize) }}>{it.value}</div>
                <div className={`tracking-[0.25em] uppercase mt-2 ${p.labelSize ? "" : "text-[10px]"}`} style={{ color: p.labelColor || BROWN, fontSize: pxAuto(p.labelSize) }}>{it.label}</div>
              </div>
            ))}
          </div>
        </section>
      ),
    },

    // ---------- TESTEMUNHOS / AVALIACOES ----------
    Testimonials: {
      label: "Testemunhos / Avaliacoes",
      fields: {
        ...headFields(),
        ...surfaceFields(),
        columns: {
          type: "radio",
          label: "Colunas",
          options: [
            { label: "2", value: "2" },
            { label: "3", value: "3" },
          ],
        },
        cardBg: colorField("Fundo do cartao"),
        cardBorderColor: colorField("Cor da borda do cartao"),
        cardRadius: { type: "number", label: "Arredondar cartao (px)" },
        starColor: colorField("Cor das estrelas"),
        quoteColor: colorField("Cor da citacao"),
        quoteSize: { type: "number", label: "Tamanho da citacao (px, 0=auto)" },
        authorColor: colorField("Cor do nome"),
        roleColor: colorField("Cor do detalhe"),
        items: {
          type: "array",
          label: "Testemunhos",
          arrayFields: {
            quote: { type: "textarea", label: "Citacao" },
            author: { type: "text", label: "Nome" },
            role: { type: "text", label: "Detalhe (opcional)" },
            image: imageField("Foto (opcional)"),
          },
          getItemSummary: (it) => it.author || "Testemunho",
        },
      },
      defaultProps: {
        ...headDefaults("Reviews", "What people say"),
        bg: CREAM,
        padTop: 64,
        padBottom: 96,
        columns: "3",
        cardBg: "#ffffff",
        cardBorderColor: "rgba(139,94,60,.15)",
        cardRadius: 0,
        starColor: BROWN,
        quoteColor: "rgba(59,38,24,.8)",
        quoteSize: 0,
        authorColor: DARK,
        roleColor: "#A68A72",
        items: [
          { quote: "The scent is incredible and lasts for hours. Beautiful packaging too.", author: "Sofia M.", role: "Verified buyer", image: "" },
          { quote: "Bought candles as a gift — they absolutely loved them.", author: "James T.", role: "Verified buyer", image: "" },
          { quote: "My home has never smelled this good. Will be ordering again!", author: "Aisha R.", role: "Verified buyer", image: "" },
        ],
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || CREAM, p.padTop, p.padBottom)}>
          <SectionHead {...headProps(p)} />
          <div className={`grid grid-cols-1 ${p.columns === "2" ? "lg:grid-cols-2" : "lg:grid-cols-3"} gap-8`}>
            {(p.items || []).map((it, i) => (
              <div key={i} className="p-8" style={{ background: p.cardBg || "#fff", border: `1px solid ${p.cardBorderColor || "rgba(139,94,60,.15)"}`, borderRadius: px(p.cardRadius) }}>
                <div className="text-sm mb-4" style={{ color: p.starColor || BROWN }}>★★★★★</div>
                <p className={`leading-relaxed mb-6 ${p.quoteSize ? "" : ""}`} style={{ color: p.quoteColor || "rgba(59,38,24,.8)", fontSize: pxAuto(p.quoteSize) }}>“{it.quote}”</p>
                <div className="flex items-center gap-3">
                  {it.image ? <img src={it.image} alt={it.author} className="w-10 h-10 rounded-full object-cover" /> : null}
                  <div>
                    <div className="text-sm font-semibold" style={{ color: p.authorColor || DARK }}>{it.author}</div>
                    {it.role ? <div className="text-xs" style={{ color: p.roleColor || "#A68A72" }}>{it.role}</div> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ),
    },

    // ---------- FAQ (acordeao) ----------
    FAQ: {
      label: "FAQ (perguntas)",
      fields: {
        ...headFields(),
        ...surfaceFields(),
        questionColor: colorField("Cor da pergunta"),
        questionSize: { type: "number", label: "Tamanho da pergunta (px, 0=auto)" },
        answerColor: colorField("Cor da resposta"),
        answerSize: { type: "number", label: "Tamanho da resposta (px, 0=auto)" },
        iconColor: colorField("Cor do +/-"),
        dividerColor: colorField("Cor das linhas"),
        items: {
          type: "array",
          label: "Perguntas",
          arrayFields: {
            question: { type: "text", label: "Pergunta" },
            answer: { type: "textarea", label: "Resposta" },
          },
          getItemSummary: (it) => it.question || "Pergunta",
        },
      },
      defaultProps: {
        ...headDefaults("FAQ", "Good to know"),
        bg: "transparent",
        padTop: 64,
        padBottom: 96,
        questionColor: DARK,
        questionSize: 0,
        answerColor: "rgba(59,38,24,.75)",
        answerSize: 0,
        iconColor: BROWN,
        dividerColor: "rgba(139,94,60,.18)",
        items: [
          { question: "How long do the candles last?", answer: "Depending on the size, between 25 and 50 hours of clean burn time." },
          { question: "Are they made with natural wax?", answer: "Yes — we use clean-burning, sustainable wax and carefully selected fragrances." },
          { question: "How can I order?", answer: "Browse the shop and tap WhatsApp on any product, or use the contact page." },
          { question: "Do you offer gifting options?", answer: "Yes — our candles make a beautiful gift. Reach out via WhatsApp for a personalised order." },
        ],
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || "transparent", p.padTop, p.padBottom)}>
          <SectionHead {...headProps(p)} />
          <FaqBlock
            items={p.items}
            questionColor={p.questionColor}
            questionSize={p.questionSize}
            answerColor={p.answerColor}
            answerSize={p.answerSize}
            iconColor={p.iconColor}
            dividerColor={p.dividerColor}
          />
        </section>
      ),
    },

    // ---------- NEWSLETTER ----------
    InstagramCTA: {
      label: "Instagram – CTA",
      fields: {
        eyebrow: { type: "text", label: "Texto pequeno" },
        eyebrowColor: colorField("Cor do texto pequeno"),
        title: { type: "text", label: "Titulo" },
        titleColor: colorField("Cor do titulo"),
        text: { type: "textarea", label: "Texto descritivo" },
        textColor: colorField("Cor do texto"),
        instagram: { type: "text", label: "URL do perfil Instagram" },
        buttonText: { type: "text", label: "Texto do botao" },
        bg: colorField("Fundo"),
        btnBg: colorField("Cor do botao"),
        btnColor: colorField("Cor do texto do botao"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        eyebrow: "FOLLOW US",
        eyebrowColor: BROWN,
        title: "Join our community",
        titleColor: CREAM,
        text: "Discover new scents and connect with us on Instagram.",
        textColor: "rgba(249,246,240,.85)",
        instagram: "https://www.instagram.com/escential.collection/",
        buttonText: "Follow on Instagram",
        bg: DARK,
        btnBg: BROWN,
        btnColor: CREAM,
        padTop: 96,
        padBottom: 96,
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || DARK, p.padTop, p.padBottom)}>
          <div className="max-w-xl mx-auto text-center" style={{ textAlign: "center" }}>
            {p.eyebrow && (
              <div className="tracking-[0.3em] uppercase mb-3 text-[10px]" style={{ color: p.eyebrowColor || BROWN, textAlign: "center" }}>
                {p.eyebrow}
              </div>
            )}
            {p.title && (
              <h2 className="font-serif-display text-3xl sm:text-4xl leading-[1.1]" style={{ color: p.titleColor || CREAM }}>
                {p.title}
              </h2>
            )}
            {p.text && (
              <p className="mt-4 mb-10 leading-relaxed text-sm sm:text-base" style={{ color: p.textColor || "rgba(249,246,240,.85)" }}>
                {p.text}
              </p>
            )}
            {p.instagram && (
              <a
                href={p.instagram}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block",
                  padding: "14px 40px",
                  background: p.btnBg || BROWN,
                  color: p.btnColor || CREAM,
                  fontSize: "11px",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  textDecoration: "none",
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = p.btnBg ? `${p.btnBg}dd` : `${BROWN}dd`;
                  e.target.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = p.btnBg || BROWN;
                  e.target.style.transform = "translateY(0)";
                }}
              >
                {p.buttonText || "Follow"}
              </a>
            )}
          </div>
        </section>
      ),
    },

    Newsletter: {
      label: "Newsletter",
      fields: {
        eyebrow: { type: "text", label: "Texto pequeno" },
        eyebrowColor: colorField("Cor do texto pequeno"),
        eyebrowSize: { type: "number", label: "Tamanho do texto pequeno (px, 0=auto)" },
        title: { type: "text", label: "Titulo" },
        titleColor: colorField("Cor do titulo"),
        titleSize: { type: "number", label: "Tamanho do titulo (px, 0=auto)" },
        text: { type: "textarea", label: "Texto" },
        textColor: colorField("Cor do texto"),
        textSize: { type: "number", label: "Tamanho do texto (px, 0=auto)" },
        align: alignField("Alinhamento"),
        placeholder: { type: "text", label: "Placeholder do campo" },
        button: { type: "text", label: "Texto do botao" },
        email: { type: "text", label: "Email destino" },
        bg: colorField("Fundo"),
        btnBg: colorField("Cor do botao"),
        btnColor: colorField("Texto do botao"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        eyebrow: "Stay in touch",
        eyebrowColor: BROWN,
        eyebrowSize: 0,
        title: "Join the Escential circle",
        titleColor: CREAM,
        titleSize: 0,
        text: "Subscribe for new scents, early access and small-batch drops.",
        textColor: "rgba(249,246,240,.85)",
        textSize: 0,
        align: "center",
        placeholder: "Your email",
        button: "Subscribe",
        email: "",
        bg: DARK,
        btnBg: BROWN,
        btnColor: CREAM,
        padTop: 64,
        padBottom: 96,
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || DARK, p.padTop, p.padBottom)}>
          <div className={`max-w-xl ${p.align === "center" ? "mx-auto" : ""} ${alignClass(p.align)}`}>
            {p.eyebrow ? (
              <div className={`tracking-[0.3em] uppercase mb-3 ${p.eyebrowSize ? "" : "text-[10px]"}`} style={{ color: p.eyebrowColor || BROWN, fontSize: pxAuto(p.eyebrowSize) }}>{p.eyebrow}</div>
            ) : null}
            {p.title ? (
              <h2 className={`font-serif-display ${p.titleSize ? "" : "text-3xl sm:text-4xl"}`} style={{ color: p.titleColor || CREAM, fontSize: pxAuto(p.titleSize) }}>{p.title}</h2>
            ) : null}
            {p.text ? (
              <p className={`mt-4 mb-8 leading-relaxed ${p.textSize ? "" : ""}`} style={{ color: p.textColor || "rgba(249,246,240,.85)", fontSize: pxAuto(p.textSize) }}>{p.text}</p>
            ) : null}
            <NewsletterBlock email={p.email} placeholder={p.placeholder} button={p.button} color={p.btnColor} bg={p.btnBg} />
          </div>
        </section>
      ),
    },

    // ---------- METODOS DE CONTACTO (lado a lado) ----------
    ContactMethods: {
      label: "Métodos de Contacto (lado a lado)",
      fields: {
        // WhatsApp
        waHeading: { type: "text", label: "WhatsApp - Titulo", contentEditable: true },
        waText: { type: "textarea", label: "WhatsApp - Descrição", contentEditable: true },
        waButtonText: { type: "text", label: "WhatsApp - Texto do botão" },
        waNote: { type: "text", label: "WhatsApp - Nota (ex: horario)", contentEditable: true },
        // Email
        emailHeading: { type: "text", label: "Email - Titulo", contentEditable: true },
        emailText: { type: "textarea", label: "Email - Descrição", contentEditable: true },
        email: { type: "text", label: "Email para contacto" },
        // Styling
        headingColor: colorField("Cor dos titulos"),
        textColor: colorField("Cor do texto"),
        noteColor: colorField("Cor da nota"),
        bg: colorField("Fundo"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        waHeading: "Talk to us on WhatsApp",
        waText: "Questions about a product, custom orders, gifting or just want to know more? Send us a message directly — we reply fast.",
        waButtonText: "Start a conversation",
        waNote: "Available Mon–Sat · Usually replies within a few hours",
        emailHeading: "Or send us an email",
        emailText: "For detailed inquiries or feedback, reach out directly",
        email: "escentialfragrance05@gmail.com",
        headingColor: DARK,
        textColor: "rgba(59,38,24,.75)",
        noteColor: "#A68A72",
        bg: CREAM,
        padTop: 80,
        padBottom: 80,
      },
      render: (p) => {
        const waNumber = "447767993428";
        const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent("Hi Escential! I'd like to know more about your products.")}`;
        return (
          <section style={{ background: p.bg || CREAM, paddingTop: p.padTop ?? 80, paddingBottom: p.padBottom ?? 80 }}>
            <div className="px-6 md:px-12 lg:px-20">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 max-w-5xl mx-auto">
              {/* WhatsApp */}
              <div className="flex flex-col justify-center">
                <h3
                  className="font-serif-display text-2xl sm:text-3xl leading-[1.1] mb-4"
                  style={{ color: p.headingColor || DARK }}
                >
                  {p.waHeading}
                </h3>
                <p
                  className="mb-6 leading-relaxed"
                  style={{ color: p.textColor || "rgba(59,38,24,.75)" }}
                >
                  {p.waText}
                </p>
                <div className="mb-4">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "14px 32px",
                      background: BROWN,
                      color: CREAM,
                      fontSize: "11px",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      transition: "background 0.3s",
                    }}
                    onMouseEnter={(e) => (e.target.style.background = "#6B4A2D")}
                    onMouseLeave={(e) => (e.target.style.background = BROWN)}
                  >
                    {p.waButtonText}
                  </a>
                </div>
                {p.waNote && (
                  <p className="text-xs" style={{ color: p.noteColor || "#A68A72" }}>
                    {p.waNote}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col justify-center">
                <h3
                  className="font-serif-display text-2xl sm:text-3xl leading-[1.1] mb-4"
                  style={{ color: p.headingColor || DARK }}
                >
                  {p.emailHeading}
                </h3>
                <p
                  className="mb-8 leading-relaxed"
                  style={{ color: p.textColor || "rgba(59,38,24,.75)" }}
                >
                  {p.emailText}
                </p>
                {p.email && (
                  <span style={{ display: "block", width: "fit-content" }}>
                    <a
                      href={`mailto:${p.email}`}
                      style={{
                        fontSize: "18px",
                        color: BROWN,
                        fontWeight: 600,
                        textDecoration: "none",
                        borderBottom: `2px solid ${BROWN}`,
                        paddingBottom: "2px",
                        transition: "all 0.3s ease",
                        letterSpacing: "0.02em",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = DARK;
                        e.target.style.borderBottomColor = DARK;
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = BROWN;
                        e.target.style.borderBottomColor = BROWN;
                      }}
                    >
                      {p.email}
                    </a>
                  </span>
                )}
              </div>
            </div>
            </div>
          </section>
        );
      },
    },

    // ---------- INSTAGRAM CARROSSEL ----------
    InstagramCarousel: {
      label: "Instagram – Carrossel",
      fields: {
        heading: { type: "text", label: "Título da secção", contentEditable: true },
        subtext: { type: "text", label: "Subtítulo (opcional)", contentEditable: true },
        instagram: { type: "text", label: "URL do perfil Instagram" },
        ctaText: { type: "text", label: "Texto do botão CTA" },
        images: {
          type: "array",
          label: "Itens do carrossel",
          arrayFields: {
            src: mediaField("Mídia (imagem ou vídeo)"),
            link: { type: "text", label: "Link ao clicar (opcional)" },
          },
          getItemSummary: (item, i) => item.link ? `Item ${i + 1} → ${item.link}` : `Item ${i + 1}`,
        },
        bg: colorField("Fundo"),
        padTop: { type: "number", label: "Espaço acima (px)" },
        padBottom: { type: "number", label: "Espaço abaixo (px)" },
      },
      defaultProps: {
        heading: "Follow us on Instagram",
        subtext: "@escential.collection",
        instagram: "https://www.instagram.com/escential.collection/",
        ctaText: "Follow @escential.collection",
        images: [
          { src: "/static/img/testimonial-1.jpg" },
          { src: "/static/img/premium.jpg" },
          { src: "/static/img/testimonial-2.jpg" },
          { src: "/static/img/feeling.webp" },
          { src: "/static/img/testimonial-3.jpg" },
          { src: "/static/img/story.jpg" },
        ],
        bg: CREAM,
        padTop: 80,
        padBottom: 96,
      },
      render: (p) => {
        // Reproduz vídeo apenas quando visível no ecrã
        const VideoItem = ({ src, poster }) => {
          const ref = React.useRef(null);
          React.useEffect(() => {
            const el = ref.current;
            if (!el) return;
            const io = new IntersectionObserver(
              ([entry]) => {
                if (entry.isIntersecting) el.play().catch(() => {});
                else el.pause();
              },
              { threshold: 0.3 }
            );
            io.observe(el);
            return () => io.disconnect();
          }, [src]);
          return (
            <video
              ref={ref}
              src={src}
              poster={poster}
              muted
              loop
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          );
        };

        // Normaliza um item da API (legado sem mediaType) para estrutura consistente
        const normalizeItem = (item, fallbackLink) => {
          const src = item.image || item.src || "";
          return {
            image: src,
            link: item.link || fallbackLink || "#",
            mediaType: item.mediaType || (isVideoUrl(src) ? "video" : "image"),
            poster: item.poster || "",
          };
        };

        // Item individual — componente próprio para hooks serem válidos fora do .map()
        const CarouselItem = ({ item, fallbackLink }) => {
          const [hovered, setHovered] = React.useState(false);
          const norm = normalizeItem(item, fallbackLink);
          const isVideo = norm.mediaType === "video";
          if (!norm.image) return null;
          return (
            <a
              href={norm.link}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              style={{
                display: "block",
                flexShrink: 0,
                width: "clamp(200px, 26vw, 340px)",
                aspectRatio: "4 / 5",
                overflow: "hidden",
                background: "#E8E0D4",
                textDecoration: "none",
                position: "relative",
              }}
            >
              {isVideo
                ? <VideoItem src={norm.image} poster={norm.poster} />
                : <img src={norm.image} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", userSelect: "none" }} />
              }
              <div style={{
                position: "absolute",
                inset: 0,
                background: `rgba(0,0,0,${hovered ? 0.35 : 0})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.3s ease",
                pointerEvents: "none",
              }}>
                {hovered && (
                  isVideo
                    ? <svg width="48" height="48" viewBox="0 0 24 24" fill="white" style={{ opacity: 0, animation: "fade-in 0.3s ease forwards" }}>
                        <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}`}</style>
                        <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1.5"/>
                        <polygon points="10,8 18,12 10,16" fill="white"/>
                      </svg>
                    : <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0, animation: "fade-in 0.3s ease forwards" }}>
                        <rect x="2" y="2" width="20" height="20" rx="4.18" ry="4.18"></rect>
                        <path d="M7 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0"></path>
                        <circle cx="17.5" cy="6.5" r="1.5"></circle>
                      </svg>
                )}
              </div>
            </a>
          );
        };

        const InstaCarousel = () => {
          const [isPaused, setIsPaused] = React.useState(false);
          const [apiItems, setApiItems] = React.useState(null);
          const resumeTimer = React.useRef(null);

          React.useEffect(() => {
            fetch(`${API}/carousel`)
              .then(r => { if (!r.ok) throw new Error(); return r.json(); })
              .then(data => setApiItems(Array.isArray(data) ? data : []))
              .catch(() => setApiItems([]));
          }, []);

          const pause = () => {
            clearTimeout(resumeTimer.current);
            setIsPaused(true);
          };
          const resume = () => setIsPaused(false);
          const scheduleResume = () => {
            clearTimeout(resumeTimer.current);
            resumeTimer.current = setTimeout(() => setIsPaused(false), 1500);
          };

          // Só mostra os itens geridos no admin (/carousel). Sem imagens padrão:
          // se não houver itens próprios, o carrossel não aparece.
          const rawItems = apiItems || [];

          // Filtrar itens inválidos (sem imagem) para não quebrar o editor
          const validItems = rawItems.filter(item => (item.image || item.src || "").trim() !== "");

          if (validItems.length === 0) return null;

          // Duplicar para loop infinito: -50% do track = exatamente 1 conjunto
          const track = [...validItems, ...validItems];
          const duration = Math.max(validItems.length * 5, 18);

          return (
            <section style={{ paddingTop: p.padTop ?? 48, paddingBottom: p.padBottom ?? 48, overflow: "hidden" }}>
              <style>{`@keyframes insta-loop{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>

              {(p.heading || p.subtext) && (
                <div className="px-6 md:px-12 lg:px-20 mb-10 text-center">
                  {p.heading && <p className="text-[10px] tracking-[0.28em] uppercase mb-3" style={{ color: BROWN }}>Instagram</p>}
                  {p.heading && <h2 className="font-serif-display text-3xl sm:text-4xl leading-[1.1]" style={{ color: DARK, fontFamily: "'Playfair Display',Georgia,serif" }}>{p.heading}</h2>}
                  {p.subtext && <p className="mt-2 text-sm tracking-[0.1em]" style={{ color: `${DARK}80` }}>{p.subtext}</p>}
                </div>
              )}

              <div
                onMouseEnter={pause}
                onMouseLeave={resume}
                onTouchStart={pause}
                onTouchEnd={scheduleResume}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    width: "max-content",
                    animation: `insta-loop ${duration}s linear infinite`,
                    animationPlayState: isPaused ? "paused" : "running",
                    willChange: "transform",
                  }}
                >
                  {track.map((item, i) => (
                    <CarouselItem key={i} item={item} fallbackLink={p.instagram} />
                  ))}
                </div>
              </div>

              {p.ctaText && p.instagram && (
                <div className="text-center mt-10">
                  <a
                    href={p.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", padding: "13px 32px", border: `1.5px solid ${BROWN}`, color: BROWN, fontSize: "10px", letterSpacing: "0.24em", textTransform: "uppercase", textDecoration: "none", transition: "background 0.3s, color 0.3s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = BROWN; e.currentTarget.style.color = CREAM; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = BROWN; }}
                  >
                    {p.ctaText}
                  </a>
                </div>
              )}
            </section>
          );
        };
        return <InstaCarousel />;
      },
    },

    // ---------- EMAIL CONTACTO ----------
    ContactEmail: {
      label: "Email Contacto",
      fields: {
        heading: { type: "text", label: "Titulo", contentEditable: true },
        headingColor: colorField("Cor do titulo"),
        headingSize: { type: "number", label: "Tamanho do titulo (px, 0=auto)" },
        email: { type: "text", label: "Email para contacto" },
        text: { type: "textarea", label: "Texto descritivo (opcional)", contentEditable: true },
        textColor: colorField("Cor do texto"),
        textSize: { type: "number", label: "Tamanho do texto (px, 0=auto)" },
        align: alignField("Alinhamento"),
        bg: colorField("Fundo"),
        padTop: { type: "number", label: "Espaco acima (px)" },
        padBottom: { type: "number", label: "Espaco abaixo (px)" },
      },
      defaultProps: {
        heading: "Or send us an email",
        headingColor: DARK,
        headingSize: 0,
        email: "escentialfragrance05@gmail.com",
        text: "For detailed inquiries or feedback, reach out directly",
        textColor: "rgba(59,38,24,.75)",
        textSize: 0,
        align: "center",
        bg: CREAM,
        padTop: 80,
        padBottom: 80,
      },
      render: (p) => (
        <section className="px-6 md:px-12 lg:px-20" style={surfaceStyle(p.bg || CREAM, p.padTop, p.padBottom)}>
          <div className={`max-w-2xl ${p.align === "center" ? "mx-auto" : ""} ${alignClass(p.align)}`}>
            {p.heading && (
              <h2
                className={`font-serif-display leading-[1.1] mb-6 ${p.headingSize ? "" : "text-3xl sm:text-4xl lg:text-5xl"}`}
                style={{ color: p.headingColor || DARK, fontSize: pxAuto(p.headingSize) }}
              >
                {p.heading}
              </h2>
            )}
            {p.text && (
              <p
                className={`mb-8 leading-relaxed ${p.textSize ? "" : "text-base"}`}
                style={{ color: p.textColor || "rgba(59,38,24,.75)", fontSize: pxAuto(p.textSize) }}
              >
                {p.text}
              </p>
            )}
            {p.email && (
              <a
                href={`mailto:${p.email}`}
                style={{
                  display: "inline-block",
                  fontSize: "18px",
                  color: BROWN,
                  fontWeight: 600,
                  textDecoration: "none",
                  borderBottom: `2px solid ${BROWN}`,
                  paddingBottom: "2px",
                  transition: "all 0.3s ease",
                  letterSpacing: "0.02em",
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = DARK;
                  e.target.style.borderBottomColor = DARK;
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = BROWN;
                  e.target.style.borderBottomColor = BROWN;
                }}
              >
                {p.email}
              </a>
            )}
          </div>
        </section>
      ),
    },
  },

  categories: {
    elementos: {
      title: "Elementos",
      components: ["Heading", "Text", "ImageBlock", "Button", "Video", "Icon", "Divider", "Spacer", "Form"],
    },
    layout: {
      title: "Layout",
      components: ["Box", "Grid", "Columns", "Section"],
    },
    seccoes: {
      title: "Seccoes",
      components: ["FeaturedProducts", "Features", "Stats", "Testimonials", "FAQ", "Newsletter"],
    },
    templates: {
      title: "Blocos prontos (templates)",
      components: ["Hero", "HeroSplit", "Banner", "Story", "EditorialSplit", "Fragrances", "Gallery"],
    },
  },
};

export default puckConfig;
