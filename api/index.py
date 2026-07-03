from flask import Flask, request, jsonify
from flask_cors import CORS
import functools
import firebase_admin
from firebase_admin import credentials, db, storage
import uuid
import os
import tempfile
import hmac
import hashlib
import time
import base64
import json
import urllib.parse
import urllib.request

app = Flask(__name__)
CORS(app)

# Cache HTTP nas respostas públicas: browser (max-age) e CDN (s-maxage) guardam a
# resposta e param de invocar a função -> poupa bandwidth Vercel e leituras Firebase.
# stale-while-revalidate serve conteúdo antigo enquanto revalida em background.
# Nota: mudanças do admin podem demorar até ao TTL a aparecer publicamente.
PUBLIC_CACHE = {
    "/api/currency": "public, max-age=1800, s-maxage=3600, stale-while-revalidate=3600",
    "/api/products": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    "/api/carousel": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    "/api/feedback": "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
    "/api/settings": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
}

@app.after_request
def set_cache_headers(resp):
    cc = PUBLIC_CACHE.get(request.path)
    if request.method == "GET" and resp.status_code == 200 and cc:
        resp.headers["Cache-Control"] = cc
    else:
        # Tudo o resto (admin, auth, escritas) nunca é cacheado.
        resp.headers.setdefault("Cache-Control", "no-store")
    return resp

ADMIN_EMAIL = "escentialfragrance05@gmail.com"
ADMIN_PASSWORD = "enPW*23"
SECRET = os.environ.get("SECRET_KEY", "escential-secret-key-2024")
TOKEN_TTL = 24 * 3600  # 24h
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW = 15 * 60  # 15 min

def get_firebase_db():
    if not firebase_admin._apps:
        env = os.environ.get("FIREBASE_CREDENTIALS")
        if not env:
            raise RuntimeError("FIREBASE_CREDENTIALS not set")
        tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
        tmp.write(env)
        tmp.close()
        cred = credentials.Certificate(tmp.name)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://escential-default-rtdb.firebaseio.com/"
        })
    return db

DEFAULT_SETTINGS = {"whatsapp_number": "447767993428"}
DATA_NODES = ("settings", "products", "carousel", "feedback")

def load_data(only=None):
    """Lê só o(s) ramo(s) necessário(s) do RTDB.
    Evita baixar a base inteira a cada request (poupa quota de download)."""
    db = get_firebase_db()
    nodes = [only] if only else list(DATA_NODES)
    data = {}
    for n in nodes:
        val = db.reference(n).get()
        if n == "settings":
            data["settings"] = val if isinstance(val, dict) else dict(DEFAULT_SETTINGS)
        else:
            # products/carousel/feedback: Firebase pode devolver dict ou list
            data[n] = list(val.values()) if isinstance(val, dict) else (val or [])
    # Backfill de ids só quando os produtos foram carregados
    if "products" in data:
        dirty = False
        for p in data["products"]:
            if not p.get("id"):
                p["id"] = str(uuid.uuid4())
                dirty = True
        if dirty:
            save_data(data, "products")
    return data

def save_data(data, only=None):
    """Grava só o(s) ramo(s) alterado(s) (não reescreve a raiz inteira)."""
    db = get_firebase_db()
    nodes = [only] if only else list(DATA_NODES)
    for n in nodes:
        if n in data:
            db.reference(n).set(data[n])

def create_token(email):
    exp = str(int(time.time()) + TOKEN_TTL)
    msg = f"{email}:{exp}"
    sig = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{msg}:{sig}".encode()).decode()

def verify_token(token):
    try:
        raw = base64.urlsafe_b64decode(token.encode()).decode()
        email, exp, sig = raw.rsplit(":", 2)
        expected = hmac.new(SECRET.encode(), f"{email}:{exp}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return False
        if email != ADMIN_EMAIL:
            return False
        if int(exp) < int(time.time()):
            return False
        return True
    except Exception:
        return False

def get_token():
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:]
    return None

def client_ip():
    fwd = request.headers.get("X-Forwarded-For", "")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.remote_addr or "unknown"

