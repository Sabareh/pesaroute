import { Pressable, StyleSheet, Text, View } from "react-native";
import type { AmountRangeId, CatalogState, GoalId } from "../types";
import { amountRanges, goalChips } from "../utils/routePlanner";

export function HomeScreen({
  catalog,
  onChooseRoute,
  onOpenScam,
  onRefreshCatalog,
  selectedGoalId
}: {
  catalog: CatalogState;
  onChooseRoute: (amountRangeId: AmountRangeId, goalId: GoalId) => void;
  onOpenScam: () => void;
  onRefreshCatalog: () => Promise<void>;
  selectedGoalId: GoalId;
}) {
  return (
    <View>
      <Text style={styles.eyebrow}>{catalog.loading ? "Loading catalog" : `${catalog.source} mode`}</Text>
      <Text style={styles.title}>Jifunze ku-invest before uweke pesa</Text>
      <Text style={styles.copy}>
        Pick an amount range and goal. PesaRoute will show an educational path, what to learn first, and what to avoid.
      </Text>

      {catalog.error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Using offline fallback</Text>
          <Text style={styles.errorCopy}>{catalog.error}</Text>
          <Pressable accessibilityRole="button" onPress={onRefreshCatalog} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry API</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>How much are you thinking about?</Text>
      <View style={styles.amountGrid}>
        {amountRanges.map((range) => (
          <Pressable
            accessibilityRole="button"
            key={range.id}
            onPress={() => onChooseRoute(range.id, selectedGoalId)}
            style={({ pressed }) => [styles.amountButton, pressed && styles.pressed]}
          >
            <Text style={styles.amountText}>{range.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>What are you trying to do?</Text>
      <View style={styles.chips}>
        {goalChips.map((goal) => (
          <Pressable
            accessibilityRole="button"
            key={goal.id}
            onPress={() => {
              if (goal.id === "scam-check") {
                onOpenScam();
              } else {
                onChooseRoute("5k-20k", goal.id);
              }
            }}
            style={({ pressed }) => [styles.chip, goal.id === selectedGoalId && styles.chipActive, pressed && styles.pressed]}
          >
            <Text style={[styles.chipText, goal.id === selectedGoalId && styles.chipTextActive]}>{goal.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.catalogPanel}>
        <Text style={styles.promiseTitle}>Catalog loaded</Text>
        <Text style={styles.promiseCopy}>
          {catalog.categories.length} categories and {catalog.passports.length} product passports from {catalog.source}.
        </Text>
        <View style={styles.catalogChips}>
          {catalog.categories.slice(0, 6).map((category) => (
            <Text key={category.slug} style={styles.catalogChip}>
              {category.name}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.promisePanel}>
        <Text style={styles.promiseTitle}>Before you move money</Text>
        <Text style={styles.promiseCopy}>Compare options, check red flags, and write down your reason. No PINs, no passwords.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#c86f3c", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#15221d", fontSize: 34, fontWeight: "900", lineHeight: 39, marginTop: 8 },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 12 },
  errorBox: { backgroundColor: "#fff2dc", borderRadius: 8, marginTop: 16, padding: 14 },
  errorTitle: { color: "#7a431e", fontSize: 14, fontWeight: "900" },
  errorCopy: { color: "#7a431e", fontSize: 13, lineHeight: 19, marginTop: 4 },
  retryButton: { alignItems: "center", backgroundColor: "#7a431e", borderRadius: 8, marginTop: 10, paddingVertical: 10 },
  retryText: { color: "#ffffff", fontSize: 13, fontWeight: "900" },
  sectionTitle: { color: "#15221d", fontSize: 15, fontWeight: "900", marginTop: 24 },
  amountGrid: { gap: 10, marginTop: 12 },
  amountButton: {
    backgroundColor: "#0f7b5f",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  amountText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  chip: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  chipActive: { backgroundColor: "#dff5ec", borderColor: "#0f7b5f" },
  chipText: { color: "#30423a", fontSize: 13, fontWeight: "800" },
  chipTextActive: { color: "#0f7b5f" },
  catalogPanel: {
    backgroundColor: "#edf8f3",
    borderRadius: 8,
    marginTop: 24,
    padding: 16
  },
  catalogChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  catalogChip: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    color: "#0f7b5f",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  promisePanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#dbe6df",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 16
  },
  promiseTitle: { color: "#15221d", fontSize: 16, fontWeight: "900" },
  promiseCopy: { color: "#52645b", fontSize: 14, lineHeight: 21, marginTop: 6 },
  pressed: { opacity: 0.78 }
});
