import { useState } from "react";

interface Props {
  open: boolean;
  title: string;
  initial?: number;
  onClose: () => void;
  onSubmit: (rating: number) => void;
}

export function RatingDialog({ open, title, initial, onClose, onSubmit }: Props) {
  const [value, setValue] = useState<number>(initial ?? 8);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">Que nota você dá?</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{title}</p>
        <div className="mt-6 text-center">
          <div className="text-5xl font-black text-primary">{value.toFixed(1)}</div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="mt-4 w-full accent-[color:var(--color-primary)]"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>0</span><span>5</span><span>10</span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-md border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
            Cancelar
          </button>
          <button onClick={() => onSubmit(value)} className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
