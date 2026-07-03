import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
    <p className="text-[11px] tracking-[0.3em] uppercase text-[#8B5E3C] mb-4">404</p>
    <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3B2618] mb-4">
      Page not found
    </h1>
    <div className="w-10 h-px bg-[#8B5E3C]/40 mx-auto my-6" />
    <p className="text-[#3B2618]/60 text-sm mb-10">
      The page you are looking for does not exist or has been removed.
    </p>
    <Link
      to="/"
      className="border border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#8B5E3C] hover:text-[#F9F6F0] transition-colors px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase"
    >
      Back to home
    </Link>
  </main>
);

export default NotFound;
