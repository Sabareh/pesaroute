import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

export const maliPrime = {
  colors: {
    background: "#F7F8FB",
    surface: "#FFFFFF",
    surfaceAlt: "#F1F4F9",
    textPrimary: "#0B1220",
    textSecondary: "#5B6472",
    border: "#E5EAF0",
    primary: "#2457FF",
    primaryDark: "#0B1B33",
    emerald: "#0FA36B",
    amber: "#F59E0B",
    danger: "#E5484D",
    purpleAccent: "#6D5DFB"
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 999
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24
  },
  shadow: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 3
  }
} as const;

type PressableProps = {
  children: ReactNode;
  disabled?: boolean;
  onPress?: () => void;
};

function pressedStyle({ pressed }: { pressed: boolean }) {
  return pressed ? { opacity: 0.82 } : null;
}

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function PremiumCard({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "alt" | "warning" | "success" }) {
  return <View style={[styles.card, tone === "alt" && styles.cardAlt, tone === "warning" && styles.cardWarning, tone === "success" && styles.cardSuccess]}>{children}</View>;
}

export function HeroCard({ children }: { children: ReactNode }) {
  return <View style={styles.heroCard}>{children}</View>;
}

export function PrimaryButton({ children, disabled, onPress }: PressableProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={(state) => [styles.primaryButton, disabled && styles.disabled, pressedStyle(state)]}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ children, disabled, onPress }: PressableProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={(state) => [styles.secondaryButton, disabled && styles.disabledSecondary, pressedStyle(state)]}
    >
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function AmountRangeButton({ active = false, label, onPress }: { active?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={(state) => [styles.amountButton, active && styles.amountButtonActive, pressedStyle(state)]}>
      <View style={styles.amountButtonRow}>
        <Text style={[styles.amountButtonText, active && styles.amountButtonTextActive]}>{label}</Text>
        {active ? <Ionicons name="checkmark-circle" size={20} color={maliPrime.colors.primary} /> : null}
      </View>
    </Pressable>
  );
}

export function GoalChip({ active = false, label, onPress }: { active?: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={(state) => [styles.goalChip, active && styles.goalChipActive, pressedStyle(state)]}>
      <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function RiskBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  const tone = normalized.includes("high") ? "danger" : normalized.includes("moderate") ? "amber" : "emerald";
  return <TrustBadge tone={tone}>{level} risk</TrustBadge>;
}

export function LiquidityBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  const tone = normalized.includes("high") ? "emerald" : normalized.includes("low") || normalized.includes("locked") ? "amber" : "primary";
  return <TrustBadge tone={tone}>{level} liquidity</TrustBadge>;
}

export function PrivacyPromiseCard({ text }: { text: string }) {
  return (
    <PremiumCard>
      <View style={styles.promiseRow}>
        <View style={styles.promiseDot} />
        <Text style={styles.promiseText}>{text}</Text>
      </View>
    </PremiumCard>
  );
}

export function SimulatorCard({ meta, title, value }: { meta?: string; title: string; value: string }) {
  return (
    <PremiumCard>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
    </PremiumCard>
  );
}

export function ProductPassportCard({
  body,
  liquidity,
  name,
  onPress,
  risk
}: {
  body: string;
  liquidity: string;
  name: string;
  onPress?: () => void;
  risk: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={(state) => [styles.card, pressedStyle(state)]}>
      <Text style={styles.cardTitle}>{name}</Text>
      <Text numberOfLines={3} style={styles.cardBody}>{body}</Text>
      <View style={styles.badgeRow}>
        <RiskBadge level={risk} />
        <LiquidityBadge level={liquidity} />
      </View>
    </Pressable>
  );
}

export function ProfessionalCard({
  body,
  firm,
  name,
  onPress,
  specialty
}: {
  body: string;
  firm: string;
  name: string;
  onPress?: () => void;
  specialty: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={(state) => [styles.card, pressedStyle(state)]}>
      <TrustBadge tone="emerald">Verified</TrustBadge>
      <Text style={[styles.cardTitle, styles.cardTitleSpaced]}>{name}</Text>
      <Text style={styles.cardMeta}>{firm}</Text>
      <Text style={styles.cardAccent}>{specialty}</Text>
      <Text style={styles.cardBody}>{body}</Text>
    </Pressable>
  );
}

