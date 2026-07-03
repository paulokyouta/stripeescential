import React, { useRef, useState } from "react";
import { API } from "./api";

// Devolve true se o URL/dataURL aponta para vídeo
export const isVideo = (url = "") => {
  if (!url) return false;
  if (url.startsWith("data:video/")) return true;
  const u = url.toLowerCase().split("?")[0];
  return u.endsWith(".mp4") || u.endsWith(".webm") || u.endsWith(".mov") || u.endsWith(".ogg");
};

// Comprime imagem no browser antes de enviar
export function compressImage(file, maxSize = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => (img.src = reader.result);
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const r = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      const isPng = file.type === "image/png";
      resolve({ data: canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality), ext: isPng ? "png" : "jpg" });
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Faz upload de vídeo (raw, sem compressão)
async function uploadVideo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const token = localStorage.getItem("ef_token");
        const ext = file.name.split(".").pop().toLowerCase() || "mp4";
        const res = await fetch(`${API}/admin/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: reader.result, ext }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Erro ${res.status}`);
        }
        const json = await res.json();
        resolve(json.url);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MediaUpload = ({ value, onChange, label = "Média" }) => {
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      // Comprime e faz upload pro Storage; guarda só a URL (não base64 no DB).
      const { data, ext } = await compressImage(file);
      const token = localStorage.getItem("ef_token");
      const res = await fetch(`${API}/admin/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data, ext }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const json = await res.json();
      onChange(json.url);
    } catch (err) {
      alert(`Erro ao carregar imagem: ${err.message || "erro desconhecido"}`);
    } finally {
      setBusy(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  const handleVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadVideo(file);
      onChange(url);
    } catch (e) {
      alert(`Erro ao carregar vídeo: ${e.message || "erro desconhecido"}`);
    } finally {
      setBusy(false);
      if (vidRef.current) vidRef.current.value = "";
    }
  };

  const videoMode = isVideo(value);
  const btn = { padding: "7px 12px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#fff" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Preview */}
      {value ? (
        videoMode ? (
          <video
            src={value}
            muted
            playsInline
            style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
          />
        ) : (
          <img src={value} alt="" style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }} />
        )
      ) : null}

      {/* Botões de upload */}
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={() => imgRef.current?.click()} disabled={busy} style={{ ...btn, background: "#8B5E3C", flex: 1 }}>
          {busy ? "A carregar..." : "Imagem"}
        </button>
        <button type="button" onClick={() => vidRef.current?.click()} disabled={busy} style={{ ...btn, background: "#5C3A21", flex: 1 }}>
          {busy ? "A carregar..." : "Vídeo"}
        </button>
      </div>

      <input ref={imgRef} type="file" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
      <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={handleVideo} style={{ display: "none" }} />

      {/* URL manual */}
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ou cola URL de imagem ou vídeo"
        style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 4, fontSize: 12 }}
      />

      {/* Indicador de tipo detetado */}
      {value ? (
        <span style={{ fontSize: 11, color: "#8B5E3C" }}>
          Tipo detetado: {videoMode ? "Vídeo" : "Imagem"}
        </span>
      ) : null}
    </div>
  );
};

// Helper: campo Puck de mídia (imagem ou vídeo)
export const mediaField = (label = "Mídia") => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => <MediaUpload value={value} onChange={onChange} label={label} />,
});

// Componente de renderização — usa <video> ou <img> automaticamente
export const MediaRenderer = ({ src, className = "", style = {}, alt = "" }) => {
  if (!src) return null;
  if (isVideo(src)) {
    return (
      <video
        className={className}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        style={style}
      />
    );
  }
  return <img className={className} src={src} alt={alt} style={style} />;
};

export default MediaUpload;
