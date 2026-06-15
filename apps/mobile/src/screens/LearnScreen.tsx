import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type {
  BillingEntitlementSnapshot,
  LearningCourseApiResponse,
  LearningHomeApiResponse,
  LearningLessonApiResponse,
  LearningLibraryApiResponse,
  LearningProgressSummaryApiResponse,
  LearningProgressApiResponse,
  LearningResourceApiResponse,
  LearningTrackApiResponse,
  PesaRouteApiClient
} from "../api/client";
import {
  EmptyState,
  ErrorState,
  HeroCard,
  LoadingState,
  PremiumCard,
  PrimaryButton,
  SecondaryButton,
  TrustBadge,
  maliPrime,
  maliPrimeText
} from "../components/maliprime";
import { mockLearningProgress, mockLearningResources, mockLearningTracks } from "../data/learningMockData";
import type { AuthCredentials } from "../types";
import type { JournalEntryDraft } from "../types";

type LearningPanel = "dashboard" | "explore" | "resources" | "library" | "progress";
type LearningSource = "api" | "cache" | "mock";

type Props = {
  apiClient: PesaRouteApiClient;
  auth: AuthCredentials | null;
  entitlements: BillingEntitlementSnapshot | null;
  isAuthenticated: boolean;
  onOpenJournal: () => void;
  onOpenPricing: () => void;
  onOpenProfessionals: () => void;
  onOpenScam: () => void;
  onOpenSimulators: (lesson?: { id: number; title: string } | null) => void;
  onRequestAuth: () => void;
  onSaveJournal: (entry: JournalEntryDraft) => void;
};

const filters = [
  "Beginner",
  "First salary",
  "SACCO/chama",
  "Global investing",
  "Land",
  "Scam defense",
  "Diaspora",
  "Swahili"
] as const;

const panels: Array<{ key: LearningPanel; label: string }> = [
  { key: "dashboard", label: "Today" },
  { key: "explore", label: "Explore" },
  { key: "resources", label: "Resources" },
  { key: "library", label: "Library" },
  { key: "progress", label: "Progress" }
];

