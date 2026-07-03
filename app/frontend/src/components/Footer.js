import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Instagram, Mail } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import WhatsAppIcon from "./WhatsAppIcon";
import { buildWaUrl, generalMessage } from "../lib/whatsapp";

const Footer = () => {
  const { t, whatsappNumber } = useApp();
  const loc = useLocation();
  if (loc.pathname.startsWith("/admin")) return null;

  const waHref = buildWaUrl(whatsappNumber, generalMessage());
  const shopLinks = t("footer.shop_links");
  const infoLinks = t("footer.info_links");

  // Footer fixo (não editável no Puck) — valores em código.
  const logoSrc = "/static/img/logo-full.png";
  const tagline = t("footer.tagline");
  const instagram = "https://www.instagram.com/escential.collection/";
  const email = "escentialfragrance05@gmail.com";
  const footerStyle = {};

  return (
    <footer id="contact" data-testid="site-footer" style={footerStyle} className="border-t border-[#8B5E3C]/10">
      {/* Main footer content */}
      <div className="px-6 md:px-12 lg:px-20 py-20 lg:py-28">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto">

          {/* Brand Section */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start mb-6">
              <img src={logoSrc} alt="Escential Fragrance" className="h-20 w-auto object-contain" />
            </div>
            <p className="text-sm leading-relaxed text-[#3B2618]/65 mb-8">
              {tagline}
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4">
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="p-3 text-[#3B2618]/70 hover:text-[#8B5E3C] hover:bg-[#8B5E3C]/5 rounded-full transition-all duration-300"
                  title="Follow on Instagram"
                >
                  <Instagram className="w-5 h-5" strokeWidth={1.5} />
                </a>
              )}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="p-3 text-[#3B2618]/70 hover:text-[#8B5E3C] hover:bg-[#8B5E3C]/5 rounded-full transition-all duration-300"
                title="Message on WhatsApp"
              >
                <WhatsAppIcon className="w-5 h-5" strokeWidth={1.5} />
              </a>
              {email && (
                <a
                  href={`mailto:${email}`}
                  aria-label="Email"
                  className="p-3 text-[#3B2618]/70 hover:text-[#8B5E3C] hover:bg-[#8B5E3C]/5 rounded-full transition-all duration-300"
                  title={`Email us at ${email}`}
                >
                  <Mail className="w-5 h-5" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>

          {/* Shop Section */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-[#3B2618] mb-8">
              {t("footer.shop_title")}
            </h3>
            <ul className="space-y-4">
              {shopLinks.map((l, i) => (
                <li key={i}>
                  <Link
                    to="/shop"
                    className="text-base text-[#3B2618]/70 hover:text-[#8B5E3C] transition-colors duration-200"
                  >
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information Section */}
          <div className="text-center md:text-left">
            <h3 className="text-sm font-semibold tracking-[0.25em] uppercase text-[#3B2618] mb-8">
              {t("footer.info_title")}
            </h3>
            <ul className="space-y-4">
              {infoLinks.map((l, i) => {
                const isFaq = l === "FAQ";
                if (isFaq) {
                  return (
                    <li key={i}>
                      <Link to="/faq" className="text-base text-[#3B2618]/70 hover:text-[#8B5E3C] transition-colors duration-200">
                        {l}
                      </Link>
                    </li>
                  );
                }
                if (i === infoLinks.length - 1) {
                  return (
                    <li key={i}>
                      <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-base text-[#3B2618]/70 hover:text-[#8B5E3C] transition-colors duration-200">
                        {l}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={i}>
                    <Link to="/about" className="text-base text-[#3B2618]/70 hover:text-[#8B5E3C] transition-colors duration-200">
                      {l}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom footer */}
      <div className="border-t border-[#8B5E3C]/10 px-6 md:px-12 lg:px-20 py-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 text-xs tracking-[0.22em] uppercase text-[#A68A72]">
        <span>© {new Date().getFullYear()} Escential Fragrance</span>
        <span className="hidden sm:inline text-[#8B5E3C]/30">•</span>
        <Link to="/privacy" className="hover:text-[#8B5E3C] transition-colors">Privacy Policy</Link>
        <span className="hidden sm:inline text-[#8B5E3C]/30">•</span>
        <span>{t("footer.rights")}</span>
      </div>
    </footer>
  );
};

export default Footer;
