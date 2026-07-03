#!/usr/bin/env python3
"""
Migração única: move imagens/vídeos guardados como base64 (data:...) dentro do
Realtime Database para o Firebase Storage, substituindo pelo URL público.

Varre recursivamente TODA a base (products, carousel, feedback e o conteúdo do
Puck dentro de settings -> page_home / pages[]).

Uso (PowerShell):
  $env:FIREBASE_CREDENTIALS = Get-Content -Raw caminho\serviceAccount.json
  $env:FIREBASE_STORAGE_BUCKET = "escential.firebasestorage.app"   # opcional
  python migrate_base64.py            # dry-run: só conta, não altera
  python migrate_base64.py --apply    # aplica de facto

Faz um backup local (rtdb_backup.json) antes de gravar quando corre com --apply.
"""
import os
import sys
import json
import uuid
import base64
import tempfile
import urllib.parse

import firebase_admin
from firebase_admin import credentials, db, storage

DATABASE_URL = "https://escential-default-rtdb.firebaseio.com/"

MIME_EXT = {
    "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp",
    "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov", "video/ogg": "ogg",
}

count = {"found": 0, "uploaded": 0}


def init():
    env = os.environ.get("FIREBASE_CREDENTIALS")
    if not env:
        sys.exit("FIREBASE_CREDENTIALS não definido")
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False)
    tmp.write(env)
    tmp.close()
    cred = credentials.Certificate(tmp.name)
    firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})


def upload_data_url(data_url, bucket_name, apply):
    """Sobe um data URL pro Storage e devolve o URL público. Em dry-run devolve None."""
    try:
        header, b64 = data_url.split(",", 1)
        mime = header.split(";")[0].replace("data:", "") or "application/octet-stream"
    except ValueError:
        return None
    ext = MIME_EXT.get(mime, "bin")
    count["found"] += 1
    if not apply:
        return None
    raw = base64.b64decode(b64)
    blob_name = f"uploads/{uuid.uuid4().hex}.{ext}"
    token = uuid.uuid4().hex
    bucket = storage.bucket(bucket_name)
    blob = bucket.blob(blob_name)
    blob.metadata = {"firebaseStorageDownloadTokens": token}
    blob.upload_from_string(raw, content_type=mime)
    count["uploaded"] += 1
    encoded = urllib.parse.quote(blob_name, safe="")
    return (f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}"
            f"/o/{encoded}?alt=media&token={token}")


def walk(node, bucket_name, apply):
    """Percorre dicts/lists e troca strings data:... por URL do Storage."""
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str) and v.startswith("data:"):
                url = upload_data_url(v, bucket_name, apply)
                if url:
                    node[k] = url
            else:
                walk(v, bucket_name, apply)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str) and v.startswith("data:"):
                url = upload_data_url(v, bucket_name, apply)
                if url:
                    node[i] = url
            else:
                walk(v, bucket_name, apply)


def main():
    apply = "--apply" in sys.argv
    bucket_name = os.environ.get("FIREBASE_STORAGE_BUCKET", "escential.firebasestorage.app")
    init()
    root_ref = db.reference("/")
    data = root_ref.get() or {}

    if apply:
        with open("rtdb_backup.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        print("Backup gravado em rtdb_backup.json")

    walk(data, bucket_name, apply)

    if apply:
        # Grava só os ramos afetados (evita reescrever a base toda desnecessariamente)
        for node in ("settings", "products", "carousel", "feedback"):
            if node in data:
                db.reference(node).set(data[node])
        print(f"Aplicado. base64 encontrados: {count['found']}, enviados ao Storage: {count['uploaded']}")
    else:
        print(f"Dry-run. base64 encontrados: {count['found']} (corre com --apply para migrar)")


if __name__ == "__main__":
    main()