def rate_limit_ref(ip):
    key = hashlib.sha256(ip.encode()).hexdigest()[:16]
    return get_firebase_db().reference(f"rate_limit/{key}")

def login_allowed(ip):
    rec = rate_limit_ref(ip).get() or {}
    if int(time.time()) - rec.get("start", 0) > LOGIN_WINDOW:
        return True
    return rec.get("count", 0) < LOGIN_MAX_ATTEMPTS

def register_failed_login(ip):
    ref = rate_limit_ref(ip)
    rec = ref.get() or {}
    now = int(time.time())
    if now - rec.get("start", 0) > LOGIN_WINDOW:
        ref.set({"start": now, "count": 1})
    else:
        ref.set({"start": rec.get("start", now), "count": rec.get("count", 0) + 1})

def reset_login_attempts(ip):
    rate_limit_ref(ip).delete()

def auth_required(f):
    @functools.wraps(f)
    def wrapper(*args, **kwargs):
        token = get_token()
        if not token or not verify_token(token):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return wrapper


@app.route("/")
def health():
    return jsonify({"status": "ok"})

# ---- Conversão de moeda (proxy interno; evita CORS no browser) ----
FX_FALLBACK = {"EUR": 1.18}
FX_TTL = 3600  # 1h
_fx_cache = {"ts": 0, "rates": None}

@app.route("/api/currency", methods=["GET"])
def get_currency():
    now = int(time.time())
    if _fx_cache["rates"] and now - _fx_cache["ts"] < FX_TTL:
        return jsonify({"base": "GBP", "rates": _fx_cache["rates"], "cached": True})
    try:
        url = "https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            payload = json.loads(r.read().decode("utf-8"))
        rates = payload.get("rates") or {}
        if rates:
            _fx_cache["ts"] = now
            _fx_cache["rates"] = rates
            return jsonify({"base": "GBP", "rates": rates})
    except Exception:
        pass
    # Falha: mantém última taxa conhecida ou fallback hardcoded
    return jsonify({"base": "GBP", "rates": _fx_cache["rates"] or FX_FALLBACK, "fallback": True})

@app.route("/api/settings", methods=["GET"])
def get_settings():
    data = load_data("settings")
    s = data["settings"]
    # page_home só é usado no Editor (a Home pública é fixa em código).
    # Não o enviar no público evita baixar o layout da home em cada visita.
    public = {k: v for k, v in s.items() if k != "page_home"} if isinstance(s, dict) else s
    return jsonify(public)

@app.route("/api/products", methods=["GET"])
def get_products():
    data = load_data("products")
    active = [p for p in data["products"] if p.get("active", True)]
    return jsonify(active)

@app.route("/api/auth/verify", methods=["GET"])
def verify():
    token = get_token()
    if token and verify_token(token):
        return jsonify({"valid": True})
    return jsonify({"valid": False}), 401

@app.route("/api/auth/login", methods=["POST"])
def login():
    ip = client_ip()
    if not login_allowed(ip):
        return jsonify({"error": "Demasiadas tentativas. Tenta novamente mais tarde."}), 429
    body = request.get_json() or {}
    if body.get("email") == ADMIN_EMAIL and body.get("password") == ADMIN_PASSWORD:
        reset_login_attempts(ip)
        return jsonify({"access_token": create_token(ADMIN_EMAIL)})
    register_failed_login(ip)
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/api/admin/products", methods=["GET"])
@auth_required
def admin_get_products():
    data = load_data("products")
    return jsonify(data["products"])

@app.route("/api/admin/products", methods=["POST"])
@auth_required
def admin_create_product():
    body = request.get_json() or {}
    data = load_data("products")
    product = {
        "id": str(uuid.uuid4()),
        "name_en": body.get("name_en", ""),
        "description_en": body.get("description_en", ""),
        "scent_notes_en": body.get("scent_notes_en", ""),
        "price_gbp": body.get("price_gbp", 0),
        "price_on_request": body.get("price_on_request", False),
        "sale_price_gbp": body.get("sale_price_gbp", None),
        "images": body.get("images", []),
        "featured": body.get("featured", False),
        "show_home": body.get("show_home", False),
        "active": body.get("active", True),
        "order": len(data["products"])
    }
    data["products"].append(product)
    save_data(data, "products")
    return jsonify(product), 201

