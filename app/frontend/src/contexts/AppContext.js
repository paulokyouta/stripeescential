import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { tt, LANGUAGES, DEFAULT_LANG } from "../i18n/translations";
import { formatMoney, isCurrency, DEFAULT_CURRENCY, fetchRates } from "../lib/currency";
import { API } from "../lib/api";

const AppCtx = createContext(null);

const LANG_KEY = "ef_lang";
const CURRENCY_KEY = "ef_currency";

// Deteção na primeira visita (navegador) — nunca força depois da escolha.
const detectInitial = () => {
  const storedLang = localStorage.getItem(LANG_KEY);
  const storedCur = localStorage.getItem(CURRENCY_KEY);
  if (storedLang && storedCur) {
    return { lang: storedLang, currency: storedCur };
  }
  let lang = DEFAULT_LANG;
  let currency = DEFAULT_CURRENCY;
  try {
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (nav.startsWith("pt")) { lang = "pt"; currency = "EUR"; }
    else if (nav.startsWith("en-gb") || nav === "en") { lang = "en"; currency = "GBP"; }
    else if (nav.startsWith("en")) { lang = "en"; currency = "GBP"; }
    else {
      // resto da Europa -> EUR, inglês
      const euZone = ["es", "fr", "de", "it", "nl", "ie", "be", "at", "pt"];
      if (euZone.some((c) => nav.startsWith(c))) currency = "EUR";
    }
  } catch {}
  return {
    lang: storedLang || lang,
    currency: storedCur || currency,
  };
};

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("ef_token"));
  const [settings, setSettings] = useState(null);

  const initial = detectInitial();
  const [lang, setLangState] = useState(() =>
    LANGUAGES[initial.lang] ? initial.lang : DEFAULT_LANG
  );
  const [currency, setCurrencyState] = useState(() =>
    isCurrency(initial.currency) ? initial.currency : DEFAULT_CURRENCY
  );

  const setLang = useCallback((l) => {
    if (!LANGUAGES[l]) return;
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }, []);
  const setCurrency = useCallback((c) => {
    if (!isCurrency(c)) return;
    setCurrencyState(c);
    localStorage.setItem(CURRENCY_KEY, c);
  }, []);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem("ef_token");
      if (stored) {
        try {
          const res = await fetch(`${API}/auth/verify`, {
            headers: { Authorization: `Bearer ${stored}` },
          });
          if (!res.ok) {
            localStorage.removeItem("ef_token");
            setToken(null);
          }
        } catch {
          localStorage.removeItem("ef_token");
          setToken(null);
        }
      }

      try {
        const response = await fetch(`${API}/settings`);
        if (!response.ok) throw new Error();
        const data = await response.json();
        setSettings(data || {});
      } catch {
        setSettings({});
      }
    };

    init();
    fetchRates();
    // Sem prefetch: cada página carrega os seus dados só quando é aberta
    // (products no Home/Shop/pesquisa, feedback só na página de avaliações).
  }, []);

  const t = useCallback((path) => tt(lang, path), [lang]);

  // Preços guardados em GBP; converte/formata para a moeda escolhida.
  // Mantém a assinatura existente (priceEur ignorado).
  const formatPrice = useCallback((priceEur, priceGbp) => {
    return formatMoney(priceGbp, currency);
  }, [currency]);

  const login = useCallback(async (email, password) => {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let msg = "Invalid credentials";
      try {
        const data = await response.json();
        if (data?.error) msg = data.error;
      } catch {}
      throw new Error(msg);
    }

    const data = await response.json();
    localStorage.setItem("ef_token", data.access_token);
    setToken(data.access_token);
    return data;
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("ef_token");
    setToken(null);
  }, []);

  const whatsappNumber = settings?.whatsapp_number || "447767993428";

  return (
    <AppCtx.Provider
      value={{
        t, formatPrice,
        lang, setLang, currency, setCurrency,
        token, login, logout, settings, setSettings, whatsappNumber,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
};
