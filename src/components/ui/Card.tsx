import { cn } from "@/lib/utils";

export function Card({ className, children, ...rest }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("overflow-hidden rounded-2xl border border-fg/10 bg-card", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}