const resourceTypeLabels: Record<LearningResourceApiResponse["resource_type"], string> = {
  cheat_sheet: "Cheat sheet",
  checklist: "Checklist",
  glossary: "Glossary",
  guide: "Guide",
  market_brief: "Market brief",
  tutorial: "Tutorial"
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatMinutes(minutes: number) {
  return minutes <= 0 ? "Self-paced" : `${minutes} min`;
}

function formatProgress(value: string | number | undefined) {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.round(numeric) : 0;
}

function lessonTypeLabel(lesson: LearningLessonApiResponse) {
  return lesson.lesson_type.replace(/_/g, " ");
}

function trackMatchesFilter(track: LearningTrackApiResponse, filter: string | null) {
  if (!filter) return true;
  const haystack = normalize(`${track.title} ${track.description} ${track.target_user_type}`);
  switch (filter) {
    case "Beginner":
      return track.level === "beginner";
    case "First salary":
      return haystack.includes("first") || haystack.includes("salary") || haystack.includes("jobber");
    case "SACCO/chama":
      return haystack.includes("sacco") || haystack.includes("chama");
    case "Global investing":
      return haystack.includes("global") || haystack.includes("etf") || haystack.includes("diaspora");
    case "Land":
      return haystack.includes("land");
    case "Scam defense":
      return haystack.includes("scam") || haystack.includes("red flag");
    case "Diaspora":
      return haystack.includes("diaspora");
    case "Swahili":
      return haystack.includes("swahili") || haystack.includes("general");
    default:
      return true;
  }
}

function getAllCourses(tracks: LearningTrackApiResponse[]) {
  return tracks.flatMap((track) => track.courses ?? []);
}

function findTrackByCourse(tracks: LearningTrackApiResponse[], course: LearningCourseApiResponse) {
  const trackId = typeof course.track === "number" ? course.track : course.track.id;
  return tracks.find((track) => track.id === trackId || track.slug === (typeof course.track === "number" ? "" : course.track.slug));
}

function courseTrackId(course: LearningCourseApiResponse, fallbackTrack?: LearningTrackApiResponse | null) {
  return typeof course.track === "number" ? course.track : course.track.id || fallbackTrack?.id;
}

function progressForTrack(track: LearningTrackApiResponse, progress: LearningProgressApiResponse) {
  const courseProgress = progress.courses.filter((course) => course.track_slug === track.slug);
  if (courseProgress.length > 0) {
    const sum = courseProgress.reduce((total, course) => total + formatProgress(course.percent_complete), 0);
    return Math.round(sum / courseProgress.length);
  }
  const lessonCount = track.lesson_count ?? track.courses?.reduce((total, course) => total + course.lessons.length, 0) ?? 0;
  if (lessonCount <= 0) return 0;
  const completed = progress.lessons.filter((lesson) => lesson.track_slug === track.slug && lesson.status === "completed").length;
  return Math.round((completed / lessonCount) * 100);
}

function generatedQuiz(lesson: LearningLessonApiResponse) {
  return {
    prompt: `Before acting on "${lesson.title}", what should you check first?`,
    options: [
      "Goal, risk, liquidity, provider, and fees",
      "The highest quoted return only",
      "Whether friends are joining quickly",
      "How fast the pitch asks for money"
    ],
    answer: "Goal, risk, liquidity, provider, and fees",
    explanation: "A safe decision starts with fit, access to money, provider credibility, fees, and red flags."
  };
}

function flashcardForLesson(lesson: LearningLessonApiResponse) {
  return {
    front: lesson.title.includes("Risk") ? "Risk" : "Liquidity",
    back: lesson.title.includes("Risk")
      ? "The chance that the outcome is worse than expected, including loss, delay, or provider failure."
      : "How quickly and predictably you can access your money without breaking the plan.",
    example: "Emergency money usually needs higher liquidity than long-term investment money."
  };
}

export function LearnScreen({
  apiClient,
  auth,
  entitlements,
  isAuthenticated,
  onOpenJournal,
  onOpenPricing,
  onOpenProfessionals,
  onOpenScam,
  onOpenSimulators,
  onRequestAuth,
  onSaveJournal
}: Props) {
  const [tracks, setTracks] = useState<LearningTrackApiResponse[]>(mockLearningTracks);
  const [resources, setResources] = useState<LearningResourceApiResponse[]>(mockLearningResources);
  const [progress, setProgress] = useState<LearningProgressApiResponse>(mockLearningProgress);
  const [homeSummary, setHomeSummary] = useState<LearningHomeApiResponse | null>(null);
  const [librarySummary, setLibrarySummary] = useState<LearningLibraryApiResponse | null>(null);
  const [progressSummary, setProgressSummary] = useState<LearningProgressSummaryApiResponse | null>(null);
  const [source, setSource] = useState<LearningSource>("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<LearningPanel>("dashboard");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number] | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<LearningTrackApiResponse | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<LearningCourseApiResponse | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LearningLessonApiResponse | null>(null);
  const [selectedResource, setSelectedResource] = useState<LearningResourceApiResponse | null>(null);
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const cacheRef = useRef({ tracks: mockLearningTracks, resources: mockLearningResources });

  const premiumLearningEnabled = Boolean(entitlements?.features.premium_learning);
  const completedLessons = useMemo(
    () => new Set(progress.lessons.filter((lesson) => lesson.status === "completed").map((lesson) => lesson.lesson)),
    [progress.lessons]
  );

  const continueTrack = useMemo(() => {
    const courseProgress = progress.courses.find((course) => course.percent_complete !== "100.00");
    if (courseProgress) {
      return tracks.find((track) => track.slug === courseProgress.track_slug) ?? tracks[0];
    }
    return tracks[0];
  }, [progress.courses, tracks]);

  const filteredTracks = useMemo(() => {
    const normalizedQuery = normalize(query);
    return tracks.filter((track) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        normalize(`${track.title} ${track.description} ${track.target_user_type}`).includes(normalizedQuery);
      return matchesSearch && trackMatchesFilter(track, activeFilter);
    });
  }, [activeFilter, query, tracks]);

  const libraryItems = useMemo(() => {
    return progress.courses.length > 0
      ? progress.courses
      : getAllCourses(tracks).slice(0, 3).map((course) => ({
          id: course.id,
          course: course.id,
          course_title: course.title,
          course_slug: course.slug,
          track_slug: findTrackByCourse(tracks, course)?.slug ?? "",
          percent_complete: "0.00",
          last_lesson: course.lessons[0]?.id ?? null,
          last_lesson_title: course.lessons[0]?.title ?? "",
          completed_at: null,
          updated_at: new Date().toISOString()
        }));
  }, [progress.courses, tracks]);

  const loadLearning = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [apiTracks, apiResources, apiHome] = await Promise.all([
        apiClient.learningTracks(),
        apiClient.learningResources(),
        apiClient.learningHome(auth)
      ]);
      cacheRef.current = {
        tracks: apiTracks.length > 0 ? apiTracks : mockLearningTracks,
        resources: apiResources.length > 0 ? apiResources : mockLearningResources
      };
      setTracks(cacheRef.current.tracks);
      setResources(cacheRef.current.resources);
      setHomeSummary(apiHome);
      setSource("api");
    } catch (loadError) {
      const hasCache = cacheRef.current.tracks.length > 0;
      setTracks(hasCache ? cacheRef.current.tracks : mockLearningTracks);
      setResources(hasCache ? cacheRef.current.resources : mockLearningResources);
      setSource(hasCache ? "cache" : "mock");
      setError(loadError instanceof Error ? loadError.message : "Learning catalog unavailable.");
    } finally {
      setLoading(false);
    }
  }, [apiClient, auth]);

  const loadProgress = useCallback(async () => {
    if (!auth || !isAuthenticated) {
      setProgress(mockLearningProgress);
      return;
    }
    try {
      const [myProgress, apiLibrary, apiProgressSummary] = await Promise.all([
        apiClient.learningMyProgress(auth),
        apiClient.learningLibrary(auth),
        apiClient.learningProgress(auth)
      ]);
      setProgress(myProgress);
      setLibrarySummary(apiLibrary);
      setProgressSummary(apiProgressSummary);
    } catch {
      setProgress((current) => current);
    }
  }, [apiClient, auth, isAuthenticated]);

  useEffect(() => {
    void loadLearning();
  }, [loadLearning]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  function backToTrack() {
    setSelectedLesson(null);
    setActionStatus(null);
    setQuizChoice(null);
    setQuizFeedback(null);
    setFlashcardRevealed(false);
  }

  async function openTrack(track: LearningTrackApiResponse) {
    setSelectedLesson(null);
    setSelectedCourse(null);
    setActionStatus(null);
    if (track.courses && track.courses.length > 0) {
      setSelectedTrack(track);
      setPanel("explore");
      return;
    }
    try {
      const detail = await apiClient.learningTrack(track.slug);
      setSelectedTrack(detail);
      setPanel("explore");
    } catch {
      setSelectedTrack(track);
      setPanel("explore");
    }
  }

  async function openLesson(course: LearningCourseApiResponse, lesson: LearningLessonApiResponse) {
    const locked = isLessonLocked(lesson);
    if (locked) {
      setActionStatus("This lesson is part of Premium. Core learning still stays free.");
      onOpenPricing();
      return;
    }
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setQuizChoice(null);
    setQuizFeedback(null);
    setFlashcardRevealed(false);
    setActionStatus(null);
    if (auth && isAuthenticated && source === "api") {
      try {
        await apiClient.startLearningLesson(lesson.id, auth);
        await loadProgress();
      } catch {
        setActionStatus("Progress will stay local until the API is reachable.");
      }
    }
  }

  function isLessonLocked(lesson: LearningLessonApiResponse) {
    return (lesson.locked || lesson.is_premium) && !premiumLearningEnabled;
  }

  async function completeLesson(lesson: LearningLessonApiResponse, score?: number) {
    if (!auth || !isAuthenticated || source !== "api") {
      setActionStatus("Nice. Log in when you want XP and progress saved to your account.");
      return;
    }
    try {
      await apiClient.completeLearningLessonWithAction(lesson.id, score === undefined ? {} : { score }, auth);
      await loadProgress();
      setActionStatus(`Saved. ${lesson.xp_reward} XP added to your learning progress.`);
    } catch {
      setActionStatus("The lesson is complete here. Progress sync can retry when the API is reachable.");
    }
  }

  function saveLessonJournal(lesson: LearningLessonApiResponse) {
    void saveLessonJournalAsync(lesson);
  }

  async function saveLessonJournalAsync(lesson: LearningLessonApiResponse) {
    onSaveJournal({
      goal: "Learning reflection",
      decision: lesson.title,
      amountDisplayMode: "range",
      amountText: "Not set",
      reason: lesson.summary || "Reflection from PesaRoute learning."
    });
    if (auth && isAuthenticated && source === "api" && selectedCourse) {
      try {
        const journalEntry = await apiClient.createJournalEntry(
          {
            learning_lesson: lesson.id,
            learning_course: selectedCourse.id,
            learning_track: courseTrackId(selectedCourse, selectedTrack),
            goal: "Learning reflection",
            decision: lesson.title,
            amount_display_mode: "hidden",
            reason: lesson.summary || "For education only. Compare before committing money.",
            visibility: "private"
          },
          auth
        );
        await apiClient.completeLearningLessonWithAction(lesson.id, { journal_entry_id: journalEntry.id }, auth);
        await loadProgress();
      } catch {
        await completeLesson(lesson);
      }
    } else {
      await completeLesson(lesson);
    }
    setActionStatus("Journal prompt saved. It stays private by default.");
  }

  function renderHeader() {
    return (
      <HeroCard>
        <View style={styles.heroTopRow}>
          <TrustBadge tone={source === "api" ? "emerald" : "muted"}>{source === "api" ? "Live learning" : `${source} learning`}</TrustBadge>
          <TrustBadge tone="muted">No execution</TrustBadge>
        </View>
        <Text style={[maliPrimeText.title, styles.heroTitle]}>Learn the route before money moves.</Text>
        <Text style={[maliPrimeText.subtitle, styles.heroCopy]}>
          Short lessons, practice, flashcards, and private reflections for Kenya-first investment decisions.
        </Text>
        <View style={styles.statGrid}>
          <Metric label="XP" value={String(homeSummary?.total_xp ?? progress.total_xp)} />
          <Metric label="Streak" value={`${homeSummary?.streak?.current_streak_days ?? progress.streak.current_streak_days}d`} />
          <Metric label="Done" value={String(progressSummary?.completed_lessons.length ?? completedLessons.size)} />
        </View>
      </HeroCard>
    );
  }

  function renderPanelTabs() {
    return (
      <View style={styles.panelTabs}>
        {panels.map((item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: panel === item.key }}
            key={item.key}
            onPress={() => {
              setPanel(item.key);
              setSelectedTrack(null);
              setSelectedLesson(null);
              setSelectedResource(null);
            }}
            style={[styles.panelTab, panel === item.key && styles.panelTabActive]}
          >
            <Text style={[styles.panelTabText, panel === item.key && styles.panelTabTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  function renderDashboard() {
    return (
      <View style={styles.stack}>
        {continueTrack ? (
          <PremiumCard>
            <Text style={styles.eyebrow}>Continue learning</Text>
            <Text style={styles.cardTitle}>{continueTrack.title}</Text>
            <Text style={styles.cardBody}>{continueTrack.description}</Text>
            <ProgressLine value={progressForTrack(continueTrack, progress)} />
            <PrimaryButton onPress={() => void openTrack(continueTrack)}>
              {progressForTrack(continueTrack, progress) > 0 ? "Continue track" : "Start track"}
            </PrimaryButton>
          </PremiumCard>
        ) : null}

        <PremiumCard tone="alt">
          <Text style={styles.eyebrow}>Daily money challenge</Text>
          <Text style={styles.cardTitle}>{homeSummary?.daily_challenge.title ?? "Before you trust a return, ask how you exit."}</Text>
          <Text style={styles.cardBody}>
            {homeSummary?.daily_challenge.body ?? "Pick one product today and write down withdrawal timing, fees, and what can go wrong."}
          </Text>
          <SecondaryButton onPress={onOpenJournal}>Write private note</SecondaryButton>
        </PremiumCard>

        <View>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.quickGrid}>
            <QuickAction icon="albums" label="Flashcards" onPress={() => setPanel("explore")} />
            <QuickAction icon="checkmark-circle" label="Practice" onPress={() => setPanel("explore")} />
            <QuickAction icon="shield-checkmark" label="Scam check" onPress={onOpenScam} />
            <QuickAction icon="calculator" label="Simulate" onPress={onOpenSimulators} />
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>Suggested track</Text>
          {tracks.slice(0, 2).map((track) => (
            <TrackCard key={track.id} onPress={() => void openTrack(track)} progress={progressForTrack(track, progress)} track={track} />
          ))}
        </View>

        <PremiumCard>
          <Text style={styles.cardTitle}>Privacy promise</Text>
          <Text style={styles.cardBody}>
            PesaRoute teaches and records decisions. It does not ask for M-Pesa PINs, bank passwords, broker credentials, or execute investments.
          </Text>
        </PremiumCard>
      </View>
    );
  }

  function renderExplore() {
    if (selectedLesson && selectedCourse) {
      return renderLesson();
    }
    if (selectedTrack) {
      return renderTrackDetail(selectedTrack);
    }
    return (
      <View style={styles.stack}>
        <TextInput
          onChangeText={setQuery}
          placeholder="Search tracks, topics, or user type"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.searchInput}
          value={query}
        />
        <View style={styles.filterWrap}>
          {filters.map((filter) => (
            <Pressable
              accessibilityRole="button"
              key={filter}
              onPress={() => setActiveFilter((current) => (current === filter ? null : filter))}
              style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </View>

        {filteredTracks.length === 0 ? (
          <EmptyState body="Try another topic or clear the filter." title="No tracks found" />
        ) : (
          filteredTracks.map((track) => (
            <TrackCard key={track.id} onPress={() => void openTrack(track)} progress={progressForTrack(track, progress)} track={track} />
          ))
        )}
      </View>
    );
  }

  function renderTrackDetail(track: LearningTrackApiResponse) {
    const courses = track.courses ?? [];
    return (
      <View style={styles.stack}>
        <Pressable accessibilityRole="button" onPress={() => setSelectedTrack(null)} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={maliPrime.colors.textPrimary} />
          <Text style={styles.backText}>All tracks</Text>
        </Pressable>
        <PremiumCard>
          <View style={styles.rowBetween}>
            <TrustBadge tone={track.is_premium ? "amber" : "muted"}>{track.is_premium ? "Premium" : track.level}</TrustBadge>
            <Text style={styles.metaText}>{formatMinutes(track.estimated_minutes)}</Text>
          </View>
          <Text style={styles.trackTitle}>{track.title}</Text>
          <Text style={styles.cardBody}>{track.description}</Text>
          <ProgressLine value={progressForTrack(track, progress)} />
        </PremiumCard>

        {courses.length === 0 ? (
          <EmptyState body="This track is seeded in the catalog, and lesson content can be expanded next." title="Lessons coming soon" />
        ) : (
          courses.map((course) => (
            <View key={course.id} style={styles.courseBlock}>
              <Text style={styles.sectionTitle}>{course.title}</Text>
              <Text style={styles.sectionCopy}>{course.description}</Text>
              <View style={styles.lessonList}>
                {course.lessons.map((lesson) => {
                  const locked = isLessonLocked(lesson);
                  const done = completedLessons.has(lesson.id);
                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={lesson.id}
                      onPress={() => void openLesson(course, lesson)}
                      style={[styles.lessonRow, locked && styles.lessonLocked]}
                    >
                      <View style={[styles.lessonIcon, done && styles.lessonIconDone]}>
                        <Ionicons
                          name={done ? "checkmark" : locked ? "lock-closed" : lessonIcon(lesson.lesson_type)}
                          size={16}
                          color={done ? maliPrime.colors.surface : maliPrime.colors.textPrimary}
                        />
                      </View>
                      <View style={styles.lessonText}>
                        <Text style={styles.lessonTitle}>{lesson.title}</Text>
                        <Text style={styles.lessonMeta}>
                          {lessonTypeLabel(lesson)} · {lesson.xp_reward} XP
                        </Text>
                      </View>
                      {lesson.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  function renderLesson() {
    if (!selectedLesson || !selectedCourse) return null;
    const lesson = selectedLesson;
    const quiz = generatedQuiz(lesson);
    const flashcard = flashcardForLesson(lesson);
    return (
      <View style={styles.stack}>
        <Pressable accessibilityRole="button" onPress={backToTrack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={18} color={maliPrime.colors.textPrimary} />
          <Text style={styles.backText}>{selectedCourse.title}</Text>
        </Pressable>
        <PremiumCard>
          <View style={styles.rowBetween}>
            <TrustBadge tone="muted">{lessonTypeLabel(lesson)}</TrustBadge>
            <Text style={styles.metaText}>{lesson.xp_reward} XP</Text>
          </View>
          <Text style={styles.lessonScreenTitle}>{lesson.title}</Text>
          <Text style={styles.cardBody}>{lesson.summary}</Text>
          <ProgressLine value={selectedCourse.lessons.length > 0 ? ((selectedCourse.lessons.findIndex((item) => item.id === lesson.id) + 1) / selectedCourse.lessons.length) * 100 : 0} />
        </PremiumCard>

        {lesson.body ? (
          <PremiumCard>
            <Text style={styles.lessonBody}>{lesson.body}</Text>
          </PremiumCard>
        ) : null}

        {lesson.lesson_type === "quiz" ? (
          <PremiumCard>
            <Text style={styles.cardTitle}>{quiz.prompt}</Text>
            <View style={styles.answerList}>
              {quiz.options.map((option) => {
                const selected = quizChoice === option;
                const correct = quiz.answer === option;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option}
                    onPress={() => {
                      setQuizChoice(option);
                      if (correct) {
                        setQuizFeedback(`Correct. ${quiz.explanation}`);
                        void completeLesson(lesson, 100);
                      } else {
                        setQuizFeedback(`Not quite. ${quiz.explanation}`);
                      }
                    }}
                    style={[styles.answerButton, selected && styles.answerSelected, selected && correct && styles.answerCorrect]}
                  >
                    <Text style={[styles.answerText, selected && correct && styles.answerCorrectText]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
            {quizFeedback ? <Text style={styles.feedbackText}>{quizFeedback}</Text> : null}
          </PremiumCard>
        ) : null}

        {lesson.lesson_type === "flashcard" ? (
          <PremiumCard>
            <Pressable accessibilityRole="button" onPress={() => setFlashcardRevealed((current) => !current)} style={styles.flashcard}>
              <Text style={styles.eyebrow}>{flashcardRevealed ? "Back" : "Front"}</Text>
              <Text style={styles.flashcardText}>{flashcardRevealed ? flashcard.back : flashcard.front}</Text>
              {flashcardRevealed ? <Text style={styles.cardBody}>{flashcard.example}</Text> : null}
            </Pressable>
            <View style={styles.twoButtons}>
              <SecondaryButton onPress={() => setFlashcardRevealed(false)}>Review again</SecondaryButton>
              <PrimaryButton onPress={() => void completeLesson(lesson, 100)}>Got it</PrimaryButton>
            </View>
          </PremiumCard>
        ) : null}

        {lesson.lesson_type === "simulation" ? (
          <PremiumCard>
            <Text style={styles.cardTitle}>Practice with numbers</Text>
            <Text style={styles.cardBody}>Run the simulator, then come back to mark the practice done.</Text>
            <View style={styles.twoButtons}>
              <SecondaryButton
                onPress={() => {
                  onOpenSimulators({ id: lesson.id, title: lesson.title });
                }}
              >
                Open simulator
              </SecondaryButton>
              <PrimaryButton onPress={() => void completeLesson(lesson)}>Mark done</PrimaryButton>
            </View>
          </PremiumCard>
        ) : null}

        {lesson.lesson_type === "journal_prompt" ? (
          <PremiumCard>
            <Text style={styles.cardTitle}>Private reflection</Text>
            <Text style={styles.cardBody}>Save a short journal entry. Amounts can stay hidden or ranged.</Text>
            <View style={styles.twoButtons}>
              <SecondaryButton onPress={onOpenJournal}>Open journal</SecondaryButton>
              <PrimaryButton onPress={() => saveLessonJournal(lesson)}>Save prompt</PrimaryButton>
            </View>
          </PremiumCard>
        ) : null}

        {lesson.lesson_type === "professional_review_prompt" ? (
          <PremiumCard>
            <Text style={styles.cardTitle}>Ask for scoped review</Text>
            <Text style={styles.cardBody}>Share only what you choose. Exact values stay hidden unless you grant access.</Text>
            <PrimaryButton
              onPress={async () => {
                if (auth && selectedTrack) {
                  try {
                    const request = await apiClient.createConsultationRequest(
                      {
                        learning_track: selectedTrack.id,
                        category: "general_first_investment",
                        amount_display_mode: "hidden",
                        user_question: `Please review my learning context for: ${lesson.title}`,
                        timeline: "flexible",
                        risk_preference: "not_sure",
                        preferred_language: "en"
                      },
                      auth
                    );
                    await apiClient.completeLearningLessonWithAction(
                      lesson.id,
                      { consultation_request_id: request.id },
                      auth
                    );
                    await loadProgress();
                    setActionStatus("Review request created with learning context. You still control what data is shared.");
                  } catch {
                    await completeLesson(lesson);
                  }
                } else {
                  await completeLesson(lesson);
                }
                onOpenProfessionals();
              }}
            >
              Request review
            </PrimaryButton>
          </PremiumCard>
        ) : null}

        {["article", "checklist"].includes(lesson.lesson_type) ? (
          <PrimaryButton onPress={() => void completeLesson(lesson)}>Complete lesson</PrimaryButton>
        ) : null}

        {actionStatus ? <Text style={styles.statusText}>{actionStatus}</Text> : null}
        {!isAuthenticated ? (
          <PremiumCard tone="warning">
            <Text style={styles.cardTitle}>Save progress across devices</Text>
            <Text style={styles.cardBody}>Anonymous learning still works. Create an account when you want XP, streaks, and progress synced.</Text>
            <SecondaryButton onPress={onRequestAuth}>Log in or create account</SecondaryButton>
          </PremiumCard>
        ) : null}
      </View>
    );
  }

  function renderResources() {
    return (
      <View style={styles.stack}>
        <Text style={styles.sectionTitle}>Guides and checklists</Text>
        <Text style={styles.sectionCopy}>Short references for decisions you may revisit later.</Text>
        {resources.map((resource) => (
          <Pressable
            accessibilityRole="button"
            key={resource.id}
            onPress={() => setSelectedResource(resource)}
            style={styles.resourceRow}
          >
            <View style={styles.resourceText}>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourceMeta}>{resourceTypeLabels[resource.resource_type]}</Text>
            </View>
            {resource.is_premium ? <TrustBadge tone="amber">Premium</TrustBadge> : null}
          </Pressable>
        ))}
        {selectedResource ? (
          <View style={styles.sheet}>
            <View style={styles.rowBetween}>
              <TrustBadge tone="muted">{resourceTypeLabels[selectedResource.resource_type]}</TrustBadge>
              <Pressable accessibilityRole="button" onPress={() => setSelectedResource(null)}>
                <Ionicons name="close" size={22} color={maliPrime.colors.textPrimary} />
              </Pressable>
            </View>
            <Text style={styles.sheetTitle}>{selectedResource.title}</Text>
            <Text style={styles.lessonBody}>{selectedResource.body}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  function renderLibrary() {
    const inProgressCourses = librarySummary?.in_progress_courses ?? libraryItems;
    const completedCourses = librarySummary?.completed_courses ?? [];
    const suggestions = librarySummary?.practice_suggestions ?? tracks.slice(0, 2);
    return (
      <View style={styles.stack}>
        <PremiumCard>
          <Text style={styles.eyebrow}>My library</Text>
          <Text style={styles.cardTitle}>Continue from your saved progress</Text>
          <Text style={styles.cardBody}>Tracks and courses appear here once you start learning with an account.</Text>
          {isAuthenticated ? null : <SecondaryButton onPress={onRequestAuth}>Save progress with account</SecondaryButton>}
        </PremiumCard>
        <View>
          <Text style={styles.sectionTitle}>In progress</Text>
          {inProgressCourses.length === 0 ? <EmptyState body="Start a track to build your library." title="No courses yet" /> : null}
          {inProgressCourses.map((course) => (
            <View key={`${course.course_slug}-${course.id}`} style={styles.libraryRow}>
              <View style={styles.libraryText}>
                <Text style={styles.libraryTitle}>{course.course_title}</Text>
                <Text style={styles.libraryMeta}>{course.last_lesson_title || "Not started yet"}</Text>
              </View>
              <Text style={styles.libraryPercent}>{formatProgress(course.percent_complete)}%</Text>
            </View>
          ))}
        </View>
        <View>
          <Text style={styles.sectionTitle}>Completed</Text>
          {completedCourses.length === 0 ? (
            <Text style={styles.smallMuted}>Completed courses will appear here.</Text>
          ) : null}
          {completedCourses.map((course) => (
            <View key={`${course.course_slug}-${course.id}`} style={styles.libraryRow}>
              <Text style={styles.libraryTitle}>{course.course_title}</Text>
              <TrustBadge tone="emerald">Done</TrustBadge>
            </View>
          ))}
        </View>
        <View>
          <Text style={styles.sectionTitle}>Practice suggestions</Text>
          {suggestions.map((track) => (
            <TrackCard key={track.id} onPress={() => void openTrack(track)} progress={progressForTrack(track, progress)} track={track} />
          ))}
        </View>
      </View>
    );
  }

  function renderProgress() {
    const summary = progressSummary;
    return (
      <View style={styles.stack}>
        <PremiumCard>
          <Text style={styles.eyebrow}>Progress</Text>
          <Text style={styles.cardTitle}>{summary?.total_xp ?? progress.total_xp} XP earned</Text>
          <Text style={styles.cardBody}>
            XP rewards learning behavior only: lessons completed, practice attempted, simulator learning runs, and private reflections.
          </Text>
          <View style={styles.statGrid}>
            <Metric label="Streak" value={`${summary?.streak.current_streak_days ?? progress.streak.current_streak_days}d`} />
            <Metric label="Sims" value={String(summary?.simulations_completed ?? 0)} />
            <Metric label="Notes" value={String(summary?.journal_reflections_completed ?? 0)} />
          </View>
        </PremiumCard>
        <View>
          <Text style={styles.sectionTitle}>Badges</Text>
          {(summary?.badges ?? progress.badges).length === 0 ? (
            <EmptyState body="Finish lessons and practice to earn learning badges." title="No badges yet" />
          ) : (
            (summary?.badges ?? progress.badges).map((badge) => (
              <View key={badge.id} style={styles.libraryRow}>
                <Text style={styles.libraryTitle}>{badge.badge.name}</Text>
                <TrustBadge tone="emerald">Earned</TrustBadge>
              </View>
            ))
          )}
        </View>
        <View>
          <Text style={styles.sectionTitle}>Completed lessons</Text>
          {(summary?.completed_lessons ?? progress.lessons.filter((lesson) => lesson.status === "completed")).slice(0, 8).map((lesson) => (
            <View key={lesson.id} style={styles.libraryRow}>
              <View style={styles.libraryText}>
                <Text style={styles.libraryTitle}>{lesson.lesson_title}</Text>
                <Text style={styles.libraryMeta}>{lesson.lesson_type.replace(/_/g, " ")}</Text>
              </View>
              <TrustBadge tone="muted">Done</TrustBadge>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {selectedLesson ? null : renderHeader()}
      {loading ? <LoadingState label="Loading learning tracks..." /> : null}
      {error ? <ErrorState message={`Using offline learning fallback: ${error}`} /> : null}
      {selectedLesson ? null : renderPanelTabs()}
      {panel === "dashboard" ? renderDashboard() : null}
      {panel === "explore" ? renderExplore() : null}
      {panel === "resources" ? renderResources() : null}
      {panel === "library" ? renderLibrary() : null}
      {panel === "progress" ? renderProgress() : null}
    </View>
  );
}

function lessonIcon(type: LearningLessonApiResponse["lesson_type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "quiz":
      return "help-circle";
    case "flashcard":
      return "albums";
    case "simulation":
      return "calculator";
    case "journal_prompt":
      return "create";
    case "checklist":
      return "checkbox";
    case "professional_review_prompt":
      return "people";
    default:
      return "book";
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ProgressLine({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(clamped)}% complete</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <Ionicons name={icon} size={18} color={maliPrime.colors.textPrimary} />
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

function TrackCard({
  onPress,
  progress,
  track
}: {
  onPress: () => void;
  progress: number;
  track: LearningTrackApiResponse;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.trackCard, pressed && styles.pressed]}>
      <View style={styles.rowBetween}>
        <TrustBadge tone={track.is_premium ? "amber" : "muted"}>{track.is_premium ? "Premium" : track.level}</TrustBadge>
        <Text style={styles.metaText}>{formatMinutes(track.estimated_minutes)}</Text>
      </View>
      <Text style={styles.trackTitle}>{track.title}</Text>
      <Text numberOfLines={3} style={styles.cardBody}>{track.description}</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.metaText}>{track.lesson_count ?? 0} lessons</Text>
        <Text style={styles.metaText}>{progress}%</Text>
      </View>
      <ProgressLine value={progress} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 16 },
  stack: { gap: 14 },
  heroTopRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroTitle: { marginTop: 14 },
  heroCopy: { marginTop: 10 },
  statGrid: { flexDirection: "row", gap: 10, marginTop: 16 },
  metric: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12
  },
  metricValue: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "900" },
  metricLabel: { color: maliPrime.colors.textSecondary, fontSize: 11, fontWeight: "800", marginTop: 4, textTransform: "uppercase" },
  panelTabs: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: 3
  },
  panelTab: { alignItems: "center", borderRadius: maliPrime.radius.sm, flex: 1, paddingVertical: 10 },
  panelTabActive: { backgroundColor: maliPrime.colors.textPrimary },
  panelTabText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800" },
  panelTabTextActive: { color: maliPrime.colors.surface },
  eyebrow: {
    color: maliPrime.colors.textTertiary,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 18, fontWeight: "900", lineHeight: 24, marginTop: 8 },
  cardBody: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  sectionTitle: { color: maliPrime.colors.textPrimary, fontSize: 17, fontWeight: "900", marginBottom: 4 },
  sectionCopy: { color: maliPrime.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickAction: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexBasis: "47%",
    flexDirection: "row",
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 12
  },
  quickText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "800" },
  searchInput: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  filterChipActive: { backgroundColor: maliPrime.colors.textPrimary, borderColor: maliPrime.colors.textPrimary },
  filterText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800" },
  filterTextActive: { color: maliPrime.colors.surface },
  trackCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
    padding: 16,
    ...maliPrime.shadow
  },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  metaText: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800", textTransform: "capitalize" },
  trackTitle: { color: maliPrime.colors.textPrimary, fontSize: 21, fontWeight: "900", lineHeight: 27, marginTop: 10 },
  progressWrap: { gap: 6, marginTop: 12 },
  progressTrack: { backgroundColor: maliPrime.colors.surfaceAlt, borderRadius: maliPrime.radius.pill, height: 8, overflow: "hidden" },
  progressFill: { backgroundColor: maliPrime.colors.textPrimary, borderRadius: maliPrime.radius.pill, height: "100%" },
  progressText: { color: maliPrime.colors.textSecondary, fontSize: 11, fontWeight: "800" },
  backButton: { alignItems: "center", flexDirection: "row", gap: 6, paddingVertical: 4 },
  backText: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  courseBlock: { gap: 8 },
  lessonList: { gap: 9 },
  lessonRow: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    padding: 12
  },
  lessonLocked: { opacity: 0.7 },
  lessonIcon: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  lessonIconDone: { backgroundColor: maliPrime.colors.textPrimary },
  lessonText: { flex: 1 },
  lessonTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900", lineHeight: 19 },
  lessonMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 4, textTransform: "capitalize" },
  lessonScreenTitle: { color: maliPrime.colors.textPrimary, fontSize: 25, fontWeight: "900", lineHeight: 31, marginTop: 10 },
  lessonBody: { color: maliPrime.colors.textPrimary, fontSize: 16, lineHeight: 25 },
  answerList: { gap: 9, marginTop: 14 },
  answerButton: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    padding: 13
  },
  answerSelected: { borderColor: maliPrime.colors.borderStrong },
  answerCorrect: { backgroundColor: maliPrime.colors.textPrimary, borderColor: maliPrime.colors.textPrimary },
  answerText: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  answerCorrectText: { color: maliPrime.colors.surface },
  feedbackText: { color: maliPrime.colors.textSecondary, fontSize: 14, fontWeight: "700", lineHeight: 21, marginTop: 12 },
  flashcard: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    minHeight: 160,
    padding: 16
  },
  flashcardText: { color: maliPrime.colors.textPrimary, fontSize: 22, fontWeight: "900", lineHeight: 29, marginTop: 16 },
  twoButtons: { gap: 10, marginTop: 14 },
  statusText: { color: maliPrime.colors.textSecondary, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  resourceRow: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  resourceText: { flex: 1 },
  resourceTitle: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  resourceMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800", marginTop: 4 },
  sheet: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.borderStrong,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: 16,
    ...maliPrime.shadow
  },
  sheetTitle: { color: maliPrime.colors.textPrimary, fontSize: 22, fontWeight: "900", lineHeight: 28, marginBottom: 12, marginTop: 10 },
  libraryRow: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 8,
    padding: 14
  },
  libraryText: { flex: 1 },
  libraryTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  libraryMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 4 },
  libraryPercent: { color: maliPrime.colors.textPrimary, fontSize: 15, fontWeight: "900" },
  smallMuted: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 6 },
  pressed: { opacity: 0.76 }
});
