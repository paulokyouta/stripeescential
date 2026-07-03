// Geração de slugs amigáveis para URLs de produtos.
// Mantém o id interno como fonte de verdade; o slug é só para a URL.

const ACCENTS = new RegExp("[\\u0300-\\u036f]", "g"); // marcas diacríticas combinantes

export const slugify = (str) =>
  (str || "")
    .toString()
    .normalize("NFD")                 // separa acentos
    .replace(ACCENTS, "")             // remove acentos
    .toLowerCase()
    .replace(/&/g, " and ")           // "Leather & Woods" -> "leather-and-woods"
    .replace(/[^a-z0-9]+/g, "-")      // caracteres inválidos -> hífen
    .replace(/-{2,}/g, "-")           // colapsa hífens repetidos
    .replace(/^-+|-+$/g, "");         // remove hífens nas pontas

// Slug de um produto: usa override manual (campo slug) se existir, senão deriva do nome.
// Aceita tanto produtos (name_en) como items de carrinho/favoritos (name).
export const productSlug = (p) => {
  if (!p) return "";
  if (p.slug && String(p.slug).trim()) return slugify(p.slug);
  return slugify(p.name_en ?? p.name ?? "");
};

// Caminho da página do produto. Cai para o id se não houver nome/slug.
export const productPath = (p) => `/product/${productSlug(p) || p.id}`;
