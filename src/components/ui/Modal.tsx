"use client";

import { useEffect, useId, useRef } from "react";
import { Close } from "./icons";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  children: React.ReactNode;
};

// Built on the native <dialog>: focus trap, Escape to close and the backdrop come from the browser.
export function Modal({ open, onClose, title, closeLabel, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // click on the backdrop
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-sand/15 bg-ink p-0 text-sand backdrop:bg-ink-deep/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-4 border-b border-sand/10 px-5 py-4">
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="-m-1 rounded-full p-1 text-sand/80 hover:text-gold"
        >
          <Close className="size-6" />
        </button>
      </div>
      <div className="px-5 py-5">{children}</div>
    </dialog>
  );
}
