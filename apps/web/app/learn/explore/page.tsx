"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageBanner, PremiumCard, TrustBadge } from "../../components/maliprime";
import { useAuth } from "../../lib/auth";
import {
  TRACK_FILTER_CHIPS,
  learningApi,
  matchesFilter,
  type AssessmentListItem,
  type LearningResource,
  type PracticeSetListItem,
  type TrackListItem
} from "../../lib/learning";
import { Chip } from "../ui";

function SectionHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase text-textTertiary">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-emerald underline">
        {cta}
      </Link>
    </div>
  );
}

export default function ExplorePage() {
  const { token, ready } = useAuth();
  const [tracks, setTracks] = useState<TrackListItem[]>([]);
  const [practice, setPractice] = useState<PracticeSetListItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentListItem[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    Promise.all([
      learningApi.tracks(token).catch(() => []),
      learningApi.practiceList(token).catch(() => []),
      learningApi.assessments(token).catch(() => []),
      learningApi.resources(token).catch(() => [])
    ])
      .then(([t, p, a, r]) => {
        if (!active) return;
        setTracks(t);
        setPractice(p);
        setAssessments(a);
        setResources(r);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [ready, token]);

  const recommended = useMemo(() => tracks.filter((track) => matchesFilter(track, filter)).slice(0, 4), [tracks, filter]);

  if (loading) return <p className="text-sm text-textSecondary">Loading…</p>;

  return (
    <div className="space-y-8">
      <PageBanner accent="blue" badge="All learning" art="layers"
        eyebrow="Explore"
        title="Learn index"
        description="Tracks, practice, assessments, resources, and apply-with-simulation in one place."
      />

      <div className="flex flex-wrap gap-2">
        {TRACK_FILTER_CHIPS.map((chip) => (
          <Chip key={chip.key} active={filter === chip.key} label={chip.label} onClick={() => setFilter(chip.key)} />
        ))}
      </div>

      <section>
        <SectionHeader title="Recommended for you" href="/learn/tracks" cta="All tracks" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {recommended.map((track) => (
            <Link key={track.id} href={`/learn/tracks/${track.slug}`} className="rounded-lg border border-border bg-surface p-4 transition hover:border-borderStrong">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-textTertiary capitalize">{track.level}</p>
                {track.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
              </div>
              <p className="mt-1 text-base font-semibold">{track.title}</p>
              <p className="mt-1 text-sm text-textSecondary">{track.lesson_count} lessons · ~{track.estimated_minutes} min</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Practice" href="/learn/practice" cta="All practice" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {practice.slice(0, 3).map((set) => (
            <Link key={set.id} href={`/learn/practice/${set.id}`} className="rounded-lg border border-border bg-surface p-4 transition hover:border-borderStrong">
              <p className="text-sm font-semibold">{set.title}</p>
              <p className="mt-1 text-xs text-textTertiary">{set.question_count} questions · {set.xp_reward} XP</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Assessments" href="/learn/assessments" cta="All assessments" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {assessments.slice(0, 4).map((assessment) => (
            <Link key={assessment.id} href={`/learn/assessments/${assessment.slug}`} className="rounded-lg border border-border bg-surface p-4 transition hover:border-borderStrong">
              <p className="text-sm font-semibold">{assessment.title}</p>
              <p className="mt-1 text-xs text-textTertiary">{assessment.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Resources" href="/learn/resources" cta="All resources" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {resources.slice(0, 3).map((resource) => (
            <div key={resource.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase text-textTertiary">{resource.resource_type.replace(/_/g, " ")}</p>
              <p className="mt-1 text-sm font-semibold">{resource.title}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Apply with simulations" href="/simulate" cta="Open simulator" />
        <PremiumCard className="mt-3">
          <p className="text-sm text-textSecondary">
            Compare products and run educational simulations with the latest source-linked rates. Then save a private
            reflection and request professional review if needed.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/simulate" className="text-sm font-semibold text-emerald underline">Compare &amp; simulate</Link>
            <Link href="/product-passports" className="text-sm font-semibold text-emerald underline">Product passports</Link>
            <Link href="/professional/dashboard" className="text-sm font-semibold text-emerald underline">Professional review</Link>
          </div>
        </PremiumCard>
      </section>
    </div>
  );
}