@app.route("/api/admin/products/<product_id>", methods=["PUT"])
@auth_required
def admin_update_product(product_id):
    body = request.get_json() or {}
    data = load_data("products")
    for i, p in enumerate(data["products"]):
        if p["id"] == product_id:
            data["products"][i].update(body)
            save_data(data, "products")
            return jsonify(data["products"][i])
    return jsonify({"error": "Not found"}), 404

@app.route("/api/admin/products/<product_id>", methods=["DELETE"])
@auth_required
def admin_delete_product(product_id):
    data = load_data("products")
    data["products"] = [p for p in data["products"] if p["id"] != product_id]
    save_data(data, "products")
    return jsonify({"message": "Deleted"})

@app.route("/api/admin/products-reorder", methods=["PUT"])
@auth_required
def admin_reorder_products():
    body = request.get_json() or {}
    ordered_ids = body.get("ordered_ids", [])
    data = load_data("products")
    reordered = []
    for id_ in ordered_ids:
        for p in data["products"]:
            if p["id"] == id_:
                reordered.append(p)
                break
    data["products"] = reordered
    for i, p in enumerate(data["products"]):
        p["order"] = i
    save_data(data, "products")
    return jsonify({"message": "Reordered"})

@app.route("/api/admin/settings", methods=["GET"])
@auth_required
def admin_get_settings():
    # Settings completo (inclui page_home) para o Editor.
    data = load_data("settings")
    return jsonify(data["settings"])

@app.route("/api/admin/settings", methods=["PUT"])
@auth_required
def admin_update_settings():
    body = request.get_json() or {}
    data = load_data("settings")
    data["settings"].update(body)
    save_data(data, "settings")
    return jsonify(data["settings"])

@app.route("/api/carousel", methods=["GET"])
def get_carousel():
    data = load_data("carousel")
    active = [c for c in data.get("carousel", []) if c.get("active", True)]
    return jsonify(active)

@app.route("/api/admin/carousel", methods=["GET"])
@auth_required
def admin_get_carousel():
    data = load_data("carousel")
    items = sorted(data.get("carousel", []), key=lambda x: x.get("order", 0))
    return jsonify(items)

@app.route("/api/admin/carousel", methods=["POST"])
@auth_required
def admin_create_carousel():
    body = request.get_json() or {}
    data = load_data("carousel")
    new_item = {
        "id": str(uuid.uuid4()),
        "image": body.get("image", ""),
        "link": body.get("link", ""),
        "title": body.get("title", ""),
        "active": body.get("active", True),
        "mediaType": body.get("mediaType", "image"),
        "poster": body.get("poster", ""),
        "order": len(data.get("carousel", [])),
    }
    data["carousel"].append(new_item)
    save_data(data, "carousel")
    return jsonify(new_item), 201

@app.route("/api/admin/carousel/<item_id>", methods=["PUT", "PATCH"])
@auth_required
def admin_update_carousel(item_id):
    body = request.get_json() or {}
    data = load_data("carousel")
    for i, c in enumerate(data.get("carousel", [])):
        if c["id"] == item_id:
            data["carousel"][i].update(body)
            save_data(data, "carousel")
            return jsonify(data["carousel"][i])
    return jsonify({"error": "Not found"}), 404

@app.route("/api/admin/carousel/<item_id>", methods=["DELETE"])
@auth_required
def admin_delete_carousel(item_id):
    data = load_data("carousel")
    data["carousel"] = [c for c in data.get("carousel", []) if c["id"] != item_id]
    save_data(data, "carousel")
    return jsonify({"message": "Deleted"})

@app.route("/api/admin/carousel-reorder", methods=["PUT"])
@auth_required
def admin_reorder_carousel():
    body = request.get_json() or {}
    ordered_ids = body.get("ordered_ids", [])
    data = load_data("carousel")
    carousel = data.get("carousel", [])
    id_map = {c["id"]: c for c in carousel}
    reordered = [id_map[id_] for id_ in ordered_ids if id_ in id_map]
    for i, c in enumerate(reordered):
        c["order"] = i
    data["carousel"] = reordered
    save_data(data, "carousel")
    return jsonify({"message": "Reordered"})


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

