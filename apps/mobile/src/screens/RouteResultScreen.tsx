import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { JournalEntry, ProductPassport, RouteProfile } from "../types";

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

export function RouteResultScreen({
  passports,
  profile,
  onSaveJournal
}: {
  passports: ProductPassport[];
  profile: RouteProfile;
  onSaveJournal: (entry: JournalEntry) => void;
}) {
  const [saved, setSaved] = useState(false);
  const relatedPassports = passports
    .filter((passport) => profile.path.join(" ").toLowerCase().includes(passport.category.name.toLowerCase().split(" ")[0]))
    .slice(0, 3);

  function saveDraft() {
    onSaveJournal({
      id: `route-${Date.now()}`,
      goal: profile.goalLabel,
      decision: `Explore ${profile.goalLabel} route for ${profile.amountLabel}`,
      amountDisplayMode: "range",
      amountText: profile.amountLabel.replace("I have ", ""),
      reason: "Saved from route result placeholder.",
      createdAt: new Date().toLocaleDateString("en-KE")
    });
    setSaved(true);
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Educational path</Text>
      <Text style={styles.title}>{profile.goalLabel}</Text>
      <Text style={styles.copy}>{profile.amountLabel}. Compare options first; PesaRoute does not execute investments.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Path to consider</Text>
        <BulletList items={profile.path} tone="good" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Learn first</Text>
        <BulletList items={profile.learnFirst} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Avoid</Text>
        <BulletList items={profile.avoid} tone="warning" />
      </View>

      <View style={styles.noteGrid}>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Risk notes</Text>
          <BulletList items={profile.riskNotes} />
        </View>
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Liquidity</Text>
          <BulletList items={profile.liquidityNotes} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Product passports</Text>
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
      </View>

      <Pressable accessibilityRole="button" onPress={saveDraft} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <Text style={styles.ctaText}>{saved ? "Saved locally" : "Save to journal"}</Text>
      </Pressable>
      <Text style={styles.disclaimer}>Educational simulation only. Speak to a licensed professional before acting.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#c86f3c", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#15221d", fontSize: 30, fontWeight: "900", marginTop: 8 },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16
  },
  cardTitle: { color: "#15221d", fontSize: 16, fontWeight: "900" },
  bulletList: { gap: 9, marginTop: 10 },
  bulletRow: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  dot: { backgroundColor: "#91a39a", borderRadius: 5, height: 10, marginTop: 5, width: 10 },
  dotGood: { backgroundColor: "#0f7b5f" },
  dotWarning: { backgroundColor: "#c86f3c" },
  bulletText: { color: "#52645b", flex: 1, fontSize: 14, lineHeight: 21 },
  noteGrid: { gap: 10, marginTop: 14 },
  noteCard: { backgroundColor: "#edf8f3", borderRadius: 8, padding: 14 },
  noteTitle: { color: "#0f7b5f", fontSize: 14, fontWeight: "900" },
  passportRow: { borderTopColor: "#e3ece7", borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  passportName: { color: "#15221d", fontSize: 14, fontWeight: "900" },
  passportMeta: { color: "#627469", fontSize: 12, fontWeight: "800", marginTop: 4 },
  cta: {
    alignItems: "center",
    backgroundColor: "#15221d",
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52
  },
  ctaText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  disclaimer: { color: "#6a776f", fontSize: 12, lineHeight: 18, marginTop: 10 },
  pressed: { opacity: 0.78 }
});
