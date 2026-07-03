// Caminho relativo (mesma origem) -> sem CORS. Não usar URL absoluto: causaria cross-origin.
// Dev: o Flask (backend.py) serve o dist e a API na mesma porta (ou o dev-server faz proxy de /api).
// Prod: o Netlify faz proxy de /api/* para o backend Vercel (ver app/frontend/_redirects).
export const API = "/api";
