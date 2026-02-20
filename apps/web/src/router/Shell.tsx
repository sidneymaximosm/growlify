import React from "react";
import { NavLink, Outlet } from "react-router-dom";

const items = [
  { to: "/inicio", label: "In\u00edcio" },
  { to: "/lancamentos", label: "Lan\u00e7amentos" },
  { to: "/diagnostico", label: "Diagn\u00f3stico" },
  { to: "/relatorios", label: "Relat\u00f3rios" },
  { to: "/perfil", label: "Perfil" }
];

export function AppShell() {
  return (
    <>
      <div className="container">
        <Outlet />
      </div>
      <nav className="navBottom" aria-label="Navega\u00e7\u00e3o principal">
        <div className="navItems">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) => `navLink ${isActive ? "navLinkActive" : ""}`}
            >
              <span>{i.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

