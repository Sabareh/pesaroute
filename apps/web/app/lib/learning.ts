import { apiBaseUrl } from "./api";

// ---- Types (subset of the backend serializers we render) -------------------

export type ContentSource = {
  id: number;
  title: string;
  organization: string;
  source_type: string;
  url: string;
  reliability_level: string;
};

export type StructuredBlock = {
  type: string;
  title?: string;
  text?: string;
  term?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
};

export type LessonSummary = {
  id: number;
  title: string;
  slug: string;
  lesson_type: string;
  body: string;
  summary: string;
  structured_content: StructuredBlock[];
  estimated_minutes: number;
  difficulty: string;
  order: number;
  xp_reward: number;
  is_premium: boolean;
  source_confidence: string;
  content_quality_score: number;
  needs_review_fallback: boolean;
  content_sources: ContentSource[];
  source_label: string;
  disclaimer: string;
  locked: boolean;
};

export type LessonDetail = LessonSummary & {
  course_slug: string;
  course_title: string;
  track_slug: string;
  track_title: string;
};

export type TrackListItem = {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: string;
  target_user_type: string;
  estimated_minutes: number;
  is_premium: boolean;
  status: string;
  order: number;
  course_count: number;
  lesson_count: number;
};

export type ModuleOutline = {
  id: number;
  title: string;
  slug: string;
  description: string;
  order: number;
  estimated_minutes: number;
  lessons: LessonSummary[];
};

export type CourseOutline = {
  id: number;
  title: string;
  slug: string;
  description: string;
  order: number;
  estimated_minutes: number;
  is_premium: boolean;
  modules: ModuleOutline[];
  lessons: LessonSummary[];
};

export type TrackOutline = {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: string;
  target_user_type: string;
  estimated_minutes: number;
  is_premium: boolean;
  courses: CourseOutline[];
};

export type CourseDetail = {
  id: number;
  title: string;
  slug: string;
  description: string;
  estimated_minutes: number;
  is_premium: boolean;
  track: TrackListItem;
  lessons: LessonSummary[];
};

export type PracticeQuestionPublic = {
  id: number;
  prompt: string;
  options: string[];
  explanation: string;
  difficulty: string;
  order: number;
};

export type PracticeSetListItem = {
  id: number;
  title: string;
  slug: string;
  description: string;
  kind: string;
  track: number | null;
  track_slug: string | null;
  is_premium: boolean;
  order: number;
  xp_reward: number;
  question_count: number;
  locked: boolean;
};

export type PracticeSetDetail = PracticeSetListItem & {
  questions: PracticeQuestionPublic[];
};

export type PracticeSubmitResult = {
  practice_set_id: number;
  total_questions: number;
  correct_count: number;
  score: number;
  results: Array<{ question_id: number; correct: boolean; correct_answer: string; explanation: string }>;
  xp_awarded: number;
  total_xp: number;
};

export type AssessmentQuestionPublic = {
  id: number;
  prompt: string;
  options: Array<{ label: string; value: string }>;
  order: number;
};

export type AssessmentListItem = {
  id: number;
  title: string;
  slug: string;
  description: string;
  kind: string;
  scoring: string;
  is_premium: boolean;
  order: number;
  xp_reward: number;
  question_count: number;
  locked: boolean;
};

export type AssessmentDetail = AssessmentListItem & {
  questions: AssessmentQuestionPublic[];
};

export type AssessmentSubmitResult = {
  assessment_id: number;
  score: number;
  result_label: string;
  passed: boolean;
  xp_awarded: number;
  total_xp: number;
};

export type LearningResource = {
  id: number;
  title: string;
  resource_type: string;
  body: string;
  structured_content: StructuredBlock[];
  is_premium: boolean;
  source_confidence: string;
  source_label: string;
  content_sources: ContentSource[];
  next_review_due_at: string | null;
  locked: boolean;
};

export type StreakInfo = {
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  streak_freezes_available: number;
};

export type ContinueItem = {
  track: TrackListItem;
  course: { id: number; title: string; slug: string; estimated_minutes: number };
  lesson: LessonSummary;
} | null;

export type Dashboard = {
  greeting: string;
  premium_status: "premium" | "free";
  total_xp: number;
  daily_streak: StreakInfo | null;
  review_count: number;
  current_track: TrackListItem | null;
  continue_learning: ContinueItem;
  suggested_practice: PracticeSetListItem | null;
  suggested_simulator: { key: string; label: string; route: string };
  recent_activity: Array<{ source_type: string; source_id: string; xp_amount: number; created_at: string }>;
  assessments: AssessmentListItem[];
  quick_actions: Array<{ key: string; label: string }>;
};

export type Activity = {
  total_xp: number;
  xp_events: Array<{ id: number; source_type: string; source_id: string; xp_amount: number; created_at: string }>;
  recent_completions: Array<{ id: number; lesson_title: string; track_slug: string; completed_at: string | null }>;
  assessment_results: Array<{
    id: number;
    assessment_slug: string;
    assessment_kind: string;
    score: string;
    result_label: string;
    passed: boolean;
  }>;
};

