import { Plus } from "./icons";

export type AccordionItem = { id: string; question: string; answer: React.ReactNode };

// Native <details>: works without JavaScript and is keyboard accessible.
// Items that share a `name` behave as a group (opening one closes the others).
export function Accordion({ items, name }: { items: AccordionItem[]; name?: string }) {
  return (
    <div className="divide-y divide-fg/10 overflow-hidden rounded-2xl border border-fg/10">
      {items.map((item) => (
        <details key={item.id} name={name} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
            {item.question}
            <Plus className="size-5 shrink-0 text-accent transition-transform group-open:rotate-45 motion-reduce:transition-none" />
          </summary>
          <div className="px-5 pb-5 leading-relaxed text-fg/80">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
