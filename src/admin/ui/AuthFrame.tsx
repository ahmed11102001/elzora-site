// Centered card used by sign-in, two-step verification and the "not authorized" page.
export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center font-display text-3xl tracking-[0.35em] text-ink">ELZORA</p>
        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          {description && <p className="mt-2 text-sm text-ink/65">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
