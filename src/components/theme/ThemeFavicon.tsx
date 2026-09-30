"use client";
import { useEffect } from "react";
import { useTheme } from "./ThemeProvider";

/** The root layout supplies a valid icon before the saved theme is available. */
export function ThemeFavicon() {
  const { theme } = useTheme();
  useEffect(() => {
    const icon = document.getElementById("theme-favicon") as HTMLLinkElement | null;
    if (icon) icon.href = `/favicon-${theme}.svg`;
  }, [theme]);
  return null;
}
