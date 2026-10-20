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
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Mark />
          Whistle
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5",
                  active ? "bg-white/10 text-white" : "text-white/55 hover:text-white",
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
