import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { toast } from "sonner";
import { API } from "../lib/api";
import { Trash2, Pencil, Plus, GripVertical, LogOut, Star, X, ArrowLeft, ArrowUp, ArrowDown, Check, EyeOff, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import ImageUpload from "../lib/ImageField";
import { compressImage } from "../lib/MediaField";
import { pagesDefault, pageTitles } from "../lib/pages.default";
import { isOnSale, discountPercent } from "../lib/sale";

const emptyProduct = {
  name_en: "",
  description_en: "",
  scent_notes_en: "",
  price_gbp: 0,
  price_on_request: false,
  sale_price_gbp: "",
  images: [],
  featured: false,
  show_home: false,
  active: true,
};

const inputCls = "mt-2 w-full bg-white border border-[#E0D3C3] py-2.5 px-3 text-sm outline-none focus:border-[#8B5E3C] transition-colors";

// A página "fragrances" é apresentada como "Scent" (URL /scent).
const PAGE_LABEL = { fragrances: "Scent" };
const PAGE_PATH = { fragrances: "/scent" };

const Field = ({ label, children }) => (
  <div>
    <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">{label}</label>
    {children}
  </div>
);

// Barra de navegação do admin: rola com setas no tablet/mobile (sem scrollbar visível)
const NavScroller = ({ children }) => {
  const ref = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft >= max - 1);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const overflow = !(atStart && atEnd);
  const scrollBy = (dir) => ref.current?.scrollBy({ left: dir * 160, behavior: "smooth" });

  return (
    <div className="flex items-center gap-1 w-full lg:w-auto border-t border-[#8B5E3C]/10 pt-3 lg:border-0 lg:pt-0">
      {overflow && (
        <button type="button" onClick={() => scrollBy(-1)} disabled={atStart} aria-label="Anterior"
          className="lg:hidden shrink-0 p-1 text-[#8B5E3C] hover:text-[#5C3A21] disabled:opacity-25 transition-opacity">
          <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}
      <div ref={ref} className="flex items-center gap-3 sm:gap-5 lg:gap-4 overflow-x-auto no-scrollbar flex-1 lg:flex-none px-1">
        {children}
      </div>
      {overflow && (
        <button type="button" onClick={() => scrollBy(1)} disabled={atEnd} aria-label="Próximo"
          className="lg:hidden shrink-0 p-1 text-[#8B5E3C] hover:text-[#5C3A21] disabled:opacity-25 transition-opacity">
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const { logout, t, setSettings, token } = useApp();
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [settingsLocal, setSettingsLocal] = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const nav = useNavigate();
  const dragSrc = useRef(null);

  const loadPending = async () => {
    try {
      const res = await fetch(`${API}/admin/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setPendingFeedback((data || []).filter((f) => f.status === "pending").length);
    } catch {}
  };

  const load = async () => {
    try {
      const response = await fetch(`${API}/admin/products`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error(`Failed to load products: ${response.status}`);
      const data = await response.json();
      setProducts(data || []);
    } catch (e) {
      console.error("Admin load error", e);
      toast.error("Failed to load");
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch(`${API}/settings`);
      if (!response.ok) throw new Error("Failed to load settings");
      const data = await response.json();
      setSettingsLocal(data || {});
    } catch (e) {
      console.error(e);
      toast.error("Failed to load settings");
    }
  };

  useEffect(() => {
    if (token) {
      load();
      loadPending();
    }
    loadSettings();
  }, [token]);

  // Abre Settings automaticamente quando vem de /admin?settings=1 (atalho do editor)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("settings")) setShowSettings(true);
  }, []);

  const handleLogout = () => {
    logout();
    nav("/admin/login");
  };

  const onDelete = async () => {
    const id = confirmDelete?.id;
    if (!id) { setConfirmDelete(null); return; }
    setDeleting(true);
    try {
      const response = await fetch(`${API}/admin/products/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Deleted");
      setConfirmDelete(null);
      load();
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const onDragStart = (idx) => { dragSrc.current = idx; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (dropIdx) => {
    if (dragSrc.current === null || dragSrc.current === dropIdx) return;
    const reordered = [...products];
    const [moved] = reordered.splice(dragSrc.current, 1);
    reordered.splice(dropIdx, 0, moved);
    const updatedProducts = reordered.map((product, idx) => ({
      ...product,
      order: idx,
    }));
    setProducts(updatedProducts);
    dragSrc.current = null;
    try {
      const ordered_ids = updatedProducts.map(p => p.id);
      const response = await fetch(`${API}/admin/products-reorder`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ordered_ids })
      });
      if (!response.ok) throw new Error("Failed to reorder");
      toast.success(t("admin.saved"));
    } catch (e) {
      console.error(e);
      toast.error("Reorder failed");
    }
  };

  return (
    <main data-testid="admin-dashboard" className="min-h-screen bg-[#F9F6F0]">
      <header className="border-b border-[#8B5E3C]/10 px-6 md:px-12 py-4 lg:py-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-[#F9F6F0] sticky top-0 z-10">
        <Link to="/" className="font-serif-display text-xl sm:text-2xl flex items-center gap-2">
          <ArrowLeft strokeWidth={1.25} className="w-4 h-4 text-[#8B5E3C]" /> Escential <span className="text-xs tracking-luxe uppercase text-[#8B5E3C]">{t("admin.dashboard")}</span>
        </Link>
        <NavScroller>
          <button
            onClick={() => setShowCarousel(true)}
            className="px-1 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] whitespace-nowrap shrink-0"
          >
            Carrossel
          </button>
          <button
            onClick={() => setShowFeedback(true)}
            className="inline-flex items-center gap-1.5 px-1 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] whitespace-nowrap shrink-0"
          >
            Feedback
            {pendingFeedback > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 bg-[#964545] text-[#F9F6F0] text-[9px] font-bold rounded-full leading-none">
                {pendingFeedback}
              </span>
            )}
          </button>
          <button
            data-testid="admin-pages-btn"
            onClick={() => setShowPages(true)}
            className="px-1 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] whitespace-nowrap shrink-0"
          >
            Paginas
          </button>
          <button
            data-testid="admin-settings-btn"
            onClick={() => setShowSettings(true)}
            className="px-1 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] whitespace-nowrap shrink-0"
          >
            {t("admin.settings")}
          </button>
          <button
            data-testid="admin-logout-btn"
            onClick={handleLogout}
            className="px-1 text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.5} /> {t("admin.logout")}
          </button>
        </NavScroller>
      </header>

      <div className="px-6 md:px-12 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <h1 className="font-serif-display text-3xl sm:text-4xl">
            {t("admin.products")} <span className="text-sm text-[#8B5E3C]">({products.length})</span>
          </h1>
          <button
            data-testid="add-product-btn"
            onClick={() => setEditing({ ...emptyProduct })}
            className="bg-[#8B5E3C] text-[#F9F6F0] px-5 py-2.5 text-xs tracking-luxe uppercase hover:bg-[#5C3A21] inline-flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> {t("admin.add_product")}
          </button>
        </div>

        <p className="text-xs text-[#A68A72] mb-4 italic">{t("admin.reorder_hint")}</p>

        <div className="bg-white border border-[#E0D3C3]">
          <div className="hidden md:grid grid-cols-12 px-4 py-3 text-[10px] tracking-luxe uppercase text-[#8B5E3C] border-b border-[#E0D3C3]">
            <div className="col-span-1"></div>
            <div className="col-span-1">#</div>
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          {products.map((p, idx) => (
            <div
              key={p.id}
              data-testid={`admin-product-row-${p.id}`}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className="drag-row flex items-center gap-3 md:grid md:grid-cols-12 md:gap-2 px-4 py-3 md:items-center border-b border-[#E0D3C3] last:border-b-0 hover:bg-[#EDE4D8]/40 cursor-move"
            >
              <div className="hidden md:block md:col-span-1 text-[#A68A72]"><GripVertical className="w-4 h-4" strokeWidth={1.5} /></div>
              <div className="hidden md:block md:col-span-1 text-sm">{idx + 1}</div>
              <div className="flex items-center gap-3 flex-1 min-w-0 md:flex-none md:col-span-4">
                {p.images?.[0] && <img src={p.images[0]} className="w-10 h-12 object-cover bg-[#EDE4D8] shrink-0" alt="" />}
                <div className="min-w-0">
                  <div className="font-serif-display text-base truncate">{p.name_en}</div>
                  <div className="md:hidden text-sm text-[#6B5645]">£{p.price_gbp?.toFixed(2)}</div>
                  <div className="md:hidden flex flex-wrap gap-x-3 gap-y-1 text-xs mt-1">
                    {p.featured && <span className="inline-flex items-center gap-1 text-[#8B5E3C]"><Star className="w-3 h-3" strokeWidth={1.5} /> {t("admin.featured")}</span>}
                    {p.show_home && <span className="text-[#8B5E3C]">{t("admin.show_home")}</span>}
                    {!p.active && <span className="text-[#964545]">inactive</span>}
                    {isOnSale(p) && <span className="text-[#964545]">−{discountPercent(p)}%</span>}
                  </div>
                </div>
              </div>
              <div className="hidden md:block md:col-span-2 text-sm">£{p.price_gbp?.toFixed(2)}</div>
              <div className="hidden md:flex md:col-span-2 text-xs gap-3 items-center">
                {p.featured && <span className="inline-flex items-center gap-1 text-[#8B5E3C]"><Star className="w-3 h-3" strokeWidth={1.5} /> {t("admin.featured")}</span>}
                {p.show_home && <span className="text-[#8B5E3C]">{t("admin.show_home")}</span>}
                {!p.active && <span className="text-[#964545]">inactive</span>}
                {isOnSale(p) && <span className="text-[#964545]">−{discountPercent(p)}%</span>}
              </div>
              <div className="flex justify-end gap-1 md:gap-2 shrink-0 md:col-span-2">
                <button data-testid={`edit-${p.id}`} onClick={() => setEditing(p)} className="p-2 hover:text-[#8B5E3C]">
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button data-testid={`delete-${p.id}`} onClick={() => setConfirmDelete(p)} className="p-2 hover:text-[#964545]">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {showSettings && settingsLocal && (
        <SettingsEditor
          settings={settingsLocal}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => { setSettings(s); setSettingsLocal(s); setShowSettings(false); }}
        />
      )}

      {showCarousel && (
        <CarouselManager
          token={token}
          onClose={() => setShowCarousel(false)}
        />
      )}

      {showFeedback && (
        <FeedbackManager
          token={token}
          onClose={() => { setShowFeedback(false); loadPending(); }}
        />
      )}

      {showPages && settingsLocal && (
        <PagesManager
          settings={settingsLocal}
          token={token}
          nav={nav}
          onClose={() => setShowPages(false)}
          onSaved={(s) => { setSettings(s); setSettingsLocal(s); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4">
          <div data-testid="confirm-delete" className="bg-[#F9F6F0] max-w-sm w-full p-8">
            <h2 className="font-serif-display text-2xl mb-3">{t("admin.confirm_delete")}</h2>
            <p className="text-sm text-[#6B5645] mb-6">{confirmDelete.name_en}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="px-5 py-2 text-sm border border-[#E0D3C3] hover:bg-[#EDE4D8]/40 transition-colors disabled:opacity-50"
              >
                {t("admin.cancel")}
              </button>
              <button
                type="button"
                data-testid="confirm-delete-yes"
                onClick={onDelete}
                disabled={deleting}
                className="px-5 py-2 text-sm bg-[#964545] text-white hover:bg-[#7d3939] transition-colors disabled:opacity-50"
              >
                {t("admin.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

const ProductEditor = ({ product, onClose, onSaved }) => {
  const { t, token } = useApp();
  const isNew = !product.id;
  const [form, setForm] = useState(product);
  const [saving, setSaving] = useState(false);

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price_gbp: parseFloat(form.price_gbp) || 0,
        price_on_request: !!form.price_on_request,
        sale_price_gbp: form.sale_price_gbp === "" || form.sale_price_gbp == null ? null : (parseFloat(form.sale_price_gbp) || 0),
        images: (form.images || []).filter(Boolean),
        featured: !!form.featured,
        show_home: !!form.show_home,
        active: form.active !== false,
      };
      
      if (product.id) {
        // Edit existing product
        const response = await fetch(`${API}/admin/products/${product.id}`, {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Failed to update");
      } else {
        // New product
        const response = await fetch(`${API}/admin/products`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("Failed to create");
      }
      
      toast.success(t("admin.saved"));
      onSaved();
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addImage = () => upd("images", [...(form.images || []), ""]);
  const setImage = (i, v) => upd("images", form.images.map((x, idx) => (idx === i ? v : x)));
  const removeImage = (i) => upd("images", form.images.filter((_, idx) => idx !== i));

  const onFile = async (e, i) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      // Comprime e faz upload pro Storage; guarda só a URL (não base64 no DB).
      const { data, ext } = await compressImage(f, 1280, 0.8);
      const token = localStorage.getItem("ef_token");
      const res = await fetch(`${API}/admin/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data, ext }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const json = await res.json();
      setImage(i, json.url);
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao carregar imagem: ${err.message || "erro desconhecido"}`);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <form
        data-testid="product-editor"
        onSubmit={onSubmit}
        className="bg-[#F9F6F0] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-3xl">{isNew ? t("admin.add_product") : t("admin.edit")}</h2>
          <button type="button" onClick={onClose} className="p-2"><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          <Field label={t("admin.name_en")}>
            <input data-testid="name-en-input" required value={form.name_en} onChange={(e) => upd("name_en", e.target.value)} className={inputCls} />
          </Field>
          <Field label="URL slug (opcional)">
            <input
              value={form.slug || ""}
              onChange={(e) => upd("slug", e.target.value)}
              placeholder={slugify(form.name_en) || "gerado-do-nome"}
              className={inputCls}
            />
            <p className="mt-1 text-xs text-[#A68A72]">
              /product/{form.slug ? slugify(form.slug) : (slugify(form.name_en) || "…")} · deixar vazio gera automaticamente do nome
            </p>
          </Field>
          <Field label={t("admin.desc_en")}>
            <textarea value={form.description_en} onChange={(e) => upd("description_en", e.target.value)} rows="3" className={inputCls} />
          </Field>
          <Field label={t("admin.notes_en")}>
            <input value={form.scent_notes_en} onChange={(e) => upd("scent_notes_en", e.target.value)} className={inputCls} />
          </Field>
          <Field label={t("admin.price_gbp")}>
            <input data-testid="price-gbp-input" type="number" step="0.01" required={!form.price_on_request} disabled={!!form.price_on_request} value={form.price_gbp} onChange={(e) => upd("price_gbp", e.target.value)} className={inputCls + (form.price_on_request ? " opacity-50" : "")} />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!form.price_on_request} onChange={(e) => upd("price_on_request", e.target.checked)} />
              Preço sob consulta (sem preço fixo)
            </label>
          </Field>
          <Field label="Preço promocional (£)">
            <input
              data-testid="sale-price-input"
              type="number"
              min="0"
              step="0.01"
              value={form.sale_price_gbp ?? ""}
              onChange={(e) => upd("sale_price_gbp", e.target.value)}
              placeholder="Vazio = sem promoção"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-[#A68A72]">Vazio = sem promoção · deve ser menor que o preço normal</p>
          </Field>
        </div>

        <div className="mt-6">
          <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">{t("admin.images")}</label>
          <div className="mt-3 space-y-2">
            {(form.images || []).map((src, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <input
                  value={src}
                  onChange={(e) => setImage(i, e.target.value)}
                  placeholder="https://..."
                  className={inputCls + " flex-1 min-w-[140px]"}
                />
                <label className="text-xs uppercase tracking-luxe text-[#8B5E3C] cursor-pointer border border-[#8B5E3C] px-3 py-2 hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e, i)} />
                </label>
                {src && <img src={src} className="w-10 h-12 object-cover" alt="" />}
                <button type="button" onClick={() => removeImage(i)} className="p-2 text-[#964545]"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
              </div>
            ))}
            <button type="button" onClick={addImage} className="text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21]">+ {t("admin.add_image")}</button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input data-testid="featured-checkbox" type="checkbox" checked={!!form.featured} onChange={(e) => upd("featured", e.target.checked)} />
            {t("admin.featured")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input data-testid="showhome-checkbox" type="checkbox" checked={!!form.show_home} onChange={(e) => upd("show_home", e.target.checked)} />
            {t("admin.show_home")}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active !== false} onChange={(e) => upd("active", e.target.checked)} />
            {t("admin.active")}
          </label>
        </div>

        <div className="mt-8 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            {t("admin.cancel")}
          </button>
          <button data-testid="save-product-btn" disabled={saving} type="submit" className="bg-[#8B5E3C] text-[#F9F6F0] px-8 py-3 text-xs uppercase tracking-luxe hover:bg-[#5C3A21] disabled:opacity-60">
            {saving ? "…" : t("admin.save")}
          </button>
        </div>
      </form>
    </div>
  );
};

export const SettingsEditor = ({ settings, onClose, onSaved }) => {
  const { t, token } = useApp();
  const [form, setForm] = useState(settings);
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const branding = form.branding || {};
  const updBranding = (k, v) => setForm((f) => ({ ...f, branding: { ...(f.branding || {}), [k]: v } }));

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        whatsapp_number: (form.whatsapp_number || "").trim(),
        branding: { logo: branding.logo || "", name: (branding.name || "").trim() },
        show_box_button: form.show_box_button !== false,
      };

      const response = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error("Failed to update settings");

      toast.success(t("admin.saved"));
      onSaved({ ...form, ...payload });
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4">
      <form data-testid="settings-editor" onSubmit={onSubmit} className="bg-[#F9F6F0] max-w-md w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-2xl sm:text-3xl">{t("admin.settings")}</h2>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>
        <div className="space-y-5">
          <Field label={t("admin.whatsapp_number")}>
            <input
              data-testid="whatsapp-input"
              value={form.whatsapp_number || ""}
              onChange={(e) => upd("whatsapp_number", e.target.value)}
              placeholder="+44..."
              className={inputCls}
            />
          </Field>

          <Field label="Nome da marca">
            <input
              value={branding.name || ""}
              onChange={(e) => updBranding("name", e.target.value)}
              placeholder="Escential Fragrance"
              className={inputCls}
            />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer border-t border-[#E0D3C3] pt-5">
            <input
              type="checkbox"
              checked={form.show_box_button !== false}
              onChange={(e) => upd("show_box_button", e.target.checked)}
            />
            <span className="text-sm text-[#3B2618]">Mostrar botão "Build a Box" na loja</span>
          </label>

          <p className="text-[11px] text-[#6B5645]">
            Header, footer e abas do menu editam-se no construtor de paginas (clica no header/footer dentro do editor).
          </p>
        </div>
        <div className="mt-8 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            {t("admin.cancel")}
          </button>
          <button type="submit" className="bg-[#8B5E3C] text-[#F9F6F0] px-8 py-3 text-xs uppercase tracking-luxe hover:bg-[#5C3A21]">
            {t("admin.save")}
          </button>
        </div>
      </form>
    </div>
  );
};

const slugify = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const RESERVED = ["", "shop", "admin", "product", "faq", "privacy"];

// Abas padrao (usadas para nao "perder" o menu ao criar a 1a aba personalizada)
const DEFAULT_NAV = [
  { label: "Home", link: "/" },
  { label: "Shop", link: "/shop" },
  { label: "About", link: "/about" },
  { label: "Fragrances", link: "/fragrances" },
  { label: "Contact", link: "/contact" },
];

const PagesManager = ({ settings, token, nav, onClose, onSaved }) => {
  const [pages, setPages] = useState(Array.isArray(settings.pages) ? settings.pages : []);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const persist = async (nextPages, extra = {}) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ pages: nextPages, ...extra }),
      });
      if (!res.ok) throw new Error();
      setPages(nextPages);
      onSaved({ ...settings, pages: nextPages, ...extra });
      toast.success("Guardado");
      return true;
    } catch {
      toast.error("Erro ao guardar");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addPage = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const slug = slugify(title);
    if (RESERVED.includes(slug)) {
      toast.error("Esse endereco e reservado, escolhe outro nome");
      return;
    }
    if (pages.some((p) => p.slug === slug)) {
      toast.error("Ja existe uma pagina com esse endereco");
      return;
    }
    const next = [...pages, { slug, title, data: { content: [], root: {} } }];
    // Criar tambem a aba do menu (sem perder as padrao se a lista estiver vazia)
    const baseNav = Array.isArray(settings.nav) && settings.nav.length > 0 ? settings.nav : DEFAULT_NAV;
    const nextNav = [...baseNav, { label: title, link: `/${slug}` }];
    const ok = await persist(next, { nav: nextNav });
    if (ok) {
      setNewTitle("");
      nav(`/admin/editor?page=${slug}`);
    }
  };

  const removePage = async (slug) => {
    if (!window.confirm("Apagar esta pagina?")) return;
    // Remove tambem a aba do menu que aponta para esta pagina
    const curNav = Array.isArray(settings.nav) ? settings.nav : [];
    const nextNav = curNav.filter((it) => it.link !== `/${slug}`);
    const extra = nextNav.length !== curNav.length ? { nav: nextNav } : {};
    await persist(pages.filter((p) => p.slug !== slug), extra);
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F9F6F0] max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-2xl sm:text-3xl">Paginas</h2>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2">
          {/* Home fixa em código — não editável no Puck. */}

          {/* Paginas-modelo (editaveis; ainda nao guardadas) */}
          {Object.keys(pagesDefault)
            .filter((slug) => !pages.some((p) => p.slug === slug))
            .map((slug) => (
              <div key={slug} className="flex items-center justify-between bg-white border border-dashed border-[#E0D3C3] px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#3B2618] truncate">
                    {PAGE_LABEL[slug] || pageTitles[slug] || slug}
                    <span className="ml-2 text-[10px] tracking-luxe uppercase text-[#A68A72] border border-[#E0D3C3] px-1.5 py-0.5">modelo</span>
                  </div>
                  <div className="text-xs text-[#A68A72]">{PAGE_PATH[slug] || `/${slug}`}</div>
                </div>
                <button onClick={() => nav(`/admin/editor?page=${slug}`)} className="text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              </div>
            ))}

          {pages.map((p) => (
            <div key={p.slug} className="flex items-center justify-between bg-white border border-[#E0D3C3] px-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#3B2618] truncate">{PAGE_LABEL[p.slug] || p.title}</div>
                <div className="text-xs text-[#A68A72]">{PAGE_PATH[p.slug] || `/${p.slug}`}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => nav(`/admin/editor?page=${p.slug}`)} className="text-xs uppercase tracking-luxe text-[#8B5E3C] hover:text-[#5C3A21] flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => removePage(p.slug)} disabled={busy} className="text-[#8B5E3C] hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-[#E0D3C3]">
          <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Nova pagina</label>
          <div className="flex gap-2 mt-2">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Sobre nos"
              className="flex-1 bg-white border border-[#E0D3C3] py-2.5 px-3 text-sm outline-none focus:border-[#8B5E3C]"
            />
            <button onClick={addPage} disabled={busy} className="bg-[#8B5E3C] text-[#F9F6F0] px-5 py-2.5 text-xs uppercase tracking-luxe hover:bg-[#5C3A21] flex items-center gap-1">
              <Plus className="w-4 h-4" /> Criar
            </button>
          </div>
          {newTitle.trim() && (
            <p className="mt-2 text-[11px] text-[#6B5645]">Endereco: <b>/{slugify(newTitle)}</b></p>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const emptyCarouselItem = { image: "", link: "", title: "", active: true };

const CarouselManager = ({ token, onClose }) => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);
  const dragSrc = useRef(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API}/admin/carousel`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Carousel load:", e);
      setLoadError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDragStart = (idx) => { dragSrc.current = idx; };
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (dropIdx) => {
    if (dragSrc.current === null || dragSrc.current === dropIdx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragSrc.current, 1);
    reordered.splice(dropIdx, 0, moved);
    setItems(reordered);
    dragSrc.current = null;
    try {
      const res = await fetch(`${API}/admin/carousel-reorder`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids: reordered.map(c => c.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ordem guardada");
    } catch { toast.error("Erro ao reordenar"); load(); }
  };

  const toggleActive = async (item) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/carousel/${item.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch { toast.error("Erro"); }
    finally { setBusy(false); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Apagar este item do carrossel?")) return;
    try {
      const res = await fetch(`${API}/admin/carousel/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Apagado");
      load();
    } catch { toast.error("Erro ao apagar"); }
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F9F6F0] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-2xl sm:text-3xl">Carrossel</h2>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-[#A68A72] mb-4 italic">Arrasta para reordenar. Os itens desativados não aparecem no site.</p>

        <div className="bg-white border border-[#E0D3C3] mb-6">
          {loading && (
            <p className="text-sm text-[#A68A72] text-center py-8">A carregar…</p>
          )}
          {!loading && loadError && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-red-500">{loadError}</p>
              <button onClick={load} className="text-xs text-[#8B5E3C] underline underline-offset-4">Tentar novamente</button>
            </div>
          )}
          {!loading && !loadError && items.length === 0 && (
            <p className="text-sm text-[#A68A72] text-center py-8">Nenhum item. Adiciona o primeiro abaixo.</p>
          )}
          {!loading && !loadError && items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className="flex items-center gap-3 md:grid md:grid-cols-12 md:gap-2 px-4 py-3 md:items-center border-b border-[#E0D3C3] last:border-b-0 hover:bg-[#EDE4D8]/40 cursor-move"
            >
              <div className="hidden md:block md:col-span-1 text-[#A68A72]"><GripVertical className="w-4 h-4" strokeWidth={1.5} /></div>
              <div className="shrink-0 md:col-span-2">
                {item.image
                  ? <img src={item.image} className="w-12 h-12 object-cover bg-[#EDE4D8]" alt="" />
                  : <div className="w-12 h-12 bg-[#EDE4D8]" />}
              </div>
              <div className="flex-1 min-w-0 md:col-span-5">
                <div className="text-sm font-medium text-[#3B2618] truncate">{item.title || <span className="text-[#A68A72] italic">sem título</span>}</div>
                <div className="text-xs text-[#A68A72] truncate">{item.link || "–"}</div>
                <button
                  onClick={() => toggleActive(item)}
                  disabled={busy}
                  className={`md:hidden mt-1.5 px-2 py-1 border text-[10px] tracking-luxe uppercase ${item.active ? "border-[#8B5E3C] text-[#8B5E3C]" : "border-[#A68A72] text-[#A68A72]"}`}
                >
                  {item.active ? "Ativo" : "Inativo"}
                </button>
              </div>
              <div className="hidden md:block md:col-span-2 text-xs">
                <button
                  onClick={() => toggleActive(item)}
                  disabled={busy}
                  className={`px-2 py-1 border text-[10px] tracking-luxe uppercase ${item.active ? "border-[#8B5E3C] text-[#8B5E3C]" : "border-[#A68A72] text-[#A68A72]"}`}
                >
                  {item.active ? "Ativo" : "Inativo"}
                </button>
              </div>
              <div className="flex justify-end gap-1 shrink-0 md:col-span-2">
                <button onClick={() => setEditing(item)} className="p-2 hover:text-[#8B5E3C]"><Pencil className="w-4 h-4" strokeWidth={1.5} /></button>
                <button onClick={() => deleteItem(item.id)} className="p-2 hover:text-[#964545]"><Trash2 className="w-4 h-4" strokeWidth={1.5} /></button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setEditing({ ...emptyCarouselItem })}
          className="bg-[#8B5E3C] text-[#F9F6F0] px-6 py-3 text-xs tracking-luxe uppercase hover:bg-[#5C3A21] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Adicionar item
        </button>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            Fechar
          </button>
        </div>
      </div>

      {editing && (
        <CarouselItemEditor
          item={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

const CarouselItemEditor = ({ item, token, onClose, onSaved }) => {
  const isNew = !item.id;
  const [form, setForm] = useState(item);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Comprime no browser e faz upload pro Storage; guarda só a URL (não base64 no DB).
  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const { data, ext } = await compressImage(file);
      const token = localStorage.getItem("ef_token");
      const res = await fetch(`${API}/admin/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data, ext }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const json = await res.json();
      upd("image", json.url);
    } catch (err) {
      toast.error(`Erro ao carregar a imagem: ${err.message || "erro desconhecido"}`);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = isNew ? `${API}/admin/carousel` : `${API}/admin/carousel/${item.id}`;
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success("Guardado");
      onSaved();
    } catch { toast.error("Erro ao guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/50 z-60 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-[#F9F6F0] max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif-display text-2xl">{isNew ? "Novo item" : "Editar item"}</h3>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <div className="space-y-5">
          <Field label="Imagem (URL ou upload)">
            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-start">
              <div className="flex-1">
                <input
                  value={form.image || ""}
                  onChange={e => upd("image", e.target.value)}
                  placeholder="URL ou faz upload →"
                  className={inputCls}
                />
              </div>
              <label className="text-center text-xs uppercase tracking-luxe text-[#8B5E3C] cursor-pointer border border-[#8B5E3C] px-3 py-2.5 hover:bg-[#8B5E3C] hover:text-[#F9F6F0] whitespace-nowrap shrink-0">
                {uploading ? "A carregar…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
                />
              </label>
            </div>
            {form.image && (
              <img src={form.image} className="mt-2 h-24 w-auto object-cover border border-[#E0D3C3]" alt="" />
            )}
          </Field>

          <Field label="Link de destino (opcional)">
            <input
              value={form.link || ""}
              onChange={e => upd("link", e.target.value)}
              placeholder="https://..."
              className={inputCls}
            />
          </Field>

          <Field label="Título (opcional)">
            <input
              value={form.title || ""}
              onChange={e => upd("title", e.target.value)}
              placeholder="Ex: Nova coleção"
              className={inputCls}
            />
          </Field>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active !== false} onChange={e => upd("active", e.target.checked)} />
            Ativo (visível no site)
          </label>
        </div>

        <div className="mt-8 flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            Cancelar
          </button>
          <button disabled={saving} type="submit" className="bg-[#8B5E3C] text-[#F9F6F0] px-8 py-3 text-xs uppercase tracking-luxe hover:bg-[#5C3A21] disabled:opacity-60">
            {saving ? "…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
};

const statusStyle = {
  approved: "border-[#3f7d4f] text-[#3f7d4f]",
  pending: "border-[#A68A72] text-[#A68A72]",
  hidden: "border-[#964545] text-[#964545]",
};
const statusLabel = { approved: "Aprovado", pending: "Pendente", hidden: "Oculto" };

const FbAvatar = ({ src, name }) => {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  if (!src || broken) {
    return (
      <div className="w-11 h-11 rounded-full bg-[#EDE4D8] text-[#8B5E3C] flex items-center justify-center text-base shrink-0">
        {initial}
      </div>
    );
  }
  return <img src={src} alt="" onError={() => setBroken(true)} className="w-11 h-11 rounded-full object-cover bg-[#EDE4D8] shrink-0" />;
};

const FeedbackManager = ({ token, onClose }) => {
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`${API}/admin/feedback`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Feedback load:", e);
      setLoadError(e.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (item, status) => {
    setBusy(true);
    try {
      const res = await fetch(`${API}/admin/feedback/${item.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      load();
    } catch { toast.error("Erro"); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remover este feedback definitivamente?")) return;
    try {
      const res = await fetch(`${API}/admin/feedback/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Removido");
      load();
    } catch { toast.error("Erro ao remover"); }
  };

  const fmtDate = (ts) => {
    if (!ts) return "";
    try { return new Date(ts * 1000).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return ""; }
  };

  return (
    <div className="fixed inset-0 bg-[#3B2618]/40 z-50 flex items-center justify-center p-4">
      <div className="bg-[#F9F6F0] max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-2xl sm:text-3xl">Feedback <span className="text-sm text-[#8B5E3C]">({items.length})</span></h2>
          <button type="button" onClick={onClose}><X strokeWidth={1.25} className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-[#A68A72] mb-4 italic">Apenas os aprovados aparecem no site. Novos entram como pendentes.</p>

        <div className="space-y-3">
          {loading && (
            <p className="text-sm text-[#A68A72] text-center py-8">A carregar…</p>
          )}
          {!loading && loadError && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-red-500">{loadError}</p>
              <button onClick={load} className="text-xs text-[#8B5E3C] underline underline-offset-4">Tentar novamente</button>
            </div>
          )}
          {!loading && !loadError && items.length === 0 && (
            <p className="text-sm text-[#A68A72] text-center py-8">Ainda não há feedback.</p>
          )}
          {!loading && !loadError && items.map((f) => (
            <div key={f.id} className="bg-white border border-[#E0D3C3] p-4 flex gap-4 items-start">
              <FbAvatar src={f.image} name={f.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#3B2618]">{f.name}</span>
                  <span className={`px-2 py-0.5 border text-[10px] tracking-luxe uppercase ${statusStyle[f.status] || statusStyle.pending}`}>
                    {statusLabel[f.status] || f.status}
                  </span>
                  <span className="text-[11px] text-[#A68A72]">{fmtDate(f.created_at)}</span>
                  {f.social && (
                    <a href={f.social} target="_blank" rel="noopener noreferrer" className="text-[#8B5E3C] hover:text-[#5C3A21]" aria-label="social">
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </a>
                  )}
                </div>
                <p className="text-sm text-[#3B2618]/80 leading-relaxed mt-1.5 whitespace-pre-line break-words">{f.text}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {f.status !== "approved" && (
                    <button onClick={() => setStatus(f, "approved")} disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-luxe uppercase border border-[#3f7d4f] text-[#3f7d4f] hover:bg-[#3f7d4f] hover:text-white transition-colors disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> Aprovar
                    </button>
                  )}
                  {f.status !== "hidden" && (
                    <button onClick={() => setStatus(f, "hidden")} disabled={busy}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-luxe uppercase border border-[#A68A72] text-[#A68A72] hover:bg-[#A68A72] hover:text-white transition-colors disabled:opacity-50">
                      <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} /> Ocultar
                    </button>
                  )}
                  <button onClick={() => remove(f.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] tracking-luxe uppercase border border-[#964545] text-[#964545] hover:bg-[#964545] hover:text-white transition-colors ml-auto">
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} /> Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="border border-[#8B5E3C] text-[#8B5E3C] px-6 py-3 text-xs uppercase tracking-luxe hover:bg-[#8B5E3C] hover:text-[#F9F6F0]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;