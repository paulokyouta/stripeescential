const DARK = "#3B2618";
const SAND = "#EDE4D8";
const CREAM = "#F9F6F0";

// Conteúdo Puck por idioma. tr(pt, en) escolhe a string conforme a língua.
export const homeDefaultFor = (lang = "en") => {
  const tr = (pt, en) => (lang === "pt" ? pt : en);
  return {
    root: {},
    content: [
      // 1. HERO
      {
        type: "HeroSplit",
        props: {
          id: "home-hero",
          image: "/static/img/hero-home.jpg",
          imgFit: "cover",
          imgObjectPos: "center",
          minHeight: 100,
          overlayType: "grad-left",
          overlayColor: CREAM,
          overlayOpacity: 88,
          textSide: "left",
          eyebrow: "ESCENTIAL",
          title: tr("Transformar espaços\nem memórias.", "Turning spaces\ninto memories."),
          subtitle: tr("Mais do que uma fragrância. É um sentimento.", "More than a fragrance. It's a feeling."),
          bullets: [
            { text: tr("Velas de cera natural vertidas à mão.", "Hand-poured natural wax candles.") },
            { text: tr("Fragrância limpa e de longa duração.", "Long-lasting, clean fragrance.") },
          ],
          ctaText: tr("Ver toda a coleção", "Shop our full range"),
          ctaLink: "/shop",
          padLeft: 220,
          eyebrowColor: "#8B5E3C",
          titleColor: DARK,
          titleSize: 0,
          subtitleColor: DARK,
          bulletColor: "#8B5E3C",
          textColor: "rgba(59,38,24,.85)",
          btnBg: DARK,
          btnColor: CREAM,
        },
      },

      // 2. Fila de confiança
      {
        type: "Features",
        props: {
          id: "home-trust",
          eyebrow: "",
          eyebrowColor: "#8B5E3C",
          eyebrowSize: 0,
          title: "",
          titleColor: DARK,
          titleSize: 0,
          headAlign: "center",
          columns: "4",
          bg: SAND,
          padTop: 20,
          padBottom: 20,
          itemAlign: "center",
          iconSize: 30,
          iconColor: "#8B5E3C",
          itemTitleColor: DARK,
          itemTitleSize: 0,
          itemTextColor: "rgba(59,38,24,.6)",
          itemTextSize: 0,
          items: [
            { icon: "folha", title: tr("Cera natural", "Natural wax"), text: tr("Queima limpa e sustentável.", "Clean, sustainable burn.") },
            { icon: "fogo", title: tr("Feito à mão", "Hand-poured"), text: tr("Pequenos lotes artesanais.", "Small artisan batches.") },
            { icon: "relogio", title: tr("Longa duração", "Long lasting"), text: tr("45-50h de aroma.", "45-50h of scent.") },
            { icon: "coracao", title: tr("Feito com cuidado", "Made with care"), text: tr("Para oferecer e guardar.", "Crafted to gift & keep.") },
          ],
        },
      },

      // 3. Produtos em destaque
      {
        type: "FeaturedProducts",
        props: {
          id: "home-featured",
          eyebrow: tr("Mais vendidos", "Best sellers"),
          eyebrowColor: "#8B5E3C",
          eyebrowSize: 0,
          title: tr("Adorados pelos nossos clientes", "Loved by our customers"),
          titleColor: DARK,
          titleSize: 0,
          headAlign: "center",
          source: "home",
          limit: 5,
          bg: CREAM,
          padTop: 96,
          padBottom: 48,
          showViewAll: "sim",
          viewAllText: tr("Ver coleção completa", "View full collection"),
          viewAllColor: "#8B5E3C",
        },
      },

      // 4. Carrossel Instagram
      {
        type: "InstagramCarousel",
        props: {
          id: "home-carousel",
          heading: "",
          subtext: "",
          instagram: "https://www.instagram.com/escential.collection/",
          ctaText: "",
          images: [
            { src: "/static/img/testimonial-1.jpg" },
            { src: "/static/img/premium.jpg" },
            { src: "/static/img/testimonial-2.jpg" },
            { src: "/static/img/feeling.webp" },
            { src: "/static/img/testimonial-3.jpg" },
            { src: "/static/img/story.jpg" },
          ],
          bg: SAND,
          padTop: 32,
          padBottom: 48,
        },
      },

      // 5. Instagram CTA
      {
        type: "InstagramCTA",
        props: {
          id: "home-instagram-cta",
          eyebrow: tr("SIGA-NOS", "FOLLOW US"),
          eyebrowColor: "#8B5E3C",
          title: tr("Junte-se à nossa comunidade", "Join our community"),
          titleColor: CREAM,
          text: tr("Descubra novos aromas e conecte-se connosco no Instagram.", "Discover new scents and connect with us on Instagram."),
          textColor: "rgba(249,246,240,.85)",
          instagram: "https://www.instagram.com/escential.collection/",
          buttonText: tr("Seguir no Instagram", "Follow on Instagram"),
          bg: DARK,
          btnBg: "#8B5E3C",
          btnColor: CREAM,
          padTop: 96,
          padBottom: 96,
        },
      },
    ],
  };
};

// Compat: default EN (usado como base de edição no admin).
export const homeDefault = homeDefaultFor("en");

export default homeDefault;
