import React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

const ProtectedRoute = ({ children }) => {
  const { token } = useApp();
  if (!token) return <Navigate to="/admin/login" replace />;
  return children;
};

export default ProtectedRoute;
