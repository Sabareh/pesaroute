import { StyleSheet, Text, View } from "react-native";

const settings = [
  "We do not ask for M-Pesa PIN",
  "We do not ask for bank passwords",
  "You can use ranges instead of exact amounts",
  "You control what you share with professionals",
  "We do not hold or execute investments"
];

export function PrivacySettingsScreen() {
  return (
    <View>
      <Text style={styles.title}>Privacy</Text>
      <Text style={styles.copy}>Trust promises for the consumer MVP. Keep control of your money and your information.</Text>
      <View style={styles.list}>
        {settings.map((setting) => (
          <View key={setting} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.setting}>{setting}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  list: { gap: 10, marginTop: 20 },
  row: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  dot: { backgroundColor: "#0f7b5f", borderRadius: 6, height: 12, width: 12 },
  setting: { color: "#15221d", flex: 1, fontSize: 14, fontWeight: "800", lineHeight: 20 }
});
