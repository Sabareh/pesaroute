import { StyleSheet, Text, View } from "react-native";
import { lessons } from "../data/mockData";

export function LearnScreen() {
  return (
    <View>
      <Text style={styles.title}>Learn</Text>
      <Text style={styles.copy}>Short Kenya-first explainers for comparing options without investment execution.</Text>
      <View style={styles.list}>
        {lessons.map((lesson, index) => (
          <View key={lesson} style={styles.item}>
            <Text style={styles.count}>{index + 1}</Text>
            <Text style={styles.lesson}>{lesson}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: "#0B1220", fontSize: 30, fontWeight: "900" },
  copy: { color: "#5B6472", fontSize: 16, lineHeight: 24, marginTop: 10 },
  list: { gap: 10, marginTop: 20 },
  item: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E5EAF0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  count: {
    backgroundColor: "#EAF0FF",
    borderRadius: 16,
    color: "#2457FF",
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  lesson: { color: "#0B1220", flex: 1, fontSize: 15, fontWeight: "800" }
});
