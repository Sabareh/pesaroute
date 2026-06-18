import fs from "node:fs";
import path from "node:path";

export type LessonPack = {
  track: {
    title: string;
    slug: string;
    description: string;
    level: string;
    estimated_minutes: number;
    is_premium: boolean;
  };
  course: {
    title: string;
    slug: string;
    description: string;
  };
  lessons: Array<{
    title: string;
    slug: string;
    lesson_type: string;
    summary: string;
    estimated_minutes: number;
    xp_reward: number;
    difficulty: string;
    sources: string[];
    introduction: string;
    sections: string[];
    scenario: { title: string; text: string };
    mistake: string;
    action: string;
    takeaway: string;
    source_note: string;
  }>;
  resources?: Array<{ title: string; resource_type: string }>;
  glossary?: Array<{ term: string; definition: string; example: string }>;
};

export type LessonEntry = {
  pack: LessonPack;
  lesson: LessonPack["lessons"][number];
};

function contentDirectory() {
  const candidates = [
    path.resolve(process.cwd(), "..", "..", "content", "kenya_investment_lessons"),
    path.resolve(process.cwd(), "content", "kenya_investment_lessons")
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Learning content pack directory was not found.");
  }
  return found;
}

export function loadLessonPacks(): LessonPack[] {
  return fs
    .readdirSync(contentDirectory())
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => {
      const filePath = path.join(contentDirectory(), fileName);
      return JSON.parse(fs.readFileSync(filePath, "utf8")) as LessonPack;
    });
}

export function allLessons(): LessonEntry[] {
  return loadLessonPacks().flatMap((pack) => pack.lessons.map((lesson) => ({ pack, lesson })));
}

export function findLesson(trackSlug: string, lessonSlug: string): LessonEntry | undefined {
  return allLessons().find((entry) => entry.pack.track.slug === trackSlug && entry.lesson.slug === lessonSlug);
}

export function relatedPassportHref(trackSlug: string) {
  const map: Record<string, string> = {
    "global-stocks-and-etfs": "/product-passports/generic-us-etf-route",
    "land-due-diligence-basics": "/product-passports/generic-land-due-diligence-checklist",
    "money-market-funds": "/product-passports/generic-mmf",
    "sacco-smart-member": "/product-passports/generic-sacco-deposits",
    "treasury-bills-and-bonds": "/product-passports/generic-treasury-bill-via-dhowcsd"
  };
  return map[trackSlug] ?? "/product-passports";
}
