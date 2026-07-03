# Manual do Site — Escential Fragancia

Guia técnico para programares no site sozinho. Foco em **API e backend**, mas cobre o frontend e o deploy.

> Atualizado a 2026-06-03. Quando mudares algo estrutural, atualiza este ficheiro.

---

## 1. Visão geral da arquitetura

```
                  ┌──────────────────────────┐
   Browser  ───►  │  FRONTEND (React)        │   Netlify
                  │  app/frontend  → dist/   │
                  └────────────┬─────────────┘
                               │ fetch (REACT_APP_BACKEND_URL)
                               ▼
                  ┌──────────────────────────┐
                  │  BACKEND (Flask)         │   Vercel (serverless)
                  │  api/index.py            │
                  └────────────┬─────────────┘
                               │ firebase-admin
                               ▼
                  ┌──────────────────────────┐
                  │  Firebase Realtime DB    │   (dados: produtos + settings)
                  └──────────────────────────┘
```

Pontos-chave:
- **Há DOIS backends** com a mesma API, mas para usos diferentes (ver secção 5).
  - `api/index.py` → **produção** (Vercel + Firebase).
  - `app/backend/backend.py` → **dev local** (ficheiro `data.json`, sem Firebase).
- O frontend é **estático** depois do build. Não tem servidor próprio em produção — é só HTML/JS servido pela Netlify.
- A loja **não tem carrinho nem pagamento**. O "checkout" é um link de WhatsApp (ver secção 6.5).

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, react-router-dom, webpack (não é Create React App), Tailwind (via CDN `tailwind.js`), `sonner` (toasts), `lucide-react` (ícones) |
| Backend prod | Python + Flask + flask-cors + firebase-admin |
| Backend dev | Python `http.server` puro (sem dependências) |
| Base de dados | Firebase Realtime Database |
| Deploy frontend | Netlify |
| Deploy backend | Vercel (`@vercel/python`) |

---

## 3. Estrutura de pastas

```
essential/
├── api/
│   └── index.py            ← BACKEND DE PRODUÇÃO (Flask + Firebase)
├── app/
│   ├── backend/
│   │   ├── backend.py      ← backend de DEV local (data.json)
│   │   ├── data.json       ← "base de dados" local
│   │   ├── init_data.py    ← popula data.json com dados de exemplo
│   │   ├── index.html      ← shell HTML do site (onde o bundle.js é injetado)
│   │   └── static/         ← css, fonts, img, tailwind.js (copiados para o build)
│   └── frontend/
│       ├── src/
│       │   ├── App.js              ← rotas
│       │   ├── index.js            ← entry point
│       │   ├── contexts/AppContext.js   ← estado global (token, settings, login)
│       │   ├── lib/api.js          ← URL base da API
│       │   ├── lib/whatsapp.js     ← helpers do WhatsApp
│       │   ├── i18n/translations.js ← textos PT/EN
│       │   ├── components/         ← Header, Footer, ProductCard, ProtectedRoute...
│       │   └── pages/              ← Home, Shop, ProductDetail, AdminLogin, AdminDashboard...
│       ├── webpack.config.js
│       └── package.json
├── vercel.json             ← config deploy backend
├── netlify.toml            ← config deploy frontend
├── requirements.txt        ← deps Python (prod)
└── MANUAL.md               ← este ficheiro
```

O build (`dist/`) é gerado pelo webpack e **não** é commitado.

---

## 4. Como correr localmente

### 4.1 Backend local (dev)
Usa o `backend.py`, que guarda tudo em `app/backend/data.json` (não toca no Firebase).

```powershell
cd app/backend
python backend.py
```
Corre em `http://localhost:5000`. Sem dependências externas.

Para repor dados de exemplo:
```powershell
python init_data.py
```

### 4.2 Frontend
```powershell
cd app/frontend
npm install        # só na primeira vez
npm run dev        # webpack-dev-server na porta 8002
```
Abre `http://localhost:8002`.

Como o `.env` foi removido, o frontend usa por defeito `http://localhost:5000` (ver `src/lib/api.js`) — logo fala com o backend local automaticamente. Não precisas configurar nada.

> Se quiseres apontar o frontend local para o backend de produção, cria `app/frontend/.env` com:
> `REACT_APP_BACKEND_URL=https://<o-teu-dominio-vercel>`

---

