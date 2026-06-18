import type {
  LearningCourseApiResponse,
  LearningProgressApiResponse,
  LearningResourceApiResponse,
  LearningTrackApiResponse
} from "../api/client";

const now = new Date().toISOString();

const mockContentSource = {
  id: 9001,
  title: "PesaRoute Editorial Literacy Standard",
  organization: "PesaRoute",
  source_type: "editorial" as const,
  url: "",
  retrieved_at: now,
  reliability_level: "editorial" as const
};

function reviewedContent(body: string) {
  return {
    structured_content: [
      { type: "paragraph" as const, text: body },
      {
        type: "checklist" as const,
        title: "Before money moves",
        items: ["Name the goal and timeline.", "Check liquidity and fees.", "Write what can go wrong."]
      },
    ],
    estimated_minutes: 5,
    difficulty: "beginner" as const,
    editorial_status: "reviewed" as const,
    last_reviewed_at: now,
    next_review_due_at: now,
    review_frequency_days: 180,
    source_confidence: "editorial" as const,
    content_quality_score: 80,
    content_warning_flags: [],
    needs_review_fallback: false,
    content_sources: [mockContentSource],
    source_label: "Editorial reviewed",
    disclaimer: ""
  };
}

const moneyFoundationsCourse: LearningCourseApiResponse = {
  id: 1001,
  track: 101,
  title: "Before money moves",
  slug: "before-money-moves",
  description: "A calm sequence for checking risk, access, and provider credibility before committing cash.",
  order: 1,
  estimated_minutes: 28,
  is_premium: false,
  status: "published",
  lessons: [
    {
      id: 1101,
      title: "Why learning comes before investing",
      slug: "why-learning-comes-first",
      lesson_type: "article",
      body:
        "Before choosing a product, write down the goal, timeline, amount range, and what would make the decision unsafe. This protects you from rushing toward the loudest promise.",
      summary: "Define the decision before comparing products.",
      ...reviewedContent(
        "Before choosing a product, write down the goal, timeline, amount range, and what would make the decision unsafe. This protects you from rushing toward the loudest promise."
      ),
      order: 1,
      xp_reward: 10,
      is_premium: false,
      status: "published",
      locked: false
    },
    {
      id: 1102,
      title: "Spot the missing detail",
      slug: "spot-the-missing-detail",
      lesson_type: "quiz",
      body: "Practice checking whether a product pitch explains access, fees, risk, and who regulates the provider.",
      summary: "A short practice question on information gaps.",
      ...reviewedContent("Practice checking whether a product pitch explains access, fees, risk, and who regulates the provider."),
      order: 2,
      xp_reward: 15,
      is_premium: false,
      status: "published",
      locked: false
    },
    {
      id: 1103,
      title: "Risk and liquidity flashcards",
      slug: "risk-liquidity-flashcards",
      lesson_type: "flashcard",
      body: "Flip cards for quick definitions you should remember before comparing MMFs, SACCOs, treasury products, land, or global routes.",
      summary: "Remember the difference between return, risk, and access.",
      ...reviewedContent(
        "Flip cards for quick definitions you should remember before comparing MMFs, SACCOs, treasury products, land, or global routes."
      ),
      order: 3,
      xp_reward: 10,
      is_premium: false,
      status: "published",
      locked: false
    }
  ]
};

