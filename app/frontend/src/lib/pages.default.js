// Conteudo inicial (editavel no construtor) das paginas independentes.
// Renderizado por DynamicPage quando ainda nao foi guardado nada no admin,
// e usado como ponto de partida no Editor.
// Cores da marca: DARK #3B2618 | BROWN #8B5E3C | CREAM #F9F6F0

const DARK = "#3B2618";
const BROWN = "#8B5E3C";
const CREAM = "#F9F6F0";

// Titulos mostrados no Editor / menu
export const pageTitles = {
  about: "About Us",
  fragrances: "Fragrances",
  contact: "Contact",
};

// Conteúdo por idioma. tr(pt, en) escolhe a string conforme a língua.
export const pagesDefaultFor = (lang = "en") => {
  const tr = (pt, en) => (lang === "pt" ? pt : en);

  const about = {
    root: {},
    content: [
      {
        type: "Hero",
        props: {
          id: "about-hero",
          image: "/static/img/story.jpg",
          title: tr("Sobre a Escential", "About Escential"),
          subtitle: tr("Arte, conforto e carácter em cada aroma", "Craft, comfort and character in every scent"),
          ctaText: "",
          ctaLink: "",
          height: "55vh",
          vpos: "center",
          titlePos: "center",
          subtitlePos: "center",
          overlayType: "solido",
          overlayColor: DARK,
          overlayOpacity: 35,
        },
      },
      {
        type: "Heading",
        props: { id: "about-h1", text: tr("Aroma com alma", "Scent with a soul"), fontSize: 44, color: DARK, align: "center", spacing: 56 },
      },
      {
        type: "Text",
        props: {
          id: "about-t1",
          text: tr(
            "A Escential nasceu para trazer conforto, calma e uma sofisticação discreta aos espaços do dia-a-dia. Cada vela é vertida à mão em pequenos lotes, combinando cera natural com fragrâncias cuidadosamente selecionadas e um design intemporal.",
            "Escential was created to bring comfort, calm and quiet sophistication into everyday spaces. Every candle is hand-poured in small batches, blending natural wax with carefully selected fragrances and timeless design."
          ),
          fontSize: 17,
          align: "center",
          maxWidth: 720,
          spacing: 8,
        },
      },
      {
        type: "Columns",
        props: {
          id: "about-cols",
          count: 2,
          gap: "gap-12",
          valign: "items-center",
          col1: [
            {
              type: "ImageBlock",
              props: { id: "about-img", src: "/static/img/premium.jpg", alt: "Our craft", ratio: "4 / 3", fit: "cover", maxWidth: 560, radius: 8, align: "center", shadow: "sim" },
            },
          ],
          col2: [
            { type: "Heading", props: { id: "about-h2", text: tr("Feito com intenção", "Made with intention"), fontSize: 30, color: DARK, align: "left", spacing: 4 } },
            {
              type: "Text",
              props: {
                id: "about-t2",
                text: tr(
                  "Acreditamos que um aroma deve ser pessoal. Desde a primeira vez que a cera é vertida até ao último detalhe da caixa, tudo é pensado para transformar um momento comum em algo memorável.",
                  "We believe a scent should feel personal. From the first pour to the final detail of the box, everything is designed to turn an ordinary moment into something memorable."
                ),
                fontSize: 16,
                align: "left",
                maxWidth: 0,
                spacing: 8,
              },
            },
          ],
          col3: [],
        },
      },
      { type: "Divider", props: { id: "about-div", width: "120px" } },
      {
        type: "Heading",
        props: { id: "about-h3", text: tr("Aquilo em que acreditamos", "What we stand for"), fontSize: 32, color: DARK, align: "center", spacing: 24 },
      },
      {
        type: "Columns",
        props: {
          id: "about-values",
          count: 3,
          gap: "gap-12",
          valign: "items-start",
          col1: [
            { type: "Icon", props: { id: "about-ic1", name: "folha", size: 40, color: BROWN, align: "center" } },
            { type: "Heading", props: { id: "about-vh1", text: tr("Cera natural", "Natural wax"), fontSize: 18, color: DARK, align: "center", spacing: 4 } },
            { type: "Text", props: { id: "about-vt1", text: tr("Cera sustentável de queima limpa para um aroma mais suave e duradouro.", "Clean-burning, sustainable wax for a softer, longer scent."), fontSize: 14, align: "center", maxWidth: 0, spacing: 4 } },
          ],
          col2: [
            { type: "Icon", props: { id: "about-ic2", name: "fogo", size: 40, color: BROWN, align: "center" } },
            { type: "Heading", props: { id: "about-vh2", text: tr("Feito à mão", "Hand-poured"), fontSize: 18, color: DARK, align: "center", spacing: 4 } },
            { type: "Text", props: { id: "about-vt2", text: tr("Feito em pequenos lotes com atenção a cada detalhe.", "Made in small batches with attention to every detail."), fontSize: 14, align: "center", maxWidth: 0, spacing: 4 } },
          ],
          col3: [
            { type: "Icon", props: { id: "about-ic3", name: "relogio", size: 40, color: BROWN, align: "center" } },
            { type: "Heading", props: { id: "about-vh3", text: tr("Longa duração", "Long lasting"), fontSize: 18, color: DARK, align: "center", spacing: 4 } },
            { type: "Text", props: { id: "about-vt3", text: tr("Uma fragrância equilibrada que enche o espaço e permanece.", "A balanced fragrance that fills the room and lingers."), fontSize: 14, align: "center", maxWidth: 0, spacing: 4 } },
          ],
        },
      },
      { type: "Divider", props: { id: "about-div-ig", width: "120px" } },
      {
        type: "InstagramCarousel",
        props: {
          id: "about-instagram",
          heading: tr("Siga-nos no Instagram", "Follow us on Instagram"),
          subtext: "@escential.collection",
          instagram: "https://www.instagram.com/escential.collection/",
          ctaText: tr("Seguir @escential.collection", "Follow @escential.collection"),
          images: [
            { src: "/static/img/testimonial-1.jpg" },
            { src: "/static/img/premium.jpg" },
            { src: "/static/img/testimonial-2.jpg" },
            { src: "/static/img/feeling.webp" },
            { src: "/static/img/testimonial-3.jpg" },
            { src: "/static/img/story.jpg" },
          ],
          bg: CREAM,
          padTop: 80,
          padBottom: 96,
        },
      },
    ],
  };

  const fragrances = {
    root: {},
    content: [
      {
        type: "Hero",
        props: {
          id: "fr-hero",
          image: "/static/img/premium.jpg",
          title: tr("As Nossas Fragrâncias", "Our Fragrances"),
          subtitle: tr("Encontre o seu aroma de assinatura", "Find your signature scent"),
          ctaText: "",
          ctaLink: "",
          height: "55vh",
          vpos: "center",
          titlePos: "center",
          subtitlePos: "center",
          overlayType: "solido",
          overlayColor: DARK,
          overlayOpacity: 35,
        },
      },
      {
        type: "Fragrances",
        props: {
          id: "fr-grid",
          eyebrow: tr("A Coleção", "The Collection"),
          title: tr("Pensadas para transformar o seu espaço", "Crafted to transform your space"),
          eyebrowColor: BROWN,
          titleColor: DARK,
          titleSize: 40,
          headAlign: "center",
          bg: CREAM,
          padTop: 80,
          padBottom: 112,
          columns: "3",
          gap: 40,
          cardAlign: "center",
          imgRatio: "1 / 1",
          imgFit: "cover",
          imgRadius: 0,
          nameColor: DARK,
          nameSize: 16,
          descColor: "rgba(59,38,24,.75)",
          descSize: 15,
          showNotes: "sim",
          notesColor: "#A68A72",
          notesSize: 13,
          items: [
            { image: "/static/img/testimonial-1.jpg", name: "Cotton Clouds", desc: tr("Algodão suave, almíscar branco e conforto envolvente.", "Soft cotton, white musk and warm comfort."), notes: tr("Algodão, Almíscar Branco, Âmbar", "Cotton, White Musk, Amber") },
            { image: "/static/img/testimonial-2.jpg", name: "Leather & Woods", desc: tr("Madeiras profundas, couro e um luxo silencioso.", "Deep woods, leather and quiet luxury."), notes: tr("Couro, Cedro, Sândalo", "Leather, Cedarwood, Sandalwood") },
            { image: "/static/img/testimonial-3.jpg", name: "Sandalwood & Musk", desc: tr("Sândalo cremoso com notas sensuais de almíscar.", "Creamy sandalwood with sensual musk notes."), notes: tr("Sândalo, Almíscar, Baunilha", "Sandalwood, Musk, Vanilla") },
          ],
        },
      },
      {
        type: "Banner",
        props: {
          id: "fr-cta",
          image: "/static/img/feeling.webp",
          eyebrow: tr("PRONTO A ESCOLHER?", "READY TO CHOOSE?"),
          title: tr("Explore a loja", "Explore the shop"),
          ctaText: tr("Comprar agora", "Shop now"),
          ctaLink: "/shop",
          cta2Text: "",
          cta2Link: "/shop",
          cta2Variant: "outline",
          vpos: "center",
          eyebrowPos: "left",
          titlePos: "left",
          ctaPos: "left",
        },
      },
    ],
  };

  const contact = {
    root: {},
    content: [
      {
        type: "Hero",
        props: {
          id: "ct-hero",
          image: "/static/img/feeling.webp",
          title: tr("Vamos falar.", "Let's talk."),
          subtitle: tr("Teremos todo o gosto em ouvi-lo", "We're always happy to hear from you"),
          ctaText: "",
          ctaLink: "",
          height: "55vh",
          vpos: "center",
          titlePos: "center",
          subtitlePos: "center",
          overlayType: "solido",
          overlayColor: DARK,
          overlayOpacity: 35,
        },
      },
      {
        type: "ContactMethods",
        props: {
          id: "ct-methods",
          waHeading: tr("Fale connosco no WhatsApp", "Talk to us on WhatsApp"),
          waText: tr(
            "Dúvidas sobre um produto, encomendas personalizadas, ofertas ou quer apenas saber mais? Envie-nos uma mensagem direta — respondemos rápido.",
            "Questions about a product, custom orders, gifting or just want to know more? Send us a message directly — we reply fast."
          ),
          waButtonText: tr("Iniciar conversa", "Start a conversation"),
          waNote: tr("Disponível Seg–Sáb · Normalmente responde em poucas horas", "Available Mon–Sat · Usually replies within a few hours"),
          emailHeading: tr("Ou envie-nos um email", "Or send us an email"),
          emailText: tr("Para questões detalhadas ou feedback, contacte diretamente", "For detailed inquiries or feedback, reach out directly"),
          email: "escentialfragrance05@gmail.com",
          headingColor: DARK,
          textColor: "rgba(59,38,24,.75)",
          noteColor: "#A68A72",
          bg: CREAM,
          padTop: 96,
          padBottom: 96,
        },
      },
      {
        type: "InstagramCTA",
        props: {
          id: "ct-instagram",
          eyebrow: tr("SIGA-NOS", "FOLLOW US"),
          eyebrowColor: BROWN,
          title: tr("Siga-nos no Instagram", "Follow us on Instagram"),
          titleColor: DARK,
          text: "@escential.collection",
          textColor: "rgba(59,38,24,.65)",
          instagram: "https://www.instagram.com/escential.collection/",
          buttonText: tr("Seguir no Instagram", "Follow on Instagram"),
          bg: CREAM,
          btnBg: BROWN,
          btnColor: CREAM,
          padTop: 24,
          padBottom: 80,
        },
      },
    ],
  };

  return { about, fragrances, contact };
};

// Compat: defaults EN (base de edição no admin).
export const pagesDefault = pagesDefaultFor("en");

export default pagesDefault;
