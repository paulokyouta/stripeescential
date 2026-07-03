import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import { toast } from "sonner";

const LOGO = "/static/img/logo-full.png";

const AdminLogin = () => {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome");
      nav("/admin");
    } catch (err) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main data-testid="admin-login-page" className="min-h-screen flex items-center justify-center px-6 bg-[#F9F6F0]">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex flex-col items-center mb-10">
          <img src={LOGO} alt="Escential Fragrance" className="h-28 w-auto object-contain" />
        </Link>
        <h1 className="font-serif-display text-3xl text-center mb-10">Sign in</h1>
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Email</label>
            <input
              data-testid="admin-email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-[#E0D3C3] py-3 outline-none focus:border-[#8B5E3C] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs tracking-luxe uppercase text-[#8B5E3C]">Password</label>
            <input
              data-testid="admin-password-input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full bg-transparent border-b border-[#E0D3C3] py-3 outline-none focus:border-[#8B5E3C] transition-colors"
            />
          </div>
          <button
            data-testid="admin-login-btn"
            disabled={loading}
            className="w-full mt-6 bg-[#8B5E3C] text-[#F9F6F0] py-4 text-xs tracking-luxe uppercase hover:bg-[#5C3A21] transition-colors disabled:opacity-60"
          >
            {loading ? "…" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
};

export default AdminLogin;