@app.route("/api/feedback", methods=["GET"])
def get_feedback():
    data = load_data("feedback")
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
    return jsonify(public)

@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    body = request.get_json(silent=True) or {}
    name, text, social, image = clean_feedback_input(body)
    if not name or not text:
        return jsonify({"error": "Nome e feedback são obrigatórios"}), 400
    # Foto do visitante vem como base64 -> sobe para o Storage e guarda só a URL
    # (evita base64 no DB, que pesa em cada leitura de /api/feedback).
    if image.startswith("data:image/"):
        try:
            image = upload_data_url(image)
        except Exception:
            image = ""  # falha no upload não deve bloquear o feedback
    data = load_data("feedback")
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
    save_data(data, "feedback")
    return jsonify({"ok": True}), 201

@app.route("/api/admin/feedback", methods=["GET"])
@auth_required
def admin_get_feedback():
    data = load_data("feedback")
    items = sorted(data.get("feedback", []), key=lambda x: x.get("created_at", 0), reverse=True)
    return jsonify(items)

@app.route("/api/admin/feedback/<item_id>", methods=["PUT", "PATCH"])
@auth_required
def admin_update_feedback(item_id):
    body = request.get_json(silent=True) or {}
    data = load_data("feedback")
    for i, f in enumerate(data.get("feedback", [])):
        if f["id"] == item_id:
            if body.get("status") in ("pending", "approved", "hidden"):
                data["feedback"][i]["status"] = body["status"]
            data["feedback"][i]["updated_at"] = int(time.time())
            save_data(data, "feedback")
            return jsonify(data["feedback"][i])
    return jsonify({"error": "Not found"}), 404

@app.route("/api/admin/feedback/<item_id>", methods=["DELETE"])
@auth_required
def admin_delete_feedback(item_id):
    data = load_data("feedback")
    data["feedback"] = [f for f in data.get("feedback", []) if f["id"] != item_id]
    save_data(data, "feedback")
    return jsonify({"message": "Deleted"})


CONTENT_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "webp": "image/webp",
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "ogg": "video/ogg",
}

def upload_data_url(data_url, ext=None):
    """Sobe um data URL (data:...;base64,...) para o Storage e devolve o URL público.
    Lança exceção em erro. Reutilizado pelo upload do admin e pelo feedback público."""
    get_firebase_db()  # garante init do firebase_admin
    if not data_url or "," not in data_url:
        raise ValueError("No file data")
    header, b64 = data_url.split(",", 1)
    raw = base64.b64decode(b64)
    if not ext:
        mime = header.split(";")[0].replace("data:", "").strip()
        ext = {v: k for k, v in CONTENT_TYPES.items()}.get(mime, "jpg")
    ext = ext.lstrip(".").lower()
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "escential.firebasestorage.app")
    content_type = CONTENT_TYPES.get(ext, "application/octet-stream")
    blob_name = f"uploads/{uuid.uuid4().hex}.{ext}"
    download_token = uuid.uuid4().hex
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    # Token de download do Firebase -> URL público sem tornar o bucket público.
    blob.metadata = {"firebaseStorageDownloadTokens": download_token}
    blob.upload_from_string(raw, content_type=content_type)
    encoded_name = urllib.parse.quote(blob_name, safe="")
    return (f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}"
            f"/o/{encoded_name}?alt=media&token={download_token}")

@app.route("/api/admin/upload", methods=["POST"])
@auth_required
def admin_upload():
    body = request.get_json(silent=True) or {}
    data_url = body.get("data", "")
    ext = (body.get("ext") or "jpg").lstrip(".").lower()
    if not data_url or "," not in data_url:
        return jsonify({"error": "No file data"}), 400
    try:
        url = upload_data_url(data_url, ext)
    except Exception as e:
        return jsonify({"error": f"Storage upload: {e}"}), 500
    return jsonify({"url": url})
