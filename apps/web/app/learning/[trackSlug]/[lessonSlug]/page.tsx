import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, FileText, ShieldCheck, TriangleAlert, type LucideIcon } from "lucide-react";
import {
  AppleLikeNav,
  AppShell,
  PageShell,
  PremiumCard,
  SectionHeader,
  TrustBadge
} from "../../../components/maliprime";
import { allLessons, findLesson, relatedPassportHref } from "../../content";

export function generateStaticParams() {
  return allLessons().map(({ pack, lesson }) => ({
    lessonSlug: lesson.slug,
    trackSlug: pack.track.slug
  }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ lessonSlug: string; trackSlug: string }>;
}): Promise<Metadata> {
  const { lessonSlug, trackSlug } = await params;
  const entry = findLesson(trackSlug, lessonSlug);
  if (!entry) {
    return { title: "Learning Lesson | PesaRoute" };
  }
  return {
    description: entry.lesson.summary,
    title: `${entry.lesson.title} | PesaRoute Learning`
  };
}

export default async function LearningLessonPage({
  params
}: {
  params: Promise<{ lessonSlug: string; trackSlug: string }>;
}) {
  const { lessonSlug, trackSlug } = await params;
  const entry = findLesson(trackSlug, lessonSlug);
  if (!entry) {
    notFound();
  }
  const { lesson, pack } = entry;
  const isThin = !lesson.introduction || lesson.sections.length < 3;
  const sourceConfidence = sourceConfidenceLabel(lesson.sources);

  return (
    <AppShell>
      <AppleLikeNav />
      <PageShell className="max-w-4xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-textSecondary transition hover:text-textPrimary"
          href="/learning"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Learning
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <SectionHeader eyebrow={pack.track.title} title={lesson.title} body={lesson.summary} />
          <div className="mt-5 flex flex-wrap gap-2">
            <TrustBadge tone="muted">{lesson.lesson_type.replace(/_/g, " ")}</TrustBadge>
            <TrustBadge tone="muted">{lesson.estimated_minutes} min</TrustBadge>
            <TrustBadge tone="emerald">{lesson.xp_reward} XP</TrustBadge>
            <TrustBadge tone={pack.track.is_premium ? "amber" : "muted"}>
              {pack.track.is_premium ? "Premium placeholder" : "Free"}
            </TrustBadge>
          </div>
        </header>

        {isThin ? (
          <PremiumCard className="mt-8">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Content coming soon</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              This lesson is being reviewed. Try another lesson or check the related resource.
            </p>
          </PremiumCard>
        ) : (
          <article className="mt-8 grid gap-4">
            <LessonPanel icon={BookOpen} title="Introduction">
              <p>{lesson.introduction}</p>
            </LessonPanel>

            {lesson.sections.map((section, index) => (
              <LessonPanel icon={BookOpen} key={section} title={`Teaching section ${index + 1}`}>
                <p>{section}</p>
              </LessonPanel>
            ))}

            <LessonPanel icon={FileText} title={lesson.scenario.title} tone="alt">
              <p>{lesson.scenario.text}</p>
            </LessonPanel>

            <LessonPanel icon={TriangleAlert} title="Mistake to avoid" tone="warning">
              <p>{lesson.mistake}</p>
            </LessonPanel>

            <LessonPanel icon={CheckCircle2} title="Action step">
              <p>{lesson.action}</p>
            </LessonPanel>

            <LessonPanel icon={ShieldCheck} title="Key takeaway" tone="success">
              <p>{lesson.takeaway}</p>
            </LessonPanel>
          </article>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <PremiumCard>
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Sources and review notes</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{lesson.source_note}</p>
            <p className="mt-3 text-sm leading-6 text-textSecondary">Source keys: {lesson.sources.join(", ")}</p>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Source confidence: {sourceConfidence}. Freshness: verify current terms with the named official or
              provider source before moving money. Review frequency: every 90 days or sooner after official source
              changes.
            </p>
          </PremiumCard>
          <PremiumCard>
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Related route</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Compare the related product passport, then verify current details with official sources and licensed
              professionals where needed.
            </p>
            <Link
              className="mt-5 inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-textPrimary transition hover:border-textTertiary"
              href={relatedPassportHref(pack.track.slug)}
            >
              Related product passport
            </Link>
          </PremiumCard>
        </section>
      </PageShell>
    </AppShell>
  );
}

function sourceConfidenceLabel(sources: string[]) {
  const hasOfficial = sources.some((source) =>
    ["cbk", "cma", "kra", "nse", "rba", "sasra"].some((prefix) => source.startsWith(prefix))
  );
  const hasEditorial = sources.some((source) => source.includes("editorial"));
  if (hasOfficial && hasEditorial) {
    return "official and editorial source mix";
  }
  if (hasOfficial) {
    return "official public sources";
  }
  if (hasEditorial) {
    return "PesaRoute editorial explanation";
  }
  return "source-linked lesson";
}

function LessonPanel({
  children,
  icon: Icon,
  title,
  tone = "default"
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
  tone?: "alt" | "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50"
        : tone === "alt"
          ? "bg-surfaceSubtle"
          : "";

  return (
    <PremiumCard className={toneClass}>
      <Icon className="h-5 w-5 text-textTertiary" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="mt-3 text-sm leading-7 text-textSecondary">{children}</div>
    </PremiumCard>
  );
}