## 5. Backend / API (a parte importante)

### 5.1 Os dois backends

| | `api/index.py` (prod) | `app/backend/backend.py` (dev) |
|---|---|---|
| Framework | Flask | `http.server` puro |
| Dados | Firebase RTDB | `data.json` (ficheiro) |
| Auth token | HMAC assinado, **expira 24h** | UUID em memória (some ao reiniciar) |
| Onde corre | Vercel | A tua máquina |

**Regra de ouro:** quando alteras um endpoint, altera-o **nos dois** ficheiros para não divergirem. A API (rotas + formato JSON) é idêntica de propósito.

### 5.2 Modelo de dados

Tudo vive numa única árvore (raiz `/` no Firebase, ou objeto raiz no `data.json`):

```json
{
  "settings": {
    "whatsapp_number": "447767993428"
  },
  "products": [
    {
      "id": "uuid-gerado-automaticamente",
      "name_en": "Nome do produto",
      "description_en": "Descrição",
      "scent_notes_en": "Notas de aroma",
      "price_gbp": 45,
      "images": ["data:image/...base64..."],
      "featured": true,
      "active": true,
      "order": 0
    }
  ]
}
```

Notas:
- `id` é um UUID gerado no servidor ao criar o produto. **Não inventes ids no frontend.**
- Se um produto chegar sem `id`, o `load_data` atribui um automaticamente e grava (proteção contra dados antigos).
- `images` são strings **base64** (data URLs). Funciona, mas incha a DB — ver secção 10 (melhorias).
- `order` controla a ordem na vitrine (drag-and-drop no admin).
- `active: false` esconde o produto da loja pública, mas mantém-no no admin.
- `featured: true` destaca o produto na Home.

### 5.3 Autenticação

Fluxo:
1. `POST /api/auth/login` com `{email, password}`. Se baterem com `ADMIN_EMAIL`/`ADMIN_PASSWORD`, devolve `{access_token}`.
2. O frontend guarda o token em `localStorage` (`ef_token`).
3. Cada chamada de admin envia `Authorization: Bearer <token>`.
4. O decorator `@auth_required` valida o token.
5. No arranque da app, o `AppContext` chama `GET /api/auth/verify` — se o token expirou/é inválido, faz logout automático.

**O token (produção):**
- Formato: `base64( email:expiração:assinatura_HMAC )`.
- Validade: **24 horas** (constante `TOKEN_TTL` em `api/index.py`).
- Assinado com `SECRET_KEY` (env var). **Mudar o `SECRET_KEY` invalida todos os tokens existentes na hora.**

A senha e o email do admin estão em `api/index.py` (linhas ~14-15). Para mudar, ver secção 9.

### 5.4 Referência completa dos endpoints

Base URL: `<backend>/api`

#### Públicos (sem auth)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/settings` | Devolve as settings (ex: número de WhatsApp) |
| GET | `/api/products` | Lista só os produtos **ativos** (para a loja) |
| POST | `/api/auth/login` | Body `{email, password}` → `{access_token}`, 401 (credenciais), ou 429 (rate limit) |
| GET | `/api/auth/verify` | Header Bearer → `{valid:true}` ou 401 |

#### Admin (requerem `Authorization: Bearer <token>`)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/admin/products` | Lista **todos** os produtos (ativos e inativos) |
| POST | `/api/admin/products` | Cria produto. Body = campos do produto (sem `id`) |
| PUT | `/api/admin/products/<id>` | Atualiza produto |
| DELETE | `/api/admin/products/<id>` | Apaga produto |
| PUT | `/api/admin/products-reorder` | Body `{ordered_ids: [...]}` → reordena |
| PUT | `/api/admin/settings` | Atualiza settings. Body = campos a alterar |

Respostas de erro comuns:
- `401 {"error":"Unauthorized"}` — token em falta/inválido/expirado.
- `404 {"error":"Not found"}` — id de produto inexistente.

### 5.5 Como adicionar um novo endpoint (passo a passo)

Exemplo: criar `GET /api/products/<id>` para devolver um produto pelo id.

**1. Em `api/index.py`** (produção), junto dos outros endpoints:
```python
@app.route("/api/products/<product_id>", methods=["GET"])
def get_product(product_id):
    data = load_data()
    for p in data["products"]:
        if p["id"] == product_id and p.get("active", True):
            return jsonify(p)
    return jsonify({"error": "Not found"}), 404
```
- Se for endpoint de admin, adiciona `@auth_required` por baixo do `@app.route`.