const mmfCourse: LearningCourseApiResponse = {
  id: 1002,
  track: 102,
  title: "MMF starter route",
  slug: "mmf-starter-route",
  description: "Learn the questions to ask before treating a money market fund as an emergency or savings route.",
  order: 1,
  estimated_minutes: 34,
  is_premium: false,
  status: "published",
  lessons: [
    {
      id: 1201,
      title: "How MMFs talk about yield",
      slug: "how-mmfs-talk-about-yield",
      lesson_type: "article",
      body:
        "An MMF quoted yield is not a promised return. Check fees, tax treatment, withdrawal timing, and whether the fund is regulated before deciding.",
      summary: "Understand quoted yield without treating it as a promise.",
      ...reviewedContent(
        "An MMF quoted yield is not a promised return. Check fees, tax treatment, withdrawal timing, and whether the fund is regulated before deciding."
      ),
      order: 1,
      xp_reward: 10,
      is_premium: false,
      status: "published",
      locked: false
    },
    {
      id: 1202,
      title: "Run a simple MMF simulation",
      slug: "run-a-simple-mmf-simulation",
      lesson_type: "simulation",
      body: "Use the simulator to see how principal, rate, and time can change an estimate.",
      summary: "Practice with a simple MMF estimate.",
      ...reviewedContent("Use the simulator to see how principal, rate, and time can change an estimate."),
      order: 2,
      xp_reward: 20,
      is_premium: false,
      status: "published",
      locked: false
    },
    {
      id: 1203,
      title: "Write the decision in your journal",
      slug: "write-mmf-decision",
      lesson_type: "journal_prompt",
      body: "Write why an MMF might or might not fit your timeline. Keep the amount as a range if you prefer.",
      summary: "Create a private decision note.",
      ...reviewedContent("Write why an MMF might or might not fit your timeline. Keep the amount as a range if you prefer."),
      order: 3,
      xp_reward: 10,
      is_premium: false,
      status: "published",
      locked: false
    }
  ]
};

const treasuryCourse: LearningCourseApiResponse = {
  id: 1003,
  track: 103,
  title: "Treasury bills without confusion",
  slug: "treasury-bills-without-confusion",
  description: "A beginner path for auction language, discounted prices, and maturity timing.",
  order: 1,
  estimated_minutes: 45,
  is_premium: true,
  status: "published",
  lessons: [
    {
      id: 1301,
      title: "Face value versus purchase price",
      slug: "face-value-versus-purchase-price",
      lesson_type: "article",
      body:
        "Treasury bills are bought at a discount and mature at face value. The purchase price, maturity period, and auction result matter more than a headline rate alone.",
      summary: "Understand why a T-bill purchase price can be below face value.",
      ...reviewedContent(
        "Treasury bills are bought at a discount and mature at face value. The purchase price, maturity period, and auction result matter more than a headline rate alone."
      ),
      order: 1,
      xp_reward: 15,
      is_premium: true,
      status: "published",
      locked: true
    },
    {
      id: 1302,
      title: "Check readiness before applying",
      slug: "check-readiness-before-applying",
      lesson_type: "checklist",
      body: "Confirm the minimum amount, CSD route, auction date, liquidity needs, and tax treatment before applying.",
      summary: "A quick checklist for T-bill readiness.",
      ...reviewedContent("Confirm the minimum amount, CSD route, auction date, liquidity needs, and tax treatment before applying."),
      order: 2,
      xp_reward: 15,
      is_premium: true,
      status: "published",
      locked: true
    }
  ]
};