export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <PremiumCard>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </PremiumCard>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.stateRow}>
      <ActivityIndicator color={maliPrime.colors.primary} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function TrustBadge({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "emerald" | "amber" | "danger" | "muted" }) {
  return (
    <Text
      style={[
        styles.badge,
        tone === "emerald" && styles.badgeEmerald,
        tone === "amber" && styles.badgeAmber,
        tone === "danger" && styles.badgeDanger,
        tone === "muted" && styles.badgeMuted
      ]}
    >
      {children}
    </Text>
  );
}

export const maliPrimeText = StyleSheet.create({
  eyebrow: {
    color: maliPrime.colors.primary,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: maliPrime.colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38
  },
  subtitle: {
    color: maliPrime.colors.textSecondary,
    fontSize: 16,
    lineHeight: 24
  },
  sectionTitle: {
    color: maliPrime.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  }
});

const styles = StyleSheet.create({
  screen: {
    gap: maliPrime.spacing.lg
  },
  card: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    padding: maliPrime.spacing.lg,
    ...maliPrime.shadow
  },
  cardAlt: {
    backgroundColor: maliPrime.colors.surfaceAlt
  },
  cardWarning: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F7D79A"
  },
  cardSuccess: {
    backgroundColor: "#EBF8F2",
    borderColor: "#C9EDDD"
  },
  heroCard: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: "#DCE5FF",
    borderRadius: maliPrime.radius.xl,
    borderWidth: 1,
    padding: maliPrime.spacing.xl,
    ...maliPrime.shadow
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: maliPrime.spacing.lg
  },
  primaryButtonText: {
    color: maliPrime.colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: maliPrime.spacing.lg
  },
  secondaryButtonText: {
    color: maliPrime.colors.textPrimary,
    fontSize: 14,
    fontWeight: "900"
  },
  disabled: {
    backgroundColor: "#9FB2D6"
  },
  disabledSecondary: {
    opacity: 0.6
  },
  amountButton: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.lg,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: maliPrime.spacing.lg
  },
  amountButtonActive: {
    backgroundColor: "#EAF0FF",
    borderColor: maliPrime.colors.primary
  },
  amountButtonRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: maliPrime.spacing.sm,
    justifyContent: "space-between"
  },
  amountButtonText: {
    color: maliPrime.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  amountButtonTextActive: {
    color: maliPrime.colors.primary
  },
  goalChip: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  goalChipActive: {
    backgroundColor: "#EAF0FF",
    borderColor: maliPrime.colors.primary
  },
  goalChipText: {
    color: maliPrime.colors.textSecondary,
    fontSize: 13,
    fontWeight: "900"
  },
  goalChipTextActive: {
    color: maliPrime.colors.primary
  },
  promiseRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: maliPrime.spacing.md
  },
  promiseDot: {
    backgroundColor: maliPrime.colors.emerald,
    borderRadius: 6,
    height: 12,
    width: 12
  },
  promiseText: {
    color: maliPrime.colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  cardTitle: {
    color: maliPrime.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900"
  },
  cardTitleSpaced: {
    marginTop: 12
  },
  cardValue: {
    color: maliPrime.colors.primary,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
    marginTop: 8
  },
  cardMeta: {
    color: maliPrime.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5
  },
  cardAccent: {
    color: maliPrime.colors.primary,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8
  },
  cardBody: {
    color: maliPrime.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  badge: {
    backgroundColor: "#EAF0FF",
    borderRadius: maliPrime.radius.pill,
    color: maliPrime.colors.primary,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
    textTransform: "capitalize"
  },
  badgeEmerald: {
    backgroundColor: "#E9F8F1",
    color: maliPrime.colors.emerald
  },
  badgeAmber: {
    backgroundColor: "#FFF7E8",
    color: "#A86500"
  },
  badgeDanger: {
    backgroundColor: "#FDECEC",
    color: maliPrime.colors.danger
  },
  badgeMuted: {
    backgroundColor: maliPrime.colors.surfaceAlt,
    color: maliPrime.colors.textSecondary
  },
  emptyTitle: {
    color: maliPrime.colors.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center"
  },
  emptyBody: {
    color: maliPrime.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center"
  },
  stateRow: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: maliPrime.spacing.sm,
    padding: maliPrime.spacing.lg
  },
  stateText: {
    color: maliPrime.colors.textSecondary,
    fontSize: 14,
    fontWeight: "800"
  },
  errorState: {
    backgroundColor: "#FDECEC",
    borderColor: "#F8C7C9",
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    padding: maliPrime.spacing.lg
  },
  errorText: {
    color: maliPrime.colors.danger,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  }
});
