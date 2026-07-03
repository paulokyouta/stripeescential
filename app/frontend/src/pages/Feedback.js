import React, { useState, useEffect, useRef } from "react";
import { Camera, ExternalLink, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { API } from "../lib/api";
import { getFeedback } from "../lib/dataCache";
import { useApp } from "../contexts/AppContext";

// Identidade do header
const CREAM = "#F9F6F0";
const DARK = "#3B2618";
const BROWN = "#8B5E3C";
const BROWN_DARK = "#5C3A21";

// Comprime a foto no browser para um avatar pequeno (data URL) — não precisa de upload autenticado.
function compressAvatar(file, maxSize = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => (img.src = reader.result);
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const r = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Avatar com fallback: se a imagem falhar ou não existir, mostra a inicial do nome.
const Avatar = ({ src, name, size = 48 }) => {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const style = { width: size, height: size };
  if (!src || broken) {
    return (
      <div
        className="rounded-full bg-[#EDE4D8] text-[#8B5E3C] flex items-center justify-center font-serif-display shrink-0"
        style={{ ...style, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      onError={() => setBroken(true)}
      className="rounded-full object-cover bg-[#EDE4D8] shrink-0"
      style={style}
    />
  );
};

const formatDate = (ts, locale = "en-GB") => {
  if (!ts) return "";
  try {
    return new Date(ts * 1000).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

// Input só com linha inferior, na identidade do header (texto escuro, peso forte)
const lineInput =
  "w-full bg-transparent border-0 border-b border-[#3B2618]/20 focus:border-[#8B5E3C] py-3 text-[15px] font-semibold text-[#3B2618] placeholder:text-[#3B2618]/45 placeholder:font-medium outline-none transition-colors";

const FeedbackModal = ({ onClose, onSubmitted }) => {
  const { t } = useApp();
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [social, setSocial] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [picBusy, setPicBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [closing, setClosing] = useState(false);
  const fileRef = useRef(null);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 280);
  };

  // Bloquear scroll do body e fechar com Escape enquanto o modal está aberto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPicBusy(true);
    try {
      setImage(await compressAvatar(file));
    } catch {
      toast.error(t("feedback.err_image"));
    } finally {
      setPicBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) {
      toast.error(t("feedback.err_required"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), image, social: social.trim(), text: text.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `${t("feedback.err_send")} (${res.status})`);
      }
      setSent(true);
      setName(""); setImage(""); setSocial(""); setText("");
      onSubmitted && onSubmitted();
      setTimeout(handleClose, 1800);
    } catch (err) {
      toast.error(err.message || t("feedback.err_send"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <style>{`
        @keyframes fbFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fbFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes fbPop { from { opacity: 0; transform: translateY(14px) scale(0.97) } to { opacity: 1; transform: none } }
        @keyframes fbPopOut { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(14px) scale(0.97) } }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(59,38,24,0.4)", animation: `${closing ? "fbFadeOut" : "fbFade"} 0.28s ease forwards` }}
      />

      {/* Painel — mesma cor de fundo do header */}
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto px-7 py-12 sm:px-14 sm:py-14 shadow-[0_30px_80px_-28px_rgba(59,38,24,0.45)]"
        style={{ backgroundColor: CREAM, borderRadius: "2rem", border: "1px solid #E0D3C3", animation: `${closing ? "fbPopOut" : "fbPop"} 0.28s cubic-bezier(0.22,1,0.36,1) forwards` }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label={t("feedback.close")}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 p-2 text-[#3B2618]/50 hover:text-[#3B2618] transition-colors"
        >
          <X className="w-5 h-5" strokeWidth={1.75} />
        </button>

        <h2 className="font-serif-display font-bold text-3xl sm:text-4xl text-[#3B2618] mb-10 sm:mb-12">{t("feedback.modal_title")}</h2>

        {sent ? (
          <div className="py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#EDE4D8] text-[#8B5E3C] flex items-center justify-center mb-5">
              <Check className="w-7 h-7" strokeWidth={2} />
            </div>
            <h3 className="font-serif-display font-bold text-2xl text-[#3B2618] mb-2">{t("feedback.thanks_title")}</h3>
            <p className="text-sm font-medium text-[#3B2618]/70 leading-relaxed max-w-sm">
              {t("feedback.thanks_text")}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="grid md:grid-cols-[1fr_auto] gap-10 md:gap-16 items-start">
            {/* Campos */}
            <div className="space-y-7 order-2 md:order-1">
              <input className={lineInput} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("feedback.name")} maxLength={80} />
              <input className={lineInput} value={social} onChange={(e) => setSocial(e.target.value)} placeholder={t("feedback.social")} maxLength={300} />
              <textarea
                className={`${lineInput} resize-none leading-relaxed`}
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("feedback.text")}
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={busy}
                style={{ backgroundColor: BROWN, color: CREAM, borderRadius: "9999px" }}
                className="mt-2 px-12 py-3.5 text-xs uppercase tracking-[0.22em] font-bold hover:!bg-[#5C3A21] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5E3C]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9F6F0] disabled:opacity-60 transition-colors"
              >
                {busy ? t("feedback.sending") : t("feedback.send")}
              </button>
            </div>

            {/* Foto */}
            <div className="flex flex-col items-center gap-4 order-1 md:order-2 md:pt-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={picBusy}
                aria-label={t("feedback.select_photo")}
                style={{ backgroundColor: "rgba(139,94,60,0.07)", borderRadius: "9999px", border: "1px solid #E0D3C3" }}
                className="group w-40 h-40 sm:w-44 sm:h-44 overflow-hidden flex items-center justify-center hover:!bg-[#EDE4D8] transition-colors disabled:opacity-60"
              >
                {image ? (
                  <img src={image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-11 h-11 text-[#8B5E3C]/70 group-hover:text-[#8B5E3C] transition-colors" strokeWidth={1.5} />
                )}
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm font-bold text-[#8B5E3C] hover:text-[#5C3A21] underline underline-offset-4 transition-colors"
              >
                {picBusy ? t("feedback.processing") : image ? t("feedback.change_photo") : t("feedback.select_photo")}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const ReviewCard = ({ item, locale, index = 0 }) => (
  <div
    className="w-full bg-white border border-[#E0D3C3] rounded-3xl p-6 lg:p-10 flex flex-col h-full shadow-[0_8px_30px_-14px_rgba(59,38,24,0.20)] hover:shadow-[0_14px_44px_-14px_rgba(59,38,24,0.28)] transition-shadow"
    style={{ opacity: 0, animation: "revCard 0.6s cubic-bezier(0.22,1,0.36,1) forwards", animationDelay: `${index * 90}ms` }}
  >
    <p className="text-base lg:text-lg text-[#3B2618]/80 leading-[1.7] lg:leading-[1.75] flex-1 whitespace-pre-line">{item.text}</p>
    <div className="flex items-center gap-4 mt-6 pt-6 lg:mt-8 lg:pt-8 border-t border-[#E0D3C3]/60">
      <Avatar src={item.image} name={item.name} size={72} />
      <div className="min-w-0 flex-1">
        <div className="text-base lg:text-lg font-semibold text-[#3B2618] truncate">{item.name}</div>
        {item.created_at && <div className="text-[11px] text-[#A68A72] mt-0.5">{formatDate(item.created_at, locale)}</div>}
      </div>
      {item.social && (
        <a
          href={item.social}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.name} social link`}
          className="p-2 rounded-full text-[#A68A72] hover:text-[#8B5E3C] hover:bg-[#EDE4D8]/60 transition-colors shrink-0"
        >
          <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
        </a>
      )}
    </div>
  </div>
);

const Feedback = () => {
  const { t, lang } = useApp();
  const locale = lang === "pt" ? "pt-PT" : "en-GB";
  const [reviews, setReviews] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const data = await getFeedback();
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      setReviews([]);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    load();
  }, []);

  return (
    <main className="px-6 md:px-12 lg:px-20 py-20 lg:py-28 mx-auto" style={{ maxWidth: "1700px" }}>
      <style>{`@keyframes revCard { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: none } }`}</style>
      <div className="text-center mb-10">
        <p className="text-[10px] tracking-[0.32em] uppercase text-[#8B5E3C] mb-4 font-bold">{t("feedback.eyebrow")}</p>
        <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3B2618]">{t("feedback.title")}</h1>
        <div className="w-12 h-px bg-[#8B5E3C]/40 mx-auto mt-7" />
      </div>

      <div className="flex justify-center mb-16 lg:mb-20">
        <button
          onClick={() => setOpen(true)}
          style={{ backgroundColor: BROWN, color: CREAM, borderRadius: "9999px" }}
          className="inline-flex items-center gap-2.5 pl-7 pr-8 py-4 text-xs uppercase tracking-[0.22em] font-bold hover:!bg-[#5C3A21] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5E3C]/40 focus-visible:ring-offset-2 transition-all duration-300 shadow-[0_14px_34px_-14px_rgba(59,38,24,0.55)] hover:shadow-[0_20px_44px_-16px_rgba(59,38,24,0.6)]"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> {t("feedback.open")}
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white/60 border border-dashed border-[#E0D3C3] rounded-3xl py-16 px-8 text-center">
          <p className="text-sm text-[#A68A72] italic">
            {t("feedback.empty")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 max-w-lg lg:max-w-2xl mx-auto min-[1215px]:max-w-none min-[1215px]:mx-0 min-[1215px]:grid-cols-3">
          {reviews.map((r, i) => <ReviewCard key={r.id} item={r} locale={locale} index={i} />)}
        </div>
      )}

      {open && <FeedbackModal onClose={() => setOpen(false)} onSubmitted={load} />}
    </main>
  );
};

export default Feedback;
