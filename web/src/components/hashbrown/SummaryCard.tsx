'use client';

import clsx from 'clsx';

export interface SummaryCardProps {
  title: string;
  body: string;
  tone?: 'success' | 'info' | 'warning' | 'danger';
}

const toneStyles: Record<NonNullable<SummaryCardProps['tone']>, string> = {
  success: 'border-emerald-500/80 bg-emerald-500/10 text-emerald-100',
  info: 'border-sky-500/80 bg-sky-500/10 text-sky-100',
  warning: 'border-amber-500/80 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-500/80 bg-rose-500/10 text-rose-100',
};

export function SummaryCard({ title, body, tone = 'info' }: SummaryCardProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-2 rounded-xl border p-4 shadow-sm ring-1 ring-inset ring-white/5 backdrop-blur',
        toneStyles[tone],
      )}
    >
      <h3 className="text-lg font-semibold leading-tight text-white/90">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{body}</p>
    </div>
  );
}
