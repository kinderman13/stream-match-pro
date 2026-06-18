import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { tmdbOnboardingFeed } from "@/lib/tmdb.functions";
import { upsertRating, completeOnboarding, addInteraction } from "@/lib/user-data.functions";
import { Heart, Star, ThumbsDown, HelpCircle, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Item = {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  year: string;
  vote_average: number;
  overview?: string;
};

function Onboarding() {
  const router = useRouter();
  const feed = useServerFn(tmdbOnboardingFeed);
  const rate = useServerFn(upsertRating);
  const skip = useServerFn(addInteraction);
  const complete = useServerFn(completeOnboarding);
  

  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [exiting, setExiting] = useState<"like" | "pass" | null>(null);
  const [mediaType, setMediaType] = useState<"movie" | "tv" | null>(null);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState<number | null>(null);
  const [ratingAction, setRatingAction] = useState<"like" | "watched">("like");
  // Session memory: every item shown this session — never re-show.
  const sessionSeenRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);
  // Diversity: rotate sort + alternate movie/tv when no provider filter.
  const sortRotation = [
    "popularity.desc",
    "vote_average.desc",
    "primary_release_date.desc",
    "vote_count.desc",
    "primary_release_date.asc",
    "revenue.desc",
  ];

  useEffect(() => {
    let mt: "movie" | "tv" | null = null;
    try {
      const v = sessionStorage.getItem("streammatch:contentType");
      if (v === "movie" || v === "tv") mt = v;
    } catch {}
    if (!mt) { router.navigate({ to: "/choose" }); return; }
    setMediaType(mt);
    setCount(0);
    load(1, true, mt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(p: number, reset = false, mt?: "movie" | "tv") {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const useMt = mt ?? mediaType ?? undefined;
      const sortBy = sortRotation[(p - 1) % sortRotation.length];
      const exclude = Array.from(sessionSeenRef.current);
      const r = (await feed({ data: { page: p, mediaType: useMt ?? undefined, excludeIds: exclude, sortBy } })) as Item[];
      // Filter against in-flight session memory and shuffle a bit to avoid genre streaks.
      const fresh = r.filter((it) => {
        const k = `${it.media_type}:${it.id}`;
        if (sessionSeenRef.current.has(k)) return false;
        sessionSeenRef.current.add(k);
        return true;
      });
      // Light shuffle for diversity (Fisher-Yates on small batch).
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }
      setItems((prev) => (reset ? fresh : [...prev, ...fresh]));
      setPage(p + 1);
      // If we still didn't get enough, recurse one more time with next page.
      if (fresh.length < 5 && p < 30) {
        loadingRef.current = false;
        await load(p + 1, false, useMt);
        return;
      }
    } catch (e) { console.error(e); }
    finally { loadingRef.current = false; }
  }

  useEffect(() => {
    if (items.length - idx <= 3) load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const current = items[idx];
  const next = items[idx + 1];

  function openRating(action: "like" | "watched") {
    if (!current || busy) return;
    setRatingAction(action);
    setRatingValue(null);
    setRatingOpen(true);
  }

  async function confirmRating() {
    if (!current || busy) return;
    if (ratingValue === null) return;
    setBusy(true);
    const rating = ratingValue;
    try {
      await skip({ data: { tmdbId: current.id, mediaType: current.media_type, action: ratingAction } });
      await rate({ data: { tmdbId: current.id, mediaType: current.media_type, rating, source: "onboarding", title: current.title, posterPath: current.poster_path } });
      setCount((c) => c + 1);
    } catch (e) { console.error(e); }
    setRatingOpen(false);
    setExiting("like");
    setTimeout(() => { setIdx((i) => i + 1); setExiting(null); setBusy(false); }, 250);
  }



  async function handlePass(action: "dislike" | "skip" = "skip") {
    if (!current || busy) return;
    setBusy(true);
    setExiting("pass");
    try {
      await skip({ data: { tmdbId: current.id, mediaType: current.media_type, action } });
      if (action === "dislike") {
        await rate({ data: { tmdbId: current.id, mediaType: current.media_type, rating: 2, source: "onboarding", title: current.title, posterPath: current.poster_path } });
      }
    } catch (e) { console.error(e); }
    setTimeout(() => { setIdx((i) => i + 1); setExiting(null); setBusy(false); }, 250);
  }

  async function finish() {
    if (count < 3) return;
    await complete({});
    router.navigate({ to: "/recommendations" });
  }


  // Drag handlers
  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, startX: e.clientX, startY: e.clientY });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    setDrag({ ...drag, x: e.clientX - drag.startX, y: e.clientY - drag.startY });
  }
  function onPointerUp() {
    if (!drag) return;
    const dx = drag.x;
    setDrag(null);
    if (dx > 120) openRating("like");
    else if (dx < -120) handlePass();
  }

  const dx = drag?.x ?? 0;
  const dy = drag?.y ?? 0;
  const rot = dx / 20;
  const likeOpacity = Math.min(1, Math.max(0, dx / 120));
  const passOpacity = Math.min(1, Math.max(0, -dx / 120));

  const transform = exiting === "like"
    ? "translate(120%, -10%) rotate(20deg)"
    : exiting === "pass"
    ? "translate(-120%, -10%) rotate(-20deg)"
    : `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Curta o que você gostaria de ver</h1>
          <p className="text-xs text-muted-foreground">Conteúdos qualificados nesta sessão: <span className="font-bold text-foreground">{count} de 3</span></p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">Apenas 👍 Gostei e 👀 Já assisti contam para liberar recomendações.</p>
        </div>
        <div className="text-right text-sm">
          <div className={count >= 3 ? "text-2xl font-black text-success" : "text-2xl font-black text-primary"}>{count}</div>
          <div className="text-xs text-muted-foreground">/ 3</div>
        </div>
      </div>

      <div className="relative mx-auto mt-6 aspect-[2/3] w-full max-w-sm flex-1">
        {!current && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-border bg-card text-sm text-muted-foreground">
            Carregando títulos...
          </div>
        )}

        {next && (
          <Card item={next} style={{ transform: "scale(0.95) translateY(12px)", opacity: 0.7 }} />
        )}

        {current && (
          <Card
            item={current}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform,
              transition: drag ? "none" : "transform 250ms ease-out",
              touchAction: "none",
              cursor: drag ? "grabbing" : "grab",
            }}
            overlay={
              <>
                <div className="pointer-events-none absolute left-4 top-4 rotate-[-12deg] rounded-md border-4 border-success px-3 py-1 text-2xl font-black text-success" style={{ opacity: likeOpacity }}>
                  GOSTEI
                </div>
                <div className="pointer-events-none absolute right-4 top-4 rotate-[12deg] rounded-md border-4 border-destructive px-3 py-1 text-2xl font-black text-destructive" style={{ opacity: passOpacity }}>
                  PASSAR
                </div>
              </>
            }
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={() => handlePass("dislike")}
          disabled={!current || busy}
          aria-label="Não gostei"
          title="Não gostei"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive bg-card text-destructive shadow-lg transition hover:scale-110 disabled:opacity-40"
        >
          <ThumbsDown className="h-6 w-6" />
        </button>
        <button
          onClick={() => openRating("watched")}
          disabled={!current || busy}
          aria-label="Já assisti"
          title="Já assisti"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-blue-500 bg-card text-blue-500 shadow-lg transition hover:scale-110 disabled:opacity-40"
        >
          <Eye className="h-6 w-6" />
        </button>
        <button
          onClick={() => handlePass("skip")}
          disabled={!current || busy}
          aria-label="Não assisti"
          title="Não assisti"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-lg transition hover:scale-110 hover:text-foreground disabled:opacity-40"
        >
          <HelpCircle className="h-6 w-6" />
        </button>
        <button
          onClick={() => openRating("like")}
          disabled={!current || busy}
          aria-label="Gostei"
          title="Gostei"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-xl transition hover:scale-110 disabled:opacity-40"
        >
          <Heart className="h-7 w-7" fill="currentColor" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span className="w-14 text-center">Não gostei</span>
        <span className="w-14 text-center">Já assisti</span>
        <span className="w-14 text-center">Não assisti</span>
        <span className="w-16 text-center">Gostei</span>
      </div>

      {ratingOpen && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="text-sm text-muted-foreground">
              {ratingAction === "watched" ? "Você assistiu" : "Você gostou de"}
            </div>
            <div className="text-lg font-bold">{current.title}</div>
            <div className="mt-4 text-sm font-semibold">Qual nota você daria para este conteúdo?</div>
            <div className="mt-1 text-xs text-muted-foreground">A nota é obrigatória.</div>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRatingValue(n)}
                  className={`h-10 rounded-md border text-sm font-bold transition ${
                    ratingValue === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary text-foreground hover:border-primary/60"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              disabled={busy || ratingValue === null}
              onClick={confirmRating}
              className="mt-5 w-full rounded-md bg-primary px-3 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {ratingValue === null ? "Escolha uma nota" : "Salvar nota e avançar"}
            </button>
          </div>
        </div>
      )}



      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          disabled={count < 3}
          onClick={finish}
          className="w-full rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
        >
          GERAR RECOMENDAÇÕES
        </button>
        <div className="text-xs text-muted-foreground">
          {count < 3 ? `Faltam ${3 - count} curtidas para liberar` : "Pronto! Toque para receber suas recomendações."}
        </div>
      </div>
    </div>
  );
}

function Card({
  item,
  style,
  overlay,
  ...handlers
}: {
  item: Item;
  style?: React.CSSProperties;
  overlay?: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const bg = item.backdrop_path || item.poster_path;
  const src = bg ? `https://image.tmdb.org/t/p/w780${bg}` : null;
  return (
    <div
      {...handlers}
      style={style}
      className="absolute inset-0 select-none overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      {src ? (
        <img src={src} alt={item.title} draggable={false} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">{item.title}</div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 text-white">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
          <span className="rounded bg-white/20 px-1.5 py-0.5">{item.media_type === "movie" ? "Filme" : "Série"}</span>
          {item.year && <span>{item.year}</span>}
          <span className="ml-auto flex items-center gap-1">
            <Star className="h-3 w-3" fill="currentColor" /> {item.vote_average.toFixed(1)}
          </span>
        </div>
        <div className="mt-1 text-xl font-bold leading-tight">{item.title}</div>
        {item.overview && <p className="mt-1 line-clamp-2 text-xs opacity-80">{item.overview}</p>}
      </div>
      {overlay}
    </div>
  );
}
