"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LocationPicker } from "@/components/LocationPicker";

function FlameIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-5 3-8 1 1 2 2 2 3 0-3-1-5.5 1-7Z"
        fill="#f97316"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Your risk" },
  { href: "/map", label: "Coverage map" },
  { href: "/trends", label: "Trends" },
  { href: "/ask", label: "Ask" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-10 backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--background) 85%, transparent)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 h-16 flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[19px] shrink-0 font-display font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          <FlameIcon />
          <span>Firebreak</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full transition-colors"
                style={{
                  color: active ? "#111827" : "var(--text-secondary)",
                  background: active ? "#e5e7eb" : "transparent",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <LocationPicker />
      </div>
    </header>
  );
}
