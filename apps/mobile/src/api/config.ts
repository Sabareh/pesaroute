import Constants from "expo-constants";
import { Platform } from "react-native";

type ExtraConfig = {
  apiBaseUrl?: string;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const extra = (Constants.expoConfig?.extra ?? Constants.manifest2?.extra ?? {}) as ExtraConfig;
  const configured = envUrl || extra.apiBaseUrl || "http://localhost:8000";

  if (Platform.OS === "android" && configured.includes("localhost")) {
    return trimTrailingSlash(configured.replace("localhost", "10.0.2.2"));
  }

  return trimTrailingSlash(configured);
}
