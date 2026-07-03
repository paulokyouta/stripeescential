import React, { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { useApp } from "../contexts/AppContext";

const FAQItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E0D3C3]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-5 text-left gap-6"
      >
        <span className="text-[#3B2618] text-sm sm:text-base font-medium">{q}</span>
        {open
          ? <Minus className="w-4 h-4 text-[#8B5E3C] shrink-0" strokeWidth={1.5} />
          : <Plus className="w-4 h-4 text-[#8B5E3C] shrink-0" strokeWidth={1.5} />
        }
      </button>
      {open && (
        <p className="pb-5 text-sm text-[#3B2618]/70 leading-relaxed">{a}</p>
      )}
    </div>
  );
};

const FAQ = () => {
  const { t } = useApp();
  const faq = t("faq");
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="px-6 md:px-12 lg:px-20 py-20 lg:py-28 max-w-3xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] mb-4">{faq.eyebrow}</p>
        <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3B2618]">{faq.title}</h1>
        <div className="w-10 h-px bg-[#8B5E3C]/40 mx-auto mt-6" />
      </div>
      <div>
        {faq.list.map((item, i) => (
          <FAQItem key={i} q={item.q} a={item.a} />
        ))}
      </div>
    </main>
  );
};

export default FAQ;
