"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function FlameIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c1 1 2 2.5 2 4.5A5.5 5.5 0 0 1 11.5 20 6 6 0 0 1 6 14c0-4 3-5 3-8 1 1 2 2 2 3 0-3-1-5.5 1-7Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Your risk" },
  { href: "/map", label: "Coverage map" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-10 backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--background) 88%, transparent)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-[15px] shrink-0">
          <FlameIcon />
          <span>Wildfire Risk</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-full transition-colors"
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  background: active ? "var(--surface-2)" : "transparent",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
