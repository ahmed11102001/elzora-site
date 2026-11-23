"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function ModalDemo({ closeLabel }: { closeLabel: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-strong"
      >
        Open modal
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Modal title" closeLabel={closeLabel}>
        <p className="mb-5 text-fg/80">
          Built on the native dialog element: Escape closes it and focus stays inside.
        </p>
        <Button href="#" size="sm">
          Action
        </Button>
      </Modal>
    </>
  );
}
