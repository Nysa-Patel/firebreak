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
      <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 h-16 flex items-center gap-2 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[19px] shrink-0 font-display font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          <FlameIcon />
          <span className="hidden sm:inline">Firebreak</span>
        </Link>
        <div className="relative flex-1 min-w-0">
          <nav
            className="flex items-center gap-1 text-sm overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2.5 sm:px-3.5 py-1.5 rounded-full transition-colors shrink-0 whitespace-nowrap"
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
          {/* Hints that the nav scrolls horizontally when links overflow the viewport */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 bottom-0 w-6"
            style={{ background: "linear-gradient(to right, transparent, var(--background))" }}
          />
        </div>
        <div className="shrink-0">
          <LocationPicker />
        </div>
      </div>
    </header>
  );
}
