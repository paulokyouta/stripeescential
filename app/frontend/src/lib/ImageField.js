import React, { useRef, useState } from "react";
import { API } from "./api";

// Comprime a imagem no browser (max 1600px, JPEG) antes de enviar.
function compress(file, maxSize = 1600, quality = 0.85) {
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
      resolve({
        data: canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality),
        ext: isPng ? "png" : "jpg",
      });
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ImageUpload = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      // Comprime e faz upload pro Storage; guarda só a URL (não base64 no DB).
      const { data, ext } = await compress(file);
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
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value ? (
        <img
          src={value}
          alt=""
          style={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: 4,
            border: "1px solid #ddd",
          }}
        />
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{
          padding: "8px 12px",
          background: "#8B5E3C",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        {busy ? "A carregar..." : "Carregar imagem"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ou cola um URL"
        style={{
          padding: "6px 8px",
          border: "1px solid #ddd",
          borderRadius: 4,
          fontSize: 12,
        }}
      />
    </div>
  );
};

// Helper: devolve um campo Puck do tipo imagem com upload.
export const imageField = (label = "Imagem") => ({
  type: "custom",
  label,
  render: ({ value, onChange }) => (
    <ImageUpload value={value} onChange={onChange} />
  ),
});

export default ImageUpload;
