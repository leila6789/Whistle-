"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Mark } from "@/components/rich-text";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Games" },
  { href: "/learn", label: "Rules" },
  { href: "/stats", label: "Stats" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-16">
      <header className="flex items-center justify-between border-b border-[#1c140c]/25 py-3">
        <Link href="/" className="font-display flex items-center gap-2 text-2xl font-semibold uppercase tracking-wide">
          <Mark />
          Whistle
        </Link>
        <nav className="flex items-center gap-4 font-display text-sm uppercase tracking-wide">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 pb-0.5",
                  active ? "border-[#1c140c]" : "border-transparent text-[#1c140c]/60 hover:text-[#1c140c]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
