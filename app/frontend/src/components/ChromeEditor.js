import React, { useState } from "react";
import { X, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "../contexts/AppContext";
import { API } from "../lib/api";
import ImageUpload from "../lib/ImageField";

const inputCls = "w-full bg-white border border-[#E0D3C3] py-2 px-3 text-sm outline-none focus:border-[#8B5E3C] transition-colors";

// Abas padrao do site (so se ainda nao houver lista personalizada)
const DEFAULT_NAV = [
  { label: "Home", link: "/" },
  { label: "Shop", link: "/shop" },
  { label: "About", link: "/about" },
  { label: "Fragrances", link: "/fragrances" },
  { label: "Contact", link: "/contact" },
];

const ColorRow = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-[#3B2618] w-32 shrink-0">{label}</span>
    <input
      type="color"
      value={/^#([0-9a-f]{6})$/i.test(value || "") ? value : "#F9F6F0"}
      onChange={(e) => onChange(e.target.value)}
      className="w-9 h-8 border border-[#E0D3C3] cursor-pointer p-0"
    />
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="#......"
      className="flex-1 min-w-0 text-sm border border-[#E0D3C3] px-2 py-1.5 outline-none focus:border-[#8B5E3C]"
    />
    {value ? (
      <button type="button" onClick={() => onChange("")} className="text-[#8B5E3C] text-sm px-2" title="Limpar">×</button>
    ) : null}
  </div>
);

// Editor dedicado de header + footer (inline no construtor, sem ir a Settings)
const ChromeEditor = ({ settings, initialTab = "header", onClose, onSaved }) => {
  const { token } = useApp();
  const [tab, setTab] = useState(initialTab === "footer" ? "footer" : "header");
  const [form, setForm] = useState(() => {
    const s = settings || {};
    // Se ainda nao ha abas personalizadas, mostra as padrao para nao "perder" o menu
    const navList = Array.isArray(s.nav) && s.nav.length > 0 ? s.nav : DEFAULT_NAV;
    return { ...s, nav: navList };
  });

  const branding = form.branding || {};
  const header = form.header || {};
  const footer = form.footer || {};
  const nav = Array.isArray(form.nav) ? form.nav : [];

  const updBranding = (k, v) => setForm((f) => ({ ...f, branding: { ...(f.branding || {}), [k]: v } }));
  const updHeader = (k, v) => setForm((f) => ({ ...f, header: { ...(f.header || {}), [k]: v } }));
  const updFooter = (k, v) => setForm((f) => ({ ...f, footer: { ...(f.footer || {}), [k]: v } }));
  const setNav = (next) => setForm((f) => ({ ...f, nav: next }));
  const updNavItem = (i, k, v) => setNav(nav.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const removeNavItem = (i) => setNav(nav.filter((_, idx) => idx !== i));
  const moveNavItem = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= nav.length) return;
    const next = [...nav];
    [next[i], next[j]] = [next[j], next[i]];
    setNav(next);
  };

  const save = async () => {
    try {
      const payload = {
        branding: { logo: branding.logo || "", name: (branding.name || "").trim() },
        nav: nav
          .map((it) => ({ label: (it.label || "").trim(), link: (it.link || "").trim() }))
          .filter((it) => it.label),
        header: {
          bg: (header.bg || "").trim(),
          text: (header.text || "").trim(),
          active: (header.active || "").trim(),
          border: (header.border || "").trim(),
          logoHeight: header.logoHeight ? Number(header.logoHeight) : 0,
        },
        footer: {
          tagline: (footer.tagline || "").trim(),
          instagram: (footer.instagram || "").trim(),
          email: (footer.email || "").trim(),
          bg: (footer.bg || "").trim(),
          text: (footer.text || "").trim(),
          border: (footer.border || "").trim(),
        },
      };
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      toast.success("Header / footer guardados!");
      onSaved({ ...form, ...payload });
    } catch {
      toast.error("Erro ao guardar");
    }
  };

  const tabBtn = (key, label) => (
    <button
      type="button"
      onClick={() => setTab(key)}
      className={`flex-1 py-3 text-xs uppercase tracking-luxe transition-colors ${
        tab === key ? "bg-[#8B5E3C] text-[#F9F6F0]" : "bg-[#EDE4D8] text-[#5C3A21] hover:bg-[#E0D3C3]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-[#3B2618]/40" onClick={onClose} />
      <div className="relative bg-[#F9F6F0] w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0D3C3]">
          <h2 className="font-serif-display text-2xl">Header & Footer</h2>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-[#E0D3C3]">
          {tabBtn("header", "Header")}
          {tabBtn("footer", "Footer")}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {tab === "header" ? (
            <>
              <div>
                <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Logotipo</label>
                <div className="mt-2">
                  <ImageUpload value={branding.logo || ""} onChange={(v) => updBranding("logo", v)} />
                  {branding.logo ? (
                    <button
                      type="button"
                      onClick={() => updBranding("logo", "")}
                      className="mt-2 text-xs uppercase tracking-luxe text-[#964545] hover:text-[#7d3939] flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Remover logo (usar por defeito)
                    </button>
                  ) : (
                    <p className="mt-2 text-[11px] text-[#6B5645]">A usar o logo por defeito.</p>
                  )}
                </div>
              </div>

              <div className="border-t border-[#E0D3C3] pt-5">
                <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Estilo do header</label>
                <p className="mt-1 text-[11px] text-[#6B5645]">Deixa vazio para usar o estilo por defeito.</p>
                <div className="mt-3 space-y-3">
                  <ColorRow label="Cor de fundo" value={header.bg} onChange={(v) => updHeader("bg", v)} />
                  <ColorRow label="Cor das abas" value={header.text} onChange={(v) => updHeader("text", v)} />
                  <ColorRow label="Cor da aba ativa" value={header.active} onChange={(v) => updHeader("active", v)} />
                  <ColorRow label="Cor da linha inferior" value={header.border} onChange={(v) => updHeader("border", v)} />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#3B2618] w-32 shrink-0">Altura do logo (px)</span>
                    <input
                      type="number"
                      value={header.logoHeight || ""}
                      onChange={(e) => updHeader("logoHeight", e.target.value)}
                      placeholder="auto"
                      className="flex-1 min-w-0 text-sm border border-[#E0D3C3] px-2 py-1.5 outline-none focus:border-[#8B5E3C]"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#E0D3C3] pt-5">
                <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Abas do menu</label>
                <p className="mt-1 text-[11px] text-[#6B5645]">Para criar novas abas, cria a pagina em "Paginas".</p>
                {nav.length === 0 ? (
                  <p className="mt-2 text-xs text-[#6B5645]">Sem abas. Cria uma pagina em "Paginas".</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {nav.map((it, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white border border-[#E0D3C3] p-2">
                        <div className="flex flex-col">
                          <button type="button" onClick={() => moveNavItem(i, -1)} className="text-[#8B5E3C]"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => moveNavItem(i, 1)} className="text-[#8B5E3C]"><ArrowDown className="w-3.5 h-3.5" /></button>
                        </div>
                        <input
                          value={it.label || ""}
                          onChange={(e) => updNavItem(i, "label", e.target.value)}
                          placeholder="Nome"
                          className="flex-1 min-w-0 text-sm border border-[#E0D3C3] px-2 py-1.5 outline-none focus:border-[#8B5E3C]"
                        />
                        <input
                          value={it.link || ""}
                          onChange={(e) => updNavItem(i, "link", e.target.value)}
                          placeholder="/shop ou #about"
                          className="flex-1 min-w-0 text-sm border border-[#E0D3C3] px-2 py-1.5 outline-none focus:border-[#8B5E3C]"
                        />
                        <button type="button" onClick={() => removeNavItem(i)} className="text-[#8B5E3C] hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-[11px] text-[#6B5645]">Link: <b>/shop</b> (pagina), <b>#about</b> (seccao da home), ou <b>https://...</b> (externo)</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Conteudo</label>
                <div className="mt-3 space-y-3">
                  <input value={footer.tagline || ""} onChange={(e) => updFooter("tagline", e.target.value)} placeholder="Frase / tagline" className={inputCls} />
                  <input value={footer.instagram || ""} onChange={(e) => updFooter("instagram", e.target.value)} placeholder="Link do Instagram (vazio = esconder)" className={inputCls} />
                  <input value={footer.email || ""} onChange={(e) => updFooter("email", e.target.value)} placeholder="Email (vazio = esconder)" className={inputCls} />
                </div>
              </div>
              <div className="border-t border-[#E0D3C3] pt-5">
                <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Estilo do footer</label>
                <div className="mt-3 space-y-3">
                  <ColorRow label="Cor de fundo" value={footer.bg} onChange={(v) => updFooter("bg", v)} />
                  <ColorRow label="Cor do texto" value={footer.text} onChange={(v) => updFooter("text", v)} />
                  <ColorRow label="Cor da linha superior" value={footer.border} onChange={(v) => updFooter("border", v)} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E0D3C3] flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 border border-[#8B5E3C] text-[#8B5E3C] py-3 text-xs uppercase tracking-luxe hover:bg-[#EDE4D8]">
            Cancelar
          </button>
          <button type="button" onClick={save} className="flex-1 bg-[#8B5E3C] text-[#F9F6F0] py-3 text-xs uppercase tracking-luxe hover:bg-[#5C3A21]">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChromeEditor;