export const mockLearningTracks: LearningTrackApiResponse[] = [
  {
    id: 101,
    title: "Money foundations",
    slug: "money-foundations",
    description: "Build the habit of checking goals, risk, liquidity, and red flags before you invest.",
    level: "beginner",
    target_user_type: "general",
    estimated_minutes: 38,
    is_premium: false,
    status: "published",
    order: 1,
    course_count: 1,
    lesson_count: moneyFoundationsCourse.lessons.length,
    courses: [moneyFoundationsCourse]
  },
  {
    id: 102,
    title: "First MMF decision",
    slug: "first-mmf-decision",
    description: "Compare money market funds as a learning route, not a shortcut to promised payouts.",
    level: "beginner",
    target_user_type: "first_jobber",
    estimated_minutes: 42,
    is_premium: false,
    status: "published",
    order: 2,
    course_count: 1,
    lesson_count: mmfCourse.lessons.length,
    courses: [mmfCourse]
  },
  {
    id: 103,
    title: "Treasury bills basics",
    slug: "treasury-bills-basics",
    description: "Learn auction timing, discounted pricing, and maturity before considering treasury bills.",
    level: "intermediate",
    target_user_type: "general",
    estimated_minutes: 50,
    is_premium: true,
    status: "published",
    order: 3,
    course_count: 1,
    lesson_count: treasuryCourse.lessons.length,
    courses: [treasuryCourse]
  },
  {
    id: 104,
    title: "Scam defense",
    slug: "scam-defense",
    description: "Practice identifying pressure, promised payouts, and missing regulator/provider details.",
    level: "beginner",
    target_user_type: "general",
    estimated_minutes: 30,
    is_premium: false,
    status: "published",
    order: 4,
    course_count: 0,
    lesson_count: 0,
    courses: []
  },
  {
    id: 105,
    title: "SACCO and chama basics",
    slug: "sacco-chama-basics",
    description: "Understand governance, liquidity, and records before treating group money as simple savings.",
    level: "beginner",
    target_user_type: "chama_member",
    estimated_minutes: 36,
    is_premium: false,
    status: "published",
    order: 5,
    course_count: 0,
    lesson_count: 0,
    courses: []
  },
  {
    id: 106,
    title: "Global investing route",
    slug: "global-investing-route",
    description: "Learn FX, platform, custody, tax, and transfer questions before looking outside Kenya.",
    level: "intermediate",
    target_user_type: "diaspora",
    estimated_minutes: 58,
    is_premium: true,
    status: "published",
    order: 6,
    course_count: 0,
    lesson_count: 0,
    courses: []
  }
];

export const mockLearningResources: LearningResourceApiResponse[] = [
  {
    id: 201,
    title: "Investment decision checklist",
    resource_type: "checklist",
    body: "Goal, timeline, amount range, provider, regulator, fees, liquidity, tax notes, exit terms, and red flags.",
    ...reviewedContent("Goal, timeline, amount range, provider, regulator, fees, liquidity, tax notes, exit terms, and red flags."),
    related_track: 101,
    related_track_slug: "money-foundations",
    related_product_category: null,
    related_product_category_slug: "",
    is_premium: false,
    status: "published",
    created_at: now,
    updated_at: now
  },
  {
    id: 202,
    title: "MMF terms cheat sheet",
    resource_type: "cheat_sheet",
    body: "Yield, management fee, withholding tax, settlement time, fund fact sheet, and redemption request.",
    ...reviewedContent("Yield, management fee, withholding tax, settlement time, fund fact sheet, and redemption request."),
    related_track: 102,
    related_track_slug: "first-mmf-decision",
    related_product_category: null,
    related_product_category_slug: "",
    is_premium: false,
    status: "published",
    created_at: now,
    updated_at: now
  },
  {
    id: 203,
    title: "Treasury bill auction glossary",
    resource_type: "glossary",
    body: "Face value, discounted price, accepted yield, maturity, auction date, and CSD account.",
    ...reviewedContent("Face value, discounted price, accepted yield, maturity, auction date, and CSD account."),
    related_track: 103,
    related_track_slug: "treasury-bills-basics",
    related_product_category: null,
    related_product_category_slug: "",
    is_premium: true,
    status: "published",
    created_at: now,
    updated_at: now
  },
  {
    id: 204,
    title: "Scam pitch questions",
    resource_type: "guide",
    body: "Who regulates this? What are the fees? Can I withdraw? Why is the payout being promised? What happens if I say no today?",
    ...reviewedContent("Who regulates this? What are the fees? Can I withdraw? What happens if I say no today?"),
    related_track: 104,
    related_track_slug: "scam-defense",
    related_product_category: null,
    related_product_category_slug: "",
    is_premium: false,
    status: "published",
    created_at: now,
    updated_at: now
  }
];

export const mockLearningProgress: LearningProgressApiResponse = {
  total_xp: 0,
  lessons: [],
  courses: [],
  badges: [],
  streak: {
    current_streak_days: 0,
    longest_streak_days: 0,
    last_activity_date: null,
    streak_freezes_available: 0,
    updated_at: now
  }
};
