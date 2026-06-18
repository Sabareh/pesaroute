import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { HeroCard, PremiumCard, PrimaryButton, TrustBadge, maliPrime, maliPrimeText } from "../components/maliprime";
import type { JournalEntryDraft, ProductPassport, RouteProfile } from "../types";

function BulletList({ items, tone = "neutral" }: { items: string[]; tone?: "neutral" | "warning" | "good" }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={[styles.dot, tone === "warning" && styles.dotWarning, tone === "good" && styles.dotGood]} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const learningTimeline = [
  "Build your money foundation",
  "Compare safe options",
  "Understand risks and liquidity",
  "Save your decision",
  "Request professional review if needed"
];

export function RouteResultScreen({
  passports,
  profile,
  onSaveJournal
}: {
  passports: ProductPassport[];
  profile: RouteProfile;
  onSaveJournal: (entry: JournalEntryDraft) => void;
}) {
  const [saved, setSaved] = useState(false);
  const relatedPassports = passports
    .filter((passport) => profile.path.join(" ").toLowerCase().includes(passport.category.name.toLowerCase().split(" ")[0]))
    .slice(0, 3);

  function saveDraft() {
    onSaveJournal({
      goal: profile.goalLabel,
      decision: `Explore ${profile.goalLabel} route for ${profile.amountLabel}`,
      amountDisplayMode: "range",
      amountText: profile.amountLabel.replace("I have ", ""),
      reason: "Saved from route result placeholder."
    });
    setSaved(true);
  }

  return (
    <View style={styles.screen}>
      <HeroCard>
        <TrustBadge>Educational path</TrustBadge>
        <Text style={[maliPrimeText.title, styles.heroTitle]}>{profile.goalLabel}</Text>
        <Text style={[maliPrimeText.subtitle, styles.heroCopy]}>
          {profile.amountLabel}. Understand the route, compare the tradeoffs, and save the decision before money moves.
        </Text>
      </HeroCard>

      <PremiumCard>
        <Text style={styles.cardTitle}>Your learning path</Text>
        <View style={styles.timeline}>
          {learningTimeline.map((step, index) => (
            <View key={step} style={styles.timelineRow}>
              <View style={styles.timelineNumber}>
                <Text style={styles.timelineNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.timelineTextWrap}>
                <Text style={styles.timelineTitle}>{step}</Text>
                {profile.path[index % profile.path.length] ? <Text style={styles.timelineCopy}>{profile.path[index % profile.path.length]}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.cardTitle}>Learn first</Text>
        <BulletList items={profile.learnFirst} />
      </PremiumCard>

      <PremiumCard tone="warning">
        <Text style={styles.cardTitle}>Avoid</Text>
        <BulletList items={profile.avoid} tone="warning" />
      </PremiumCard>

      <View style={styles.noteGrid}>
        <PremiumCard tone="alt">
          <Text style={styles.noteTitle}>Risk notes</Text>
          <BulletList items={profile.riskNotes} />
        </PremiumCard>
        <PremiumCard tone="alt">
          <Text style={styles.noteTitle}>Liquidity</Text>
          <BulletList items={profile.liquidityNotes} />
        </PremiumCard>
      </View>

      <PremiumCard>
        <Text style={styles.cardTitle}>Products to understand</Text>
        {relatedPassports.length > 0 ? (
          relatedPassports.map((passport) => (
            <View key={passport.id} style={styles.passportRow}>
              <Text style={styles.passportName}>{passport.name}</Text>
              <Text style={styles.passportMeta}>
                {passport.liquidity_level} liquidity - {passport.risk_level} risk
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.bulletText}>No matching passport yet. Use the API tab to refresh catalog data.</Text>
        )}
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.cardTitle}>Next steps</Text>
        <BulletList
          items={[
            "Save this decision to your private journal.",
            "Use ranges if exact amounts feel too sensitive.",
            "Ask a verified professional only when you are ready to share scoped context."
          ]}
          tone="good"
        />
      </PremiumCard>

      <PrimaryButton onPress={saveDraft}>{saved ? "Saved locally" : "Save to journal"}</PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  heroTitle: { marginTop: 14 },
  heroCopy: { marginTop: 10 },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  timeline: { gap: 14, marginTop: 14 },
  timelineRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  timelineNumber: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderColor: maliPrime.colors.borderStrong,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  timelineNumberText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700" },
  timelineTextWrap: { flex: 1 },
  timelineTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  timelineCopy: { color: maliPrime.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 3 },
  bulletList: { gap: 9, marginTop: 10 },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  dot: { backgroundColor: "#AAB4C2", borderRadius: 5, height: 10, marginTop: 5, width: 10 },
  dotGood: { backgroundColor: maliPrime.colors.emerald },
  dotWarning: { backgroundColor: maliPrime.colors.amber },
  bulletText: { color: maliPrime.colors.textSecondary, flex: 1, fontSize: 14, lineHeight: 21 },
  noteGrid: { gap: 10 },
  noteTitle: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "700" },
  passportRow: { borderTopColor: maliPrime.colors.border, borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  passportName: { color: maliPrime.colors.textPrimary, fontSize: 14, fontWeight: "900" },
  passportMeta: { color: maliPrime.colors.textSecondary, fontSize: 12, fontWeight: "800", marginTop: 4 },
});
