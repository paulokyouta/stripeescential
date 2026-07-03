import React from "react";

// Thin outline WhatsApp icon — matches lucide-react stroke style
const WhatsAppIcon = ({ className = "w-5 h-5", strokeWidth = 1.5 }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <path d="M8.5 9.5c0 .5.2 1.4.8 2.2A8.3 8.3 0 0 0 12.5 14.7c.8.6 1.7.8 2.2.8a2 2 0 0 0 1.4-.6c.2-.2.4-.5.4-.7 0-.2-.1-.4-.3-.5l-1.7-.9c-.2-.1-.4 0-.5.2l-.5.7c-.1.1-.3.2-.4.1-.5-.2-1.3-.7-1.8-1.2-.5-.5-1-1.3-1.2-1.8-.1-.1 0-.3.1-.4l.7-.5c.2-.1.3-.3.2-.5l-.9-1.7c-.1-.2-.3-.3-.5-.3-.2 0-.5.1-.7.4a2 2 0 0 0-.6 1.4z" />
  </svg>
);

export default WhatsAppIcon;
