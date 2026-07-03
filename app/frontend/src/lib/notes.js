// Tradução palavra-a-palavra das notas olfativas (dados só existem em EN).
// Usada só para MOSTRAR; a filtragem continua a usar o valor original.
const DICT = {
  pt: {
    amber: "Âmbar", aquatic: "Aquático", bergamot: "Bergamota", citrus: "Cítrico",
    vanilla: "Baunilha", earthy: "Terroso", lavender: "Lavanda", notes: "Notas",
    floral: "Floral", woody: "Amadeirado", woods: "Madeiras", fresh: "Fresco",
    cotton: "Algodão", violet: "Violeta", jasmine: "Jasmim", fruity: "Frutado",
    musk: "Almíscar", leather: "Couro", oakmoss: "Musgo de carvalho", spicy: "Especiado",
    sweet: "Doce", warm: "Quente", herbal: "Herbal", base: "Fundo", heart: "Coração",
    top: "Topo",
  },
};

export const translateNote = (note, lang = "en") => {
  const map = DICT[lang];
  if (!map || !note) return note;
  return note.replace(/[A-Za-zÀ-ÿ]+/g, (w) => map[w.toLowerCase()] || w);
};
