import { StyleSheet, Text, View } from "react-native";

export function ProfessionalsScreen() {
  return (
    <View>
      <Text style={styles.title}>Professionals</Text>
      <Text style={styles.copy}>Verified professional review is a later phase with explicit, time-limited consent.</Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Placeholder</Text>
        <Text style={styles.panelCopy}>
          No real booking or payment integration in MVP. Consultation requests are backend placeholders only.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#15221d", fontSize: 30, fontWeight: "900" },
  copy: { color: "#52645b", fontSize: 16, lineHeight: 24, marginTop: 10 },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#e3ece7",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 20,
    padding: 16
  },
  panelTitle: { color: "#15221d", fontSize: 16, fontWeight: "900" },
  panelCopy: { color: "#627469", fontSize: 14, lineHeight: 21, marginTop: 6 }
});
