import React, { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { LANGUAGES } from "../i18n/translations";
import { CURRENCIES } from "../lib/currency";

// Seletor compacto de idioma + moeda. Discreto no header; popover ao clicar.
const LangCurrencySwitcher = ({ variant = "header" }) => {
  const { lang, setLang, currency, setCurrency } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const curSymbol = CURRENCIES[currency]?.symbol || "";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Language and currency"
        className="flex items-center gap-1.5 px-2 py-2 text-[#3B2618] hover:text-[#8B5E3C] transition-colors"
      >
        <Globe className="w-[18px] h-[18px]" strokeWidth={1.5} />
        <span className="text-[11px] tracking-[0.12em] uppercase font-medium leading-none">
          {lang.toUpperCase()} · {curSymbol}
        </span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          className={`absolute z-[80] mt-2 w-52 bg-[#F9F6F0] border border-[#E0D3C3] shadow-xl py-2 ${
            variant === "header" ? "right-0" : "left-0"
          }`}
        >
          <p className="px-4 pt-2 pb-1.5 text-[10px] tracking-[0.25em] uppercase text-[#A68A72]">Language</p>
          {Object.entries(LANGUAGES).map(([code, label]) => (
            <button
              key={code}
              onClick={() => { setLang(code); }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-[#3B2618] hover:bg-[#EDE4D8] transition-colors"
            >
              <span>{label} <span className="text-[#A68A72]">({code.toUpperCase()})</span></span>
              {lang === code && <Check className="w-4 h-4 text-[#8B5E3C]" strokeWidth={2} />}
            </button>
          ))}

          <div className="my-1.5 border-t border-[#E0D3C3]" />

          <p className="px-4 pt-1.5 pb-1.5 text-[10px] tracking-[0.25em] uppercase text-[#A68A72]">Currency</p>
          {Object.values(CURRENCIES).map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-[#3B2618] hover:bg-[#EDE4D8] transition-colors"
            >
              <span>{c.label}</span>
              {currency === c.code && <Check className="w-4 h-4 text-[#8B5E3C]" strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LangCurrencySwitcher;
