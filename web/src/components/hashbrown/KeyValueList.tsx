'use client';

export interface KeyValueListProps {
  heading: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export function KeyValueList({ heading, items }: KeyValueListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-4 ring-1 ring-inset ring-white/5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-white/60">{heading}</h4>
      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col gap-1 rounded-lg bg-slate-900/70 p-3 ring-1 ring-white/5"
          >
            <dt className="text-xs uppercase tracking-wide text-white/40">{item.label}</dt>
            <dd className="text-white/85 break-words">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