**2. Em `app/backend/backend.py`** (dev) — este backend não usa Flask, é roteamento manual dentro de `do_GET`/`do_POST`/`do_PUT`/`do_DELETE`. Adiciona um `elif` no método certo:
```python
# dentro de do_GET, na cadeia de elif:
elif path.startswith("/api/products/"):
    product_id = path.split("/")[-1]
    data = load_data()
    for p in data["products"]:
        if p["id"] == product_id and p.get("active", True):
            return self.send_json(200, p)
    return self.send_json(404, {"error": "Not found"})
```

**3. Frontend** — chama via `fetch`:
```javascript
import { API } from "../lib/api";
const res = await fetch(`${API}/products/${id}`);
const product = await res.json();
```

**Regras ao mexer no backend:**
- Lê sempre com `load_data()`, grava sempre com `save_data(data)`.
- `save_data` reescreve a árvore **inteira**. Não corras dois `load_data`/`save_data` em paralelo sobre os mesmos dados (risco de perder alterações).
- Mantém o formato JSON igual nos dois backends.

---

## 6. Frontend

### 6.1 Rotas (em `src/App.js`)
| Caminho | Página | Protegida? |
|---|---|---|
| `/` | Home | não |
| `/shop` | Shop (loja) | não |
| `/product/:id` | ProductDetail | não |
| `/faq` | FAQ | não |
| `/privacy` | PrivacyPolicy | não |
| `/admin/login` | AdminLogin | não |
| `/admin` | AdminDashboard | **sim** (`ProtectedRoute`) |
| `*` | NotFound | não |

### 6.2 Adicionar uma página
1. Cria `src/pages/MinhaPagina.js` (componente React).
2. Importa e regista a rota em `src/App.js`:
```javascript
import MinhaPagina from "@/pages/MinhaPagina";
// dentro de <Routes>:
<Route path="/minha-pagina" element={<MinhaPagina />} />
```
O alias `@/` aponta para `src/` (configurado no webpack).

### 6.3 Estado global — `AppContext`
Disponível via hook `useApp()`:
```javascript
import { useApp } from "../contexts/AppContext";

const { token, login, logout, settings, t, formatPrice, whatsappNumber } = useApp();
```
- `token` — token de admin (ou null).
- `login(email, password)` / `logout()`.
- `settings` — settings carregadas da API.
- `t("admin.save")` — tradução (ver i18n).
- `formatPrice(eur, gbp)` — devolve `£XX.XX`.
- `whatsappNumber` — número atual para os links de WhatsApp.

### 6.4 Chamar a API
Sempre via a constante `API`:
```javascript
import { API } from "../lib/api";

// pública:
const res = await fetch(`${API}/products`);

// admin (precisa do token):
const res = await fetch(`${API}/admin/products`, {
  headers: { Authorization: `Bearer ${token}` }
});

// com body:
const res = await fetch(`${API}/admin/products`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(payload)
});
```
Se receberes `401`, o token expirou → manda o utilizador para `/admin/login`.

### 6.5 WhatsApp (o "checkout")
Em `src/lib/whatsapp.js`:
```javascript
import { openWhatsApp, productMessage } from "../lib/whatsapp";
openWhatsApp(whatsappNumber, productMessage(product));
```
Gera um link `https://wa.me/<numero>?text=<mensagem>`. O número vem das settings (editável no admin).

### 6.6 Traduções (i18n)
Textos em `src/i18n/translations.js`, com blocos `pt` e `en`. Usa `t("seccao.chave")`.
> Nota: atualmente o `t` está fixo em inglês (`tt("en", path)` no AppContext). Os textos PT existem mas não estão a ser usados por defeito.

---

## 7. Deploy

### 7.1 Frontend (Netlify)
Configurado em `netlify.toml`:
- Build: `cd app/frontend && npm install && webpack --mode production`
- Publica: `dist/`
- O `_redirects` (`/* /index.html 200`) faz o React Router funcionar em qualquer URL.

**Variável de ambiente a definir na Netlify:**
- `REACT_APP_BACKEND_URL` = URL do backend no Vercel (ex: `https://essential-xxx.vercel.app`).

Deploy: ligado ao GitHub → cada `git push` para `main` dispara build automático.

