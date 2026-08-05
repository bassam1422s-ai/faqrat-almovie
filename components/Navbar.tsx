"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, User, X } from "lucide-react";
import { useParticipants } from "@/hooks/useParticipants";
import { clearStoredParticipant, storeParticipant } from "@/lib/participant";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { NamePicker } from "./NamePicker";

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/rating", label: "فقرة التقييم" },
  { href: "/archive", label: "الأرشيف" },
  { href: "/stats", label: "الإحصائيات" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const { participants } = useParticipants();
  const { participant, refresh } = useCurrentParticipant();

  return (
    <>
      <nav className="relative z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 md:py-6">
        <Link
          href="/"
          className="animate-blur-fade-up text-lg font-semibold tracking-tight md:text-xl"
        >
          فقرة الموفي
        </Link>

        <div className="hidden items-center gap-6 text-sm lg:flex">
          {LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="animate-blur-fade-up text-gray-300 transition-colors hover:text-white"
              style={{ animationDelay: `${100 + i * 50}ms` }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <button
            onClick={() => setSwitcherOpen((v) => !v)}
            className="animate-blur-fade-up liquid-glass flex h-10 w-10 items-center justify-center rounded-full"
            style={{ animationDelay: "400ms" }}
            aria-label="تبديل المستخدم"
          >
            <User size={18} />
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="animate-blur-fade-up liquid-glass flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
            style={{ animationDelay: "350ms" }}
            aria-label="القائمة"
          >
            {mobileOpen ? (
              <X size={18} className="transition-transform duration-500" />
            ) : (
              <Menu size={18} className="transition-transform duration-500" />
            )}
          </button>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full sm:hidden"
          aria-label="القائمة"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <div
        className={`absolute inset-x-4 top-[72px] z-40 rounded-2xl border-t border-b border-white/10 bg-black/90 shadow-2xl backdrop-blur-lg transition-all duration-500 ease-out lg:hidden ${
          mobileOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-4 opacity-0"
        }`}
      >
        <div className="flex flex-col p-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-3 text-gray-200 hover:bg-white/5"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMobileOpen(false);
              setSwitcherOpen(true);
            }}
            className="mt-1 rounded-lg border-t border-white/10 px-3 py-3 text-right text-gray-200 hover:bg-white/5 sm:hidden"
          >
            {participant ? `أنت: ${participant.name}` : "اختر اسمك"}
          </button>
        </div>
      </div>

      {switcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="liquid-glass w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">مين أنت؟</h2>
              <button onClick={() => setSwitcherOpen(false)} aria-label="إغلاق">
                <X size={20} />
              </button>
            </div>
            <NamePicker
              participants={participants}
              onSelect={(p) => {
                storeParticipant(p.id, p.name);
                refresh();
                setSwitcherOpen(false);
              }}
            />
            {participant && (
              <button
                onClick={() => {
                  clearStoredParticipant();
                  refresh();
                  setSwitcherOpen(false);
                }}
                className="mt-4 w-full text-center text-sm text-gray-400 hover:text-white"
              >
                مسح الاختيار الحالي
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
