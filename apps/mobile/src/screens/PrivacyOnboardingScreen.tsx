import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { UserProfileApiResponse } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const userTypes: Array<{ label: string; value: UserProfileApiResponse["user_type"] }> = [
  { label: "Student", value: "student" },
  { label: "First jobber", value: "first_jobber" },
  { label: "Professional", value: "professional" },
  { label: "Diaspora", value: "diaspora" },
  { label: "Chama member", value: "chama_member" },
  { label: "Farmer", value: "farmer" },
  { label: "Jua kali", value: "jua_kali" },
  { label: "Other", value: "other" }
];

const amountRanges = ["Not sure yet", "KES 1k-5k", "KES 5k-20k", "KES 20k-100k", "KES 100k-500k", "KES 500k+"];

export function PrivacyOnboardingScreen() {
  const { error, finishPrivacyOnboarding, loading, updateProfile, user } = useAuth();
  const [preferredLanguage, setPreferredLanguage] = useState<"en" | "sw">(user?.profile.preferred_language ?? "en");
  const [userType, setUserType] = useState<UserProfileApiResponse["user_type"]>(user?.profile.user_type ?? "other");
  const [range, setRange] = useState(user?.profile.approximate_investment_range || "Not sure yet");
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState(user?.profile.privacy_mode_enabled ?? true);

  async function savePreferences() {
    await updateProfile({
      preferred_language: preferredLanguage,
      user_type: userType,
      approximate_investment_range: range === "Not sure yet" ? "" : range,
      privacy_mode_enabled: privacyModeEnabled
    });
    finishPrivacyOnboarding();
  }

  return (
    <View>
      <Text style={styles.eyebrow}>Privacy setup</Text>
      <Text style={styles.title}>Choose what PesaRoute remembers</Text>
      <Text style={styles.copy}>
        These preferences help shape language and privacy defaults. You can still use ranges instead of exact amounts.
      </Text>

      <Text style={styles.groupTitle}>Preferred language</Text>
      <View style={styles.pillRow}>
        {[
          { label: "English", value: "en" as const },
          { label: "Swahili", value: "sw" as const }
        ].map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => setPreferredLanguage(option.value)}
            style={[styles.pill, preferredLanguage === option.value && styles.pillActive]}
          >
            <Text style={[styles.pillText, preferredLanguage === option.value && styles.pillTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.groupTitle}>User type</Text>
      <View style={styles.pillRow}>
        {userTypes.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => setUserType(option.value)}
            style={[styles.pill, userType === option.value && styles.pillActive]}
          >
            <Text style={[styles.pillText, userType === option.value && styles.pillTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.groupTitle}>Approximate investment range</Text>
      <View style={styles.pillRow}>
        {amountRanges.map((option) => (
          <Pressable
            accessibilityRole="button"
            key={option}
            onPress={() => setRange(option)}
            style={[styles.pill, range === option && styles.pillActive]}
          >
            <Text style={[styles.pillText, range === option && styles.pillTextActive]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.switchTitle}>Privacy mode</Text>
          <Text style={styles.switchCopy}>Default to less exact data and local-only choices when possible.</Text>
        </View>
        <Switch
          onValueChange={setPrivacyModeEnabled}
          thumbColor={privacyModeEnabled ? "#ffffff" : "#f5f5f5"}
          trackColor={{ false: "#C8D1DE", true: "#2457FF" }}
          value={privacyModeEnabled}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={savePreferences}
        style={[styles.primaryButton, loading && styles.disabled]}
      >
        <Text style={styles.primaryText}>{loading ? "Saving..." : "Save preferences"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={finishPrivacyOnboarding} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Use defaults for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { color: "#F59E0B", fontSize: 13, fontWeight: "900", textTransform: "uppercase" },
  title: { color: "#0B1220", fontSize: 32, fontWeight: "900", lineHeight: 40, marginTop: 10 },
  copy: { color: "#5B6472", fontSize: 16, lineHeight: 24, marginTop: 12 },
  groupTitle: { color: "#0B1220", fontSize: 15, fontWeight: "900", marginTop: 20 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pill: {
    backgroundColor: "#ffffff",
    borderColor: "#E5EAF0",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  pillActive: { backgroundColor: "#EAF0FF", borderColor: "#2457FF" },
  pillText: { color: "#5B6472", fontSize: 13, fontWeight: "900" },
  pillTextActive: { color: "#2457FF" },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E5EAF0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    marginTop: 20,
    padding: 14
  },
  switchText: { flex: 1 },
  switchTitle: { color: "#0B1220", fontSize: 15, fontWeight: "900" },
  switchCopy: { color: "#5B6472", fontSize: 13, lineHeight: 19, marginTop: 4 },
  error: { color: "#A86500", fontSize: 13, lineHeight: 19, marginTop: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2457FF",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 20,
    minHeight: 52
  },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#EAF0FF",
    borderRadius: 16,
    justifyContent: "center",
    marginTop: 10,
    minHeight: 48
  },
  secondaryText: { color: "#2457FF", fontSize: 13, fontWeight: "900" },
  disabled: { backgroundColor: "#9FB2D6" }
});
