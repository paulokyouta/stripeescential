#!/usr/bin/env python3
import json
import os
import re
import base64
import html as html_lib
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import urllib.request
import uuid
import time
from pathlib import Path

SITE_NAME = "Escential Fragrances"
DEFAULT_DESC = "Artisan scented candles and gift sets. Handcrafted fragrances for your home."
DEFAULT_IMG = "/static/img/hero.png"
META_RE = re.compile(r"<!-- META:START -->.*?<!-- META:END -->", re.DOTALL)

BASE_DIR = Path(__file__).parent  # app/backend/
DIST_DIR = BASE_DIR.parent.parent / "dist"
STATIC_DIR = DIST_DIR / "static"
INDEX_HTML = DIST_DIR / "index.html"
DATA_FILE = BASE_DIR / "data.json"

# Configurações
ADMIN_EMAIL = "escentialfragrance05@gmail.com"
ADMIN_PASSWORD = "enPW*23"
VALID_TOKENS = {}  # token -> email
LOGIN_ATTEMPTS = {}  # ip -> {"start": ts, "count": n}
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW = 15 * 60  # 15 min

import unicodedata

def slugify(text):
    """Gera slug amigável: minúsculas, sem acentos, espaços->hífen, & ->and."""
    text = (text or "").strip()
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text

def make_unique_slug(base, products, exclude_id=None):
    """Garante unicidade do slug entre os produtos (acrescenta -2, -3, ...)."""
    base = base or "produto"
    taken = {
        p.get("slug")
        for p in products
        if p.get("slug") and p.get("id") != exclude_id
    }
    if base not in taken:
        return base
    i = 2
    while f"{base}-{i}" in taken:
        i += 1
    return f"{base}-{i}"

def load_data():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    if "settings" not in data:
        data["settings"] = {"whatsapp_number": "447767993428"}
    if "products" not in data:
        data["products"] = []
    if "carousel" not in data:
        data["carousel"] = []
    if "feedback" not in data:
        data["feedback"] = []

    dirty = False
    for p in data["products"]:
        if not p.get("id"):
            p["id"] = str(uuid.uuid4())
            dirty = True
        # Backfill de slug para produtos antigos
        if not p.get("slug"):
            p["slug"] = make_unique_slug(slugify(p.get("name_en", "")), data["products"], p.get("id"))
            dirty = True
    if dirty:
        save_data(data)

    return data

def save_data(data):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

# ---- Conversão de moeda (proxy interno; evita CORS no browser) ----
FX_FALLBACK = {"EUR": 1.18}
FX_TTL = 3600  # 1h
_fx_cache = {"ts": 0, "rates": None}

def get_fx_rates():
    now = int(time.time())
    if _fx_cache["rates"] and now - _fx_cache["ts"] < FX_TTL:
        return {"base": "GBP", "rates": _fx_cache["rates"], "cached": True}
    try:
        url = "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            payload = json.loads(r.read().decode("utf-8"))
        rates = payload.get("rates") or {}
        if rates:
            _fx_cache["ts"] = now
            _fx_cache["rates"] = rates
            return {"base": "GBP", "rates": rates}
    except Exception:
        pass
    return {"base": "GBP", "rates": _fx_cache["rates"] or FX_FALLBACK, "fallback": True}

# ---- Feedback / Reviews ----
MAX_IMG_LEN = 700_000  # ~512KB em base64 (avatar pequeno)

def clean_feedback_input(body):
    name = (body.get("name") or "").strip()[:80]
    text = (body.get("text") or "").strip()[:1000]
    social = (body.get("social") or "").strip()[:300]
    image = (body.get("image") or "").strip()
    if social and not (social.startswith("http://") or social.startswith("https://")):
        social = "https://" + social
    if image:
        ok = image.startswith("http://") or image.startswith("https://") or image.startswith("data:image/")
        if not ok or len(image) > MAX_IMG_LEN:
            image = ""
    return name, text, social, image

def encode_token(email):
    token = str(uuid.uuid4())
    VALID_TOKENS[token] = email
    return token

def decode_token(token):
    return token in VALID_TOKENS

def login_allowed(ip):
    rec = LOGIN_ATTEMPTS.get(ip)
    if not rec or time.time() - rec["start"] > LOGIN_WINDOW:
        return True
    return rec["count"] < LOGIN_MAX_ATTEMPTS

