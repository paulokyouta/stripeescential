// Cache simples em memória para dados públicos (products/feedback).
// Carrega uma vez quando a pessoa entra no site; navegações seguintes usam o cache (instantâneo).
// Recarrega só num refresh da página (F5) ou quando se pede force.
import { API } from "./api";

const cache = {};      // key -> dados já resolvidos
const inflight = {};   // key -> promessa em curso (evita pedidos duplicados)

function cachedGet(key, path) {
  if (cache[key] !== undefined) return Promise.resolve(cache[key]);
  if (inflight[key]) return inflight[key];

  inflight[key] = fetch(`${API}${path}`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      cache[key] = Array.isArray(data) ? data : (data || []);
      return cache[key];
    })
    .finally(() => { delete inflight[key]; });

  return inflight[key];
}

export const getProducts = (force) => {
  if (force) delete cache.products;
  return cachedGet("products", "/products");
};

export const getFeedback = (force) => {
  if (force) delete cache.feedback;
  return cachedGet("feedback", "/feedback");
};

// Aquece o cache assim que o site abre (fire-and-forget).
export const prefetchSiteData = () => {
  getProducts().catch(() => {});
  getFeedback().catch(() => {});
};
