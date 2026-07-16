"use client";

import { useEffect, useState } from "react";

const navigationItems = [
  { id: "summary", label: "Resumo do mês" },
  { id: "dashboard", label: "Dashboard" },
  { id: "expense-form", label: "Nova despesa" },
  { id: "expenses", label: "Despesas" },
  { id: "management", label: "Gestão" },
] as const;

export function SideNavigation() {
  const [activeId, setActiveId] = useState<(typeof navigationItems)[number]["id"]>("summary");

  useEffect(() => {
    const sections = navigationItems
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visibleSection) setActiveId(visibleSection.target.id as (typeof navigationItems)[number]["id"]);
      },
      { rootMargin: "-18% 0px -62%", threshold: [0.1, 0.5, 0.9] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="side-navigation" aria-label="Navegação da página">
      <p className="side-navigation-label">Navegação</p>
      <div className="side-navigation-links">
        {navigationItems.map((item) => (
          <a
            aria-current={activeId === item.id ? "location" : undefined}
            className={activeId === item.id ? "active" : undefined}
            href={`#${item.id}`}
            key={item.id}
            onClick={() => setActiveId(item.id)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
