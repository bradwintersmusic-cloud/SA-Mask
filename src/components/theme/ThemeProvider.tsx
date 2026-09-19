"use client";
import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export const themes = ["dark", "light", "belmont"] as const;
export type Theme = (typeof themes)[number];
const storageKey = "sa-mask-theme";
function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}
function getTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "dark";
}
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("theme-change"));
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === null)
      applyTheme(isTheme(event.newValue) ? event.newValue : "dark");
  };
  window.addEventListener("theme-change", callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("theme-change", callback);
    window.removeEventListener("storage", onStorage);
  };
}
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);
// Apply the saved preference before first paint; storage may be blocked by the browser.
export const themeScript = `try{const t=localStorage.getItem('${storageKey}');document.documentElement.dataset.theme=${JSON.stringify(themes)}.includes(t)?t:'dark'}catch{}`;
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribe,
    getTheme,
    () => "dark" as Theme,
  );
  function setTheme(value: Theme) {
    applyTheme(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* The selection still works for this visit. */
    }
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme requires ThemeProvider");
  return context;
}
