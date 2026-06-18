import { StyleSheet, Text, View } from "react-native";
import { PremiumCard, maliPrime, maliPrimeText } from "../components/maliprime";

const notices = [
  "PesaRoute provides educational information and decision-support tools only.",
  "PesaRoute does not hold money, execute investments, promise returns, or provide custody.",
  "PesaRoute does not ask for M-Pesa PINs, bank passwords, broker credentials, MMF credentials, OTPs, private keys, or seed phrases.",
  "Verify current rates, fees, liquidity rules, licenses, and product terms with the provider, regulator, or a licensed professional where needed.",
  "Professional sharing should be explicit, scoped, time-limited, revocable, and controlled by you."
];

export function TermsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={maliPrimeText.eyebrow}>Terms & Conditions</Text>
      <Text style={maliPrimeText.title}>Service boundaries and privacy notices</Text>
      <Text style={maliPrimeText.subtitle}>
        These notices live here so learning, simulation, and passport screens can stay focused on the task.
      </Text>

      <PremiumCard>
        <Text style={styles.cardTitle}>Core notices</Text>
        <View style={styles.noticeList}>
          {notices.map((notice) => (
            <View key={notice} style={styles.noticeRow}>
              <View style={styles.dot} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ))}
        </View>
      </PremiumCard>

      <PremiumCard>
        <Text style={styles.cardTitle}>Using PesaRoute</Text>
        <Text style={styles.noticeText}>
          Use PesaRoute to learn, compare options, run simulations, record decisions, and prepare better questions
          before acting outside the platform. Do not treat any screen as a personal recommendation, offer, or
          instruction to buy or sell a financial product.
        </Text>
      </PremiumCard>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  cardTitle: { color: maliPrime.colors.textPrimary, fontSize: 16, fontWeight: "900" },
  noticeList: { gap: 12, marginTop: 12 },
  noticeRow: { flexDirection: "row", gap: 10 },
  dot: { backgroundColor: maliPrime.colors.textPrimary, borderRadius: 99, height: 6, marginTop: 7, width: 6 },
  noticeText: { color: maliPrime.colors.textSecondary, flex: 1, fontSize: 14, lineHeight: 21 }
});