def register_failed_login(ip):
    rec = LOGIN_ATTEMPTS.get(ip)
    now = time.time()
    if not rec or now - rec["start"] > LOGIN_WINDOW:
        LOGIN_ATTEMPTS[ip] = {"start": now, "count": 1}
    else:
        rec["count"] += 1

def get_token_from_header(headers):
    auth = headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None

def build_meta_block(path, base_url):
    """Gera o bloco de meta tags (SEO + Open Graph) consoante a rota."""
    title = SITE_NAME
    desc = DEFAULT_DESC
    image = DEFAULT_IMG

    if path.startswith("/product/"):
        product_key = path.rstrip("/").split("/")[-1]
        data = load_data()
        # Resolver por slug amigável ou por id interno (links antigos)
        product = next((p for p in data["products"]
                        if (p.get("slug") == product_key or str(p.get("id")) == product_key)
                        and p.get("active", True)), None)
        if product:
            title = f"{product.get('name_en', '')} · {SITE_NAME}"
            desc = product.get("description_en") or product.get("scent_notes_en") or DEFAULT_DESC
            imgs = product.get("images") or []
            if imgs and isinstance(imgs[0], str) and imgs[0].strip():
                image = imgs[0]

    # Imagem e URL absolutos (necessário para Open Graph)
    if image.startswith("/"):
        image = base_url + image
    url = base_url + path
    desc = " ".join(desc.split())[:300]
    e = html_lib.escape

    return (
        f'<title>{e(title)}</title>\n'
        f'    <meta name="description" content="{e(desc)}">\n'
        f'    <meta property="og:type" content="website">\n'
        f'    <meta property="og:site_name" content="{e(SITE_NAME)}">\n'
        f'    <meta property="og:title" content="{e(title)}">\n'
        f'    <meta property="og:description" content="{e(desc)}">\n'
        f'    <meta property="og:image" content="{e(image)}">\n'
        f'    <meta property="og:url" content="{e(url)}">\n'
        f'    <meta name="twitter:card" content="summary_large_image">\n'
        f'    <meta name="twitter:title" content="{e(title)}">\n'
        f'    <meta name="twitter:description" content="{e(desc)}">\n'
        f'    <meta name="twitter:image" content="{e(image)}">'
    )

class APIHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/auth/verify":
            token = get_token_from_header(self.headers)
            if token and decode_token(token):
                self.send_json(200, {"valid": True})
            else:
                self.send_json(401, {"valid": False})
        elif path == "/api/settings":
            data = load_data()
            self.send_json(200, data["settings"])
        elif path == "/api/products":
            data = load_data()
            active_products = [p for p in data["products"] if p.get("active", True)]
            self.send_json(200, active_products)
        elif path == "/api/currency":
            self.send_json(200, get_fx_rates())
        elif path == "/api/admin/products":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data = load_data()
            self.send_json(200, data["products"])
        elif path == "/api/carousel":
            data = load_data()
            active = [c for c in data["carousel"] if c.get("active", True)]
            active.sort(key=lambda x: x.get("order", 0))
            self.send_json(200, active)
        elif path == "/api/admin/carousel":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data = load_data()
            items = sorted(data["carousel"], key=lambda x: x.get("order", 0))
            self.send_json(200, items)
        elif path == "/api/feedback":
            data = load_data()
            items = [f for f in data.get("feedback", []) if f.get("status") == "approved"]
            items.sort(key=lambda x: x.get("created_at", 0), reverse=True)
            public = [{
                "id": f.get("id"),
                "name": f.get("name", ""),
                "image": f.get("image", ""),
                "text": f.get("text", ""),
                "social": f.get("social", ""),
                "created_at": f.get("created_at"),
            } for f in items]
            self.send_json(200, public)
        elif path == "/api/admin/feedback":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data = load_data()
            items = sorted(data.get("feedback", []), key=lambda x: x.get("created_at", 0), reverse=True)
            self.send_json(200, items)
        elif path.startswith("/static/"):
            file_path = STATIC_DIR / path[len("/static/"):]
            if file_path.exists():
                mime, _ = mimetypes.guess_type(str(file_path))
                self.send_response(200)
                self.send_header("Content-type", mime or "application/octet-stream")
                # Dev: nunca cachear JS/CSS para as mudanças aparecerem sem hard refresh
                self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                self.end_headers()
                self.wfile.write(file_path.read_bytes())
            else:
                self.send_json(404, {"error": "Not found"})
        else:
            self.serve_index(path)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            body_data = json.loads(body) if body else {}
        except:
            body_data = {}

        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/auth/login":
            ip = self.client_address[0]
            if not login_allowed(ip):
                self.send_json(429, {"error": "Demasiadas tentativas. Tenta novamente mais tarde."})
                return
            email = body_data.get("email", "")
            password = body_data.get("password", "")
            if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
                LOGIN_ATTEMPTS.pop(ip, None)
                token = encode_token(email)
                self.send_json(200, {"access_token": token})
            else:
                register_failed_login(ip)
                self.send_json(401, {"error": "Invalid credentials"})

        elif path == "/api/admin/products":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data = load_data()
            new_id = str(uuid.uuid4())
            slug_base = slugify(body_data.get("slug") or body_data.get("name_en", ""))
            new_product = {
                "id": new_id,
                "name_en": body_data.get("name_en", ""),
                "slug": make_unique_slug(slug_base, data["products"], new_id),
                "description_en": body_data.get("description_en", ""),
                "scent_notes_en": body_data.get("scent_notes_en", ""),
                "price_gbp": body_data.get("price_gbp", 0),
                "price_on_request": body_data.get("price_on_request", False),
                "sale_price_gbp": body_data.get("sale_price_gbp", None),
                "images": body_data.get("images", []),
                "featured": body_data.get("featured", False),
                "show_home": body_data.get("show_home", False),
                "active": body_data.get("active", True),
                "order": len(data["products"])
            }
            data["products"].append(new_product)
            save_data(data)
            self.send_json(201, new_product)

        elif path == "/api/admin/carousel":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data = load_data()
            new_item = {
                "id": str(uuid.uuid4()),
                "image": body_data.get("image", ""),
                "link": body_data.get("link", ""),
                "title": body_data.get("title", ""),
                "active": body_data.get("active", True),
                "mediaType": body_data.get("mediaType", "image"),
                "poster": body_data.get("poster", ""),
                "order": len(data["carousel"]),
            }
            data["carousel"].append(new_item)
            save_data(data)
            self.send_json(201, new_item)

        elif path == "/api/feedback":
            # Público — sem auth. Novo feedback entra como pendente.
            name, text, social, image = clean_feedback_input(body_data)
            if not name or not text:
                self.send_json(400, {"error": "Nome e feedback são obrigatórios"})
                return
            data = load_data()
            now = int(time.time())
            item = {
                "id": str(uuid.uuid4()),
                "name": name,
                "image": image,
                "text": text,
                "social": social,
                "status": "pending",
                "created_at": now,
                "updated_at": now,
            }
            data.setdefault("feedback", []).append(item)
            save_data(data)
            self.send_json(201, {"ok": True})

        elif path == "/api/admin/upload":
            token = get_token_from_header(self.headers)
            if not token or not decode_token(token):
                self.send_json(401, {"error": "Unauthorized"})
                return
            data_url = body_data.get("data", "")
            ext = (body_data.get("ext") or "jpg").lstrip(".")
            if not data_url or "," not in data_url:
                self.send_json(400, {"error": "No image"})
                return
            raw = base64.b64decode(data_url.split(",", 1)[1])
            up_dir = STATIC_DIR / "img" / "uploads"
            up_dir.mkdir(parents=True, exist_ok=True)
            name = f"{uuid.uuid4().hex}.{ext}"
            (up_dir / name).write_bytes(raw)
            self.send_json(200, {"url": f"/static/img/uploads/{name}"})

        else:
            self.send_json(404, {"error": "Not found"})

    def do_PUT(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            body_data = json.loads(body) if body else {}
        except:
            body_data = {}

        parsed = urlparse(self.path)
        path = parsed.path

        token = get_token_from_header(self.headers)
        if not token or not decode_token(token):
            self.send_json(401, {"error": "Unauthorized"})
            return

        if path.startswith("/api/admin/products/"):
            product_id = path.split("/")[-1]
            data = load_data()
            for i, p in enumerate(data["products"]):
                if p["id"] == product_id:
                    old_name = p.get("name_en", "")
                    data["products"][i].update(body_data)
                    prod = data["products"][i]
                    # Slug: override manual tem prioridade; senão regenerar se o nome mudou
                    if body_data.get("slug"):
                        prod["slug"] = make_unique_slug(slugify(body_data["slug"]), data["products"], product_id)
                    elif body_data.get("name_en", old_name) != old_name or not prod.get("slug"):
                        prod["slug"] = make_unique_slug(slugify(prod.get("name_en", "")), data["products"], product_id)
                    save_data(data)
                    self.send_json(200, prod)
                    return
            self.send_json(404, {"error": "Product not found"})

        elif path == "/api/admin/products-reorder":
            ordered_ids = body_data.get("ordered_ids", [])
            data = load_data()
            reordered = []
            for id_ in ordered_ids:
                for p in data["products"]:
                    if p["id"] == id_:
                        reordered.append(p)
                        break
            data["products"] = reordered
            for i, p in enumerate(data["products"]):
                p["order"] = i
            save_data(data)
            self.send_json(200, {"message": "Reordered"})

        elif path.startswith("/api/admin/carousel/"):
            item_id = path.split("/")[-1]
            data = load_data()
            for i, c in enumerate(data["carousel"]):
                if c["id"] == item_id:
                    data["carousel"][i].update(body_data)
                    save_data(data)
                    self.send_json(200, data["carousel"][i])
                    return
            self.send_json(404, {"error": "Not found"})

        elif path == "/api/admin/carousel-reorder":
            ordered_ids = body_data.get("ordered_ids", [])
            data = load_data()
            id_map = {c["id"]: c for c in data["carousel"]}
            reordered = [id_map[id_] for id_ in ordered_ids if id_ in id_map]
            for i, c in enumerate(reordered):
                c["order"] = i
            data["carousel"] = reordered
            save_data(data)
            self.send_json(200, {"ok": True})

        elif path.startswith("/api/admin/feedback/"):
            item_id = path.split("/")[-1]
            data = load_data()
            for i, f in enumerate(data.get("feedback", [])):
                if f["id"] == item_id:
                    if body_data.get("status") in ("pending", "approved", "hidden"):
                        data["feedback"][i]["status"] = body_data["status"]
                    data["feedback"][i]["updated_at"] = int(time.time())
                    save_data(data)
                    self.send_json(200, data["feedback"][i])
                    return
            self.send_json(404, {"error": "Not found"})

        elif path == "/api/admin/settings":
            data = load_data()
            data["settings"].update(body_data)
            save_data(data)
            self.send_json(200, data["settings"])

        else:
            self.send_json(404, {"error": "Not found"})

    def do_PATCH(self):
        # PATCH partilha a lógica do PUT (ex.: aprovação de feedback)
        self.do_PUT()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        token = get_token_from_header(self.headers)
        if not token or not decode_token(token):
            self.send_json(401, {"error": "Unauthorized"})
            return

        if path.startswith("/api/admin/products/"):
            product_id = path.split("/")[-1]
            data = load_data()
            data["products"] = [p for p in data["products"] if p["id"] != product_id]
            save_data(data)
            self.send_json(200, {"message": "Deleted"})

        elif path.startswith("/api/admin/carousel/"):
            item_id = path.split("/")[-1]
            data = load_data()
            data["carousel"] = [c for c in data["carousel"] if c["id"] != item_id]
            save_data(data)
            self.send_json(200, {"ok": True})

        elif path.startswith("/api/admin/feedback/"):
            item_id = path.split("/")[-1]
            data = load_data()
            data["feedback"] = [f for f in data.get("feedback", []) if f["id"] != item_id]
            save_data(data)
            self.send_json(200, {"message": "Deleted"})

        else:
            self.send_json(404, {"error": "Not found"})

    def serve_index(self, path):
        if not INDEX_HTML.exists():
            self.send_json(404, {"error": "Not found"})
            return
        html = INDEX_HTML.read_text(encoding="utf-8")
        proto = self.headers.get("X-Forwarded-Proto", "http")
        host = self.headers.get("Host", "localhost:5000")
        base_url = f"{proto}://{host}"
        meta = build_meta_block(path, base_url)
        html = META_RE.sub(meta, html, count=1)
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        try:
            self.wfile.write(json.dumps(data).encode("utf-8"))
        except (BrokenPipeError, ConnectionAbortedError):
            # Cliente fechou a conexão antes do envio terminar
            pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def log_message(self, format, *args):
        # Reduz verbosidade dos logs
        pass

if __name__ == "__main__":
    PORT = 5000
    handler = APIHandler
    with HTTPServer(("0.0.0.0", PORT), handler) as httpd:
        print(f"Backend rodando em http://0.0.0.0:{PORT}")
        print(f"Email: {ADMIN_EMAIL}")
        print(f"Senha: {ADMIN_PASSWORD}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nBackend parado")
