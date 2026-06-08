import { useTheme } from "@/context/ThemeContext";
import colors from "@/constants/colors";

/**
 * Returns the design tokens for the current color scheme.
 * Theme preference (light / dark / system) is managed by ThemeContext
 * and persisted in AsyncStorage.
 */
export function useColors() {
  const { resolvedScheme } = useTheme();
  const palette =
    resolvedScheme === "dark"
      ? colors.dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
