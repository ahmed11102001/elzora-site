"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

type MobileNavProps = {
  items: { href: string; label: string }[];
  label: string;
  closeLabel: string;
};

// Shown below the md breakpoint. Header renders it only when there are nav items.
export function MobileNav({ items, label, closeLabel }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
        className="-m-1 rounded-full p-1 text-sand hover:text-gold"
      >
        <Menu className="size-6" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={label} closeLabel={closeLabel}>
        <nav aria-label={label}>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-lg hover:bg-sand/10"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Modal>
    </div>
  );
}
