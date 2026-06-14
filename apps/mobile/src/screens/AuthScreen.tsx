import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { PrivacyPromiseCard, maliPrime, maliPrimeText } from "../components/maliprime";

const trustPromises = [
  "We do not ask for M-Pesa PIN.",
  "We do not ask for bank passwords.",
  "We do not ask for broker credentials.",
  "You can use ranges instead of exact amounts.",
  "You control what you share with professionals.",
  "We do not hold or execute investments."
];

type AuthMode = "welcome" | "register" | "login";

export function AuthScreen({ onDone }: { onDone?: () => void }) {
  const { continueAnonymously, error, loading, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function resetForm(nextMode: AuthMode) {
    setMode(nextMode);
    setLocalError(null);
  }

  async function submitLogin() {
    if (!username.trim() || !password) {
      setLocalError("Enter your PesaRoute username and password.");
      return;
    }
    try {
      await login({ username: username.trim(), password });
      onDone?.();
    } catch {
      setLocalError(null);
    }
  }

  async function submitRegister() {
    if (!username.trim() || password.length < 8) {
      setLocalError("Use a username and a password with at least 8 characters.");
      return;
    }
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password,
        role: "consumer",
        preferred_language: "en",
        user_type: "other",
        privacy_mode_enabled: true
      });
      onDone?.();
    } catch {
      setLocalError(null);
    }
  }

  function handleContinueAnonymously() {
    continueAnonymously();
    onDone?.();
  }

  if (mode === "welcome") {
    return (
      <View>
        <Text style={maliPrimeText.eyebrow}>Privacy-first investing education</Text>
        <Text style={[maliPrimeText.title, styles.titleSpacing]}>Jifunze first. Move money elsewhere.</Text>
        <Text style={[maliPrimeText.subtitle, styles.copySpacing]}>
          Use PesaRoute anonymously for learning, routes, simulators, and scam checks. Create an account only when you
          want to sync private journal or portfolio mirror data.
        </Text>

        <View style={styles.promiseList}>
          {trustPromises.map((promise) => (
            <PrivacyPromiseCard key={promise} text={promise} />
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={handleContinueAnonymously} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Continue anonymously</Text>
        </Pressable>
        <View style={styles.buttonRow}>
          <Pressable accessibilityRole="button" onPress={() => resetForm("register")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Create account</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => resetForm("login")} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Log in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isRegister = mode === "register";

  return (
    <View>
      <Text style={maliPrimeText.eyebrow}>{isRegister ? "Create account" : "Welcome back"}</Text>
      <Text style={[maliPrimeText.title, styles.titleSpacing]}>{isRegister ? "Save privately when ready" : "Log in to sync private notes"}</Text>
      <Text style={[maliPrimeText.subtitle, styles.copySpacing]}>
        Use only your PesaRoute password here. Never enter your M-Pesa PIN, bank password, broker login, MMF password,
        or wallet secret.
      </Text>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor="#7D8794"
          style={styles.input}
          value={username}
        />
        {isRegister ? (
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email optional"
            placeholderTextColor="#7D8794"
            style={styles.input}
            value={email}
          />
        ) : null}
        <TextInput
          onChangeText={setPassword}
          placeholder="PesaRoute password"
          placeholderTextColor="#7D8794"
          secureTextEntry
          style={styles.input}
          value={password}
        />
      </View>

      {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        disabled={loading}
        onPress={isRegister ? submitRegister : submitLogin}
        style={[styles.primaryButton, loading && styles.disabled]}
      >
        <Text style={styles.primaryText}>{loading ? "Please wait..." : isRegister ? "Create account" : "Log in"}</Text>
      </Pressable>
      <View style={styles.buttonRow}>
        <Pressable accessibilityRole="button" onPress={() => resetForm("welcome")} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => resetForm(isRegister ? "login" : "register")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>{isRegister ? "I have an account" : "Create account"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleSpacing: { marginTop: 10 },
  copySpacing: { marginTop: 12 },
  promiseList: { gap: 10, marginTop: 20 },
  form: { gap: 10, marginTop: 20 },
  input: {
    backgroundColor: maliPrime.colors.surface,
    borderColor: maliPrime.colors.border,
    borderRadius: maliPrime.radius.md,
    borderWidth: 1,
    color: maliPrime.colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14
  },
  error: { color: maliPrime.colors.danger, fontSize: 13, lineHeight: 19, marginTop: 10 },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  primaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.primary,
    borderRadius: maliPrime.radius.md,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 14
  },
  primaryText: { color: maliPrime.colors.surface, fontSize: 15, fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12
  },
  secondaryText: { color: maliPrime.colors.primary, fontSize: 13, fontWeight: "900", textAlign: "center" },
  disabled: { backgroundColor: "#9FB2D6" }
});
