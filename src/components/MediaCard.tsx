interface Props {
  posterPath: string | null;
  title: string;
  year?: string;
  voteAverage?: number;
  selected?: boolean;
  badge?: string;
  onClick?: () => void;
}

export function MediaCard({ posterPath, title, year, voteAverage, selected, badge, onClick }: Props) {
  const src = posterPath ? `https://image.tmdb.org/t/p/w342${posterPath}` : null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full overflow-hidden rounded-lg border text-left transition poster-shadow ${
        selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-foreground/40"
      }`}
    >
      <div className="relative aspect-[2/3] w-full bg-secondary">
        {src ? (
          <img src={src} alt={title} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {title}
          </div>
        )}
        {selected && (
          <div className="absolute right-2 top-2 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">✓</div>
        )}
        {badge && (
          <div className="absolute left-2 top-2 rounded-md bg-match/90 px-2 py-0.5 text-xs font-bold text-black">{badge}</div>
        )}
        {typeof voteAverage === "number" && voteAverage > 0 && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            ★ {voteAverage.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-2">
        <div className="line-clamp-1 text-sm font-medium text-foreground">{title}</div>
        {year && <div className="text-xs text-muted-foreground">{year}</div>}
      </div>
    </button>
  );
}
