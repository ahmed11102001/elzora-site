"use client";

// A submit button that asks "are you sure?" first. Used for archive and delete, which live in plain
// server-action forms (so they work without the editor's client state).
export function ConfirmButton({
  message,
  className,
  children,
}: {
  message: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
