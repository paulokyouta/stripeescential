import React from "react";
import { Render } from "@measured/puck";
import { useApp } from "../contexts/AppContext";
import { puckConfig } from "../lib/puck.config";
import { homeDefaultFor } from "../lib/home.default";

const Home = () => {
  const { lang } = useApp();

  // Home fixa em código (não editável no Puck) -> render imediato, sem esperar settings.
  const data = homeDefaultFor(lang);

  // key força re-render do Render do Puck ao mudar de idioma
  return <Render key={lang} config={puckConfig} data={data} />;
};

export default Home;
