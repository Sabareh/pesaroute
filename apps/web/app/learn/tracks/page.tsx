"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import {
  TRACK_CATEGORY_ORDER,
  TRACK_FILTER_CHIPS,
  learningApi,
  matchesFilter,
  trackCategory,
  type TrackListItem
} from "../../lib/learning";
import { Chip } from "../ui";

export default function TracksPage() {
  const { token, ready } = useAuth();
  const [tracks, setTracks] = useState<TrackListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!ready) return;
    let active = true;
    learningApi
      .tracks(token)
      .then((data) => active && setTracks(data))
      .catch(() => active && setTracks([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  const filtered = useMemo(() => tracks.filter((track) => matchesFilter(track, filter)), [tracks, filter]);
  const grouped = useMemo(() => {
    const map = new Map<string, TrackListItem[]>();
    for (const track of filtered) {
      const category = trackCategory(track);
      map.set(category, [...(map.get(category) || []), track]);
    }
    return map;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageBanner accent="blue" badge="Guided paths" art="layers"
        eyebrow="Investment literacy tracks"
        title="Tracks"
        description="Guided paths for Kenyan investment decisions. Each track connects lessons to practice, simulations, journaling, and review."
      />

      <div className="flex flex-wrap gap-2">
        {TRACK_FILTER_CHIPS.map((chip) => (
          <Chip key={chip.key} active={filter === chip.key} label={chip.label} onClick={() => setFilter(chip.key)} />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-textSecondary">Loading tracks…</p>
      ) : filtered.length === 0 ? (
        <PremiumCard className="text-center">
          <p className="text-sm text-textSecondary">No tracks match this filter yet.</p>
        </PremiumCard>
      ) : (
        TRACK_CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => (
          <section key={category}>
            <h2 className="text-sm font-semibold uppercase text-textTertiary">{category}</h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {(grouped.get(category) || []).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function TrackCard({ track }: { track: TrackListItem }) {
  return (
    <Link
      href={`/learn/tracks/${track.slug}`}
      className="flex h-full flex-col rounded-lg border border-border bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-borderStrong"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-textTertiary capitalize">{track.level}</p>
        {track.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
      </div>
      <h3 className="mt-2 text-lg font-semibold tracking-[-0.01em]">{track.title}</h3>
      <p className="mt-1 flex-1 text-sm leading-6 text-textSecondary">{track.description}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-textTertiary">
        <span>{track.course_count} course{track.course_count === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>{track.lesson_count} lesson{track.lesson_count === 1 ? "" : "s"}</span>
        <span>·</span>
        <span>~{track.estimated_minutes} min</span>
        <span>·</span>
        <span className="capitalize">{track.target_user_type.replace(/_/g, " ")}</span>
      </div>
      <span className="mt-4 inline-block text-sm font-semibold text-emerald">View details →</span>
    </Link>
  );
}
