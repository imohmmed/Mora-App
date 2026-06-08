import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedScheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "system",
  setMode: () => {},
  resolvedScheme: "light",
});

const STORAGE_KEY = "mora_theme_mode_v1";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "light" || val === "dark" || val === "system") {
        setModeState(val);
      }
    });
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const resolvedScheme: "light" | "dark" =
    mode === "system" ? (systemScheme ?? "light") : mode;

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
