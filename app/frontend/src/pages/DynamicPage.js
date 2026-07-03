import React from "react";
import { Render } from "@measured/puck";
import { useLocation } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { puckConfig } from "../lib/puck.config";
import { pagesDefaultFor } from "../lib/pages.default";
import NotFound from "./NotFound";

const DynamicPage = () => {
  const { settings, lang } = useApp();
  const loc = useLocation();
  const slug = loc.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

  // settings ainda a carregar
  if (settings === null || settings === undefined) return null;

  // Alias de URL: /scent mostra a página "fragrances" (mantém o conteúdo do Puck).
  const SLUG_ALIAS = { scent: "fragrances" };
  const realSlug = SLUG_ALIAS[slug] || slug;

  const localizedDefaults = pagesDefaultFor(lang);
  const saved = (settings.pages || []).find((p) => p.slug === realSlug);
  // BD (conteúdo publicado pelo admin) tem prioridade; senão default localizado.
  const data =
    saved && Array.isArray(saved.data?.content) && saved.data.content.length > 0
      ? saved.data
      : localizedDefaults[realSlug];

  if (data && Array.isArray(data.content) && data.content.length > 0) {
    return <Render key={lang} config={puckConfig} data={data} />;
  }
  return <NotFound />;
};

export default DynamicPage;
