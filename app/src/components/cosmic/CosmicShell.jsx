import React from "react";
import "../../syncspace-cosmic.css";
export default function CosmicShell({ children }) {
  return (
    <div className="cosmic-shell">
      <div className="cosmic-ambient" aria-hidden="true" />
      <div className="cosmic-page-enter">
        {children}
      </div>
    </div>
  );
}