### 7.2 Backend (Vercel)
Configurado em `vercel.json`:
- Builda `api/index.py` com `@vercel/python`.
- Todas as rotas (`/(.*)`) vão para `api/index.py`.

**Variáveis de ambiente a definir no Vercel:**
| Variável | O que é |
|---|---|
| `FIREBASE_CREDENTIALS` | JSON completo da service account do Firebase (uma linha) |
| `SECRET_KEY` | chave secreta para assinar tokens (string aleatória longa) |

Deploy: também via `git push` para `main` (se ligado ao GitHub).

---

## 8. Variáveis de ambiente (resumo)

| Onde | Variável | Obrigatória | Notas |
|---|---|---|---|
| Vercel (backend) | `FIREBASE_CREDENTIALS` | Sim | sem ela o backend não arranca |
| Vercel (backend) | `SECRET_KEY` | Recomendada | tem fallback inseguro no código; define uma própria |
| Netlify (frontend) | `REACT_APP_BACKEND_URL` | Sim | senão o frontend tenta `localhost:5000` |

Dev local não precisa de nenhuma destas (usa `data.json` e fallback de localhost).

---

## 9. Tarefas comuns (receitas)

### Mudar a senha / email do admin
Em `api/index.py`, linhas ~14-15:
```python
ADMIN_EMAIL = "escentialfragrance05@gmail.com"
ADMIN_PASSWORD = "nova-senha-forte-aqui"
```
Commita e faz push (Vercel re-deploya). Para dev local, muda também em `app/backend/backend.py`.
> Melhor ainda: ler de env var. Mas para repo privado e uso solo, editar aqui é aceitável.

### Mudar a validade do token
`api/index.py`: `TOKEN_TTL = 24 * 3600` (em segundos). Ex: 7 dias = `7 * 24 * 3600`.

### Adicionar um campo novo ao produto
1. No frontend, no `ProductEditor` (dentro de `AdminDashboard.js`): adiciona o input e mete o campo em `emptyProduct` (topo do ficheiro).
2. Inclui o campo no `payload` do `onSubmit`.
3. No backend (`admin_create_product` em `api/index.py` **e** `backend.py`): adiciona o campo ao dicionário do produto novo.
4. Mostra o campo onde precisares (ProductCard, ProductDetail).

### Mudar o número de WhatsApp
Painel admin → Settings. (Ou direto no Firebase, em `settings/whatsapp_number`.)

### Ver/editar dados em produção
Firebase Console → Realtime Database → projeto `escential`. Edita o JSON diretamente (cuidado: respeita o formato da secção 5.2).

---

## 10. Melhorias conhecidas (dívida técnica)

Por ordem de impacto, caso queiras evoluir:
1. **Imagens em base64** na DB → migrar para Firebase Storage / CDN e guardar só a URL. Maior ganho de velocidade/custo.
2. **`save_data` reescreve a árvore inteira** → usar referências específicas (`reference(f"products/{id}")`) para evitar perda de dados em edições simultâneas.
3. **i18n PT desligado** → ativar deteção de idioma se quiseres servir português.

> Rate limiting no login: **feito**. 5 tentativas falhadas por IP em 15 min → `429`. Em produção o contador vive no Firebase (`/rate_limit`), em dev fica em memória. Constantes `LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW` em `api/index.py`.

---

## 11. Troubleshooting

| Sintoma | Causa provável | Onde olhar |
|---|---|---|
| Botão admin "não faz nada" | produto sem `id` (dados antigos) | `load_data` já corrige ao carregar; recarrega a página |
| `401` em tudo no admin | token expirado (24h) ou `SECRET_KEY` mudou | volta a fazer login |
| Frontend não carrega produtos | `REACT_APP_BACKEND_URL` errado/ausente | env var na Netlify; consola do browser (Network) |
| Backend prod falha a arrancar | `FIREBASE_CREDENTIALS` em falta/inválido | logs do Vercel |
| Mudei a API e prod difere do local | só editaste um dos backends | sincroniza `api/index.py` e `backend.py` |
| Imagem não aparece | base64 inválido / campo `images` vazio | editor de produto no admin |

Para debugar: abre o **DevTools → Network**, vê o pedido que falha (status + resposta). 401 = auth, 404 = id errado, 500 = erro no backend (vê logs do Vercel).
