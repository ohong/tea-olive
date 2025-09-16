'use client';

export interface NoteProps {
  text: string;
}

export function Note({ text }: NoteProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4 text-sm leading-relaxed text-white/75">
      {text}
    </div>
  );
}
