import React, { useEffect, useState } from "react";
import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { API } from "../lib/api";
import { puckConfig } from "../lib/puck.config";
import { homeDefault } from "../lib/home.default";
import { pagesDefault, pageTitles } from "../lib/pages.default";

const EMPTY = { content: [], root: {} };

const Editor = () => {
  const { token, setSettings } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const slug = params.get("page") || "home";
  const isHome = slug === "home";

  const [data, setData] = useState(null);
  const [title, setTitle] = useState("Home");

  useEffect(() => {
    const load = async () => {
      try {
        // Endpoint autenticado: traz o settings completo (inclui page_home).
        const res = await fetch(`${API}/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const s = res.ok ? await res.json() : {};
        if (isHome) {
          const saved = s.page_home;
          setData(saved && Array.isArray(saved.content) && saved.content.length > 0 ? saved : homeDefault);
          setTitle("Home");
        } else {
          const page = (s.pages || []).find((p) => p.slug === slug);
          const fallback = pagesDefault[slug] || EMPTY;
          setData(
            page && Array.isArray(page.data?.content) && page.data.content.length > 0
              ? page.data
              : fallback
          );
          setTitle(page?.title || pageTitles[slug] || slug);
        }
      } catch {
        setData(isHome ? homeDefault : pagesDefault[slug] || EMPTY);
      }
    };
    load();
  }, [slug, isHome]);

  const publish = async (layout) => {
    try {
      let payload;
      if (isHome) {
        payload = { page_home: layout };
      } else {
        // ler estado atual das paginas (endpoint autenticado) e atualizar so esta
        const res = await fetch(`${API}/admin/settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const s = res.ok ? await res.json() : {};
        const pages = Array.isArray(s.pages) ? s.pages : [];
        const idx = pages.findIndex((p) => p.slug === slug);
        if (idx >= 0) pages[idx] = { ...pages[idx], data: layout };
        else pages.push({ slug, title, data: layout });
        payload = { pages };
      }

      const res2 = await fetch(`${API}/admin/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!res2.ok) throw new Error();
      setSettings((prev) => ({ ...(prev || {}), ...payload }));
      toast.success("Pagina publicada!");
    } catch {
      toast.error("Erro ao publicar");
    }
  };

  if (!data) {
    return <div className="p-10 text-center" style={{ color: "#3B2618" }}>A carregar editor...</div>;
  }

  return (
    <div style={{ height: "100vh" }}>
      <Puck
        config={puckConfig}
        data={data}
        onPublish={publish}
        iframe={{ enabled: false }}
        metadata={{ editor: true }}
        headerTitle={`Editor: ${title}`}
        overrides={{
          headerActions: ({ children }) => (
            <>
              <button
                onClick={() => navigate("/admin")}
                style={{
                  background: "transparent",
                  border: "1px solid #8B5E3C",
                  color: "#8B5E3C",
                  padding: "8px 16px",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                }}
              >
                Voltar
              </button>
              {children}
            </>
          ),
        }}
      />
    </div>
  );
};

export default Editor;
