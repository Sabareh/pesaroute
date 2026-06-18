import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { maliPrime, maliPrimeText } from "../components/maliprime";

type AuthMode = "welcome" | "register" | "login";

export function AuthScreen({ onDone }: { onDone?: () => void }) {
  const { continueAnonymously, error, loading, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("welcome");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
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
        privacy_mode_enabled: true,
        invite_code: inviteCode.trim() || undefined
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
      <Text style={[maliPrimeText.subtitle, styles.copySpacing]}>Enter your PesaRoute account details to sync private notes.</Text>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          onChangeText={setUsername}
          placeholder="Username"
          placeholderTextColor={maliPrime.colors.textTertiary}
          style={styles.input}
          value={username}
        />
        {isRegister ? (
          <>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email optional"
              placeholderTextColor={maliPrime.colors.textTertiary}
              style={styles.input}
              value={email}
            />
            <TextInput
              autoCapitalize="characters"
              onChangeText={setInviteCode}
              placeholder="Beta invite code if required"
              placeholderTextColor={maliPrime.colors.textTertiary}
              style={styles.input}
              value={inviteCode}
            />
          </>
        ) : null}
        <TextInput
          onChangeText={setPassword}
          placeholder="PesaRoute password"
          placeholderTextColor={maliPrime.colors.textTertiary}
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
  primaryText: { color: maliPrime.colors.surface, fontSize: 15, fontWeight: "700" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: maliPrime.colors.surfaceAlt,
    borderRadius: maliPrime.radius.md,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12
  },
  secondaryText: { color: maliPrime.colors.textPrimary, fontSize: 13, fontWeight: "700", textAlign: "center" },
  disabled: { backgroundColor: maliPrime.colors.textTertiary }
});
