import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href: string;
  variant?: "primary" | "ghost";
  size?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-colors";
const variants = {
  primary: "bg-accent text-on-accent hover:bg-accent-strong",
  ghost: "border border-fg/50 text-fg hover:border-accent hover:text-accent",
};
const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-base" };

export function Button({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: ButtonProps) {
  const classes = cn(base, variants[variant], sizes[size], className);
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