export type ProgressSummary = {
  total_xp: number;
  streak: StreakInfo;
  badges: Array<{ id: number; badge: { name: string; slug: string; description: string }; awarded_at: string }>;
  completed_lessons: Array<{ id: number; lesson_title: string; track_slug: string }>;
  simulations_completed: number;
  journal_reflections_completed: number;
};

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };

// ---- Fetch helpers (client-side, token-aware) ------------------------------

function headers(token?: string | null): HeadersInit {
  const base: Record<string, string> = { Accept: "application/json" };
  if (token) base.Authorization = `Token ${token}`;
  return base;
}

async function getJson<T>(path: string, token?: string | null): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, { headers: headers(token), cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    headers: { ...headers(token), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export const learningApi = {
  dashboard: (token?: string | null) => getJson<Dashboard>("/api/learning/dashboard/", token),
  tracks: async (token?: string | null) =>
    (await getJson<Paginated<TrackListItem>>("/api/learning/tracks/", token)).results,
  trackOutline: (slug: string, token?: string | null) =>
    getJson<TrackOutline>(`/api/learning/tracks/${slug}/outline/`, token),
  course: (slug: string, token?: string | null) =>
    getJson<CourseDetail>(`/api/learning/courses/${slug}/`, token),
  lesson: (id: number | string, token?: string | null) =>
    getJson<LessonDetail>(`/api/learning/lessons/${id}/`, token),
  practiceList: async (token?: string | null) =>
    (await getJson<Paginated<PracticeSetListItem>>("/api/learning/practice/", token)).results,
  practiceDetail: (id: number | string, token?: string | null) =>
    getJson<PracticeSetDetail>(`/api/learning/practice/${id}/`, token),
  submitPractice: (id: number | string, answers: Record<string, string>, token?: string | null) =>
    postJson<PracticeSubmitResult>(`/api/learning/practice/${id}/submit/`, { answers }, token),
  assessments: async (token?: string | null) =>
    (await getJson<Paginated<AssessmentListItem>>("/api/learning/assessments/", token)).results,
  assessmentDetail: (slug: string, token?: string | null) =>
    getJson<AssessmentDetail>(`/api/learning/assessments/${slug}/`, token),
  submitAssessment: (slug: string, answers: Record<string, string>, token?: string | null) =>
    postJson<AssessmentSubmitResult>(`/api/learning/assessments/${slug}/submit/`, { answers }, token),
  resources: async (token?: string | null) =>
    (await getJson<Paginated<LearningResource>>("/api/learning/resources/", token)).results,
  activity: (token?: string | null) => getJson<Activity>("/api/learning/activity/", token),
  progress: (token?: string | null) => getJson<ProgressSummary>("/api/learning/progress/", token),
  completeLesson: (id: number | string, token?: string | null) =>
    postJson<unknown>(`/api/learning/lessons/${id}/complete/`, {}, token),
  saveLibrary: (trackId: number, token?: string | null) =>
    postJson<unknown>("/api/learning/library/save/", { track: trackId }, token)
};

export const TRACK_FILTER_CHIPS = [
  { key: "all", label: "All" },
  { key: "beginner", label: "Beginner" },
  { key: "first_jobber", label: "First salary" },
  { key: "mmf", label: "MMF" },
  { key: "treasury", label: "Treasury" },
  { key: "sacco", label: "SACCO/chama" },
  { key: "global", label: "Global investing" },
  { key: "land", label: "Land" },
  { key: "scam", label: "Scam defense" },
  { key: "diaspora", label: "Diaspora" },
  { key: "farmer", label: "Farmer" },
  { key: "jua_kali", label: "Jua kali" }
] as const;

// Group tracks into the categories from the prompt by slug keywords.
export function trackCategory(track: TrackListItem): string {
  const text = `${track.slug} ${track.title}`.toLowerCase();
  if (/(scam|fraud|risk)/.test(text)) return "Risk and Scam Defense";
  if (/(global|etf|diaspora)/.test(text)) return "Global Investing";
  if (/(chama|sacco)/.test(text)) return "Group Investing";
  if (/(mmf|money-market|treasury|bond|nse|stock|land|fixed)/.test(text)) return "Product Skills";
  if (/(salary|farmer|jua|seasonal|daily)/.test(text)) return "Life Situations";
  return "Foundations";
}

export const TRACK_CATEGORY_ORDER = [
  "Foundations",
  "Product Skills",
  "Life Situations",
  "Group Investing",
  "Global Investing",
  "Risk and Scam Defense"
];

export function matchesFilter(track: TrackListItem, filter: string): boolean {
  if (filter === "all") return true;
  const text = `${track.slug} ${track.title} ${track.target_user_type} ${track.level}`.toLowerCase();
  return text.includes(filter.replace("_", " ")) || text.includes(filter);
}
