import React, { useEffect } from "react";
import { useApp } from "../contexts/AppContext";

const EMAIL = "escentialfragrance05@gmail.com";

// Transforma email e @escential.collection em links.
const linkify = (text) => {
  const nodes = [];
  const regex = /(escentialfragrance05@gmail\.com|@escential\.collection)/g;
  let last = 0, m, key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.includes("@gmail")) {
      nodes.push(
        <a key={key++} href={`mailto:${EMAIL}`} className="text-[#8B5E3C] hover:underline">{token}</a>
      );
    } else {
      nodes.push(
        <a key={key++} href="https://www.instagram.com/escential.collection/" target="_blank" rel="noopener noreferrer" className="text-[#8B5E3C] hover:underline">{token}</a>
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
};

const Section = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="font-serif-display text-xl sm:text-2xl text-[#3B2618] mb-4">{title}</h2>
    <div className="text-sm text-[#3B2618]/70 leading-relaxed space-y-3">{children}</div>
  </div>
);

const PrivacyPolicy = () => {
  const { t } = useApp();
  const p = t("privacy");
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <main className="px-6 md:px-12 lg:px-20 py-20 lg:py-28 max-w-3xl mx-auto">
      <div className="text-center mb-14">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[#8B5E3C] mb-4">{p.eyebrow}</p>
        <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3B2618]">{p.title}</h1>
        <div className="w-10 h-px bg-[#8B5E3C]/40 mx-auto mt-6" />
        <p className="text-xs text-[#A68A72] mt-4">{p.updated}</p>
      </div>

      {(p.sections || []).map((sec, si) => (
        <Section key={si} title={sec.title}>
          {sec.blocks.map((blk, bi) =>
            typeof blk === "string" ? (
              <p key={bi}>{linkify(blk)}</p>
            ) : (
              <ul key={bi} className="list-disc pl-5 space-y-1">
                {blk.list.map((it, li) => (
                  <li key={li}>
                    {typeof it === "string"
                      ? linkify(it)
                      : <><strong>{it.b}</strong> {linkify(it.t)}</>}
                  </li>
                ))}
              </ul>
            )
          )}
        </Section>
      ))}
    </main>
  );
};

export default PrivacyPolicy;
