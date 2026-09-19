"use client";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { themes, useTheme } from "@/components/theme/ThemeProvider";
import styles from "./settings.module.css";
const descriptions = {
  dark: "A quiet, studio-console palette.",
  light: "A bright workspace with room to breathe.",
  belmont: "Belmont blue, with a touch of red.",
};
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="stack">
      <Card>
        <div className={styles.heading}>
          <div>
            <h2>Appearance</h2>
            <p>
              Choose your workspace palette. Your preference is saved in this
              browser.
            </p>
          </div>
          <StatusBadge tone="accent">Personal preference</StatusBadge>
        </div>
        <div
          className={styles.themes}
          role="group"
          aria-label="Theme selection"
        >
          {themes.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`${styles.themeOption} ${theme === value ? styles.selected : ""}`}
            >
              <span data-theme={value} className={styles.swatch}>
                <span />
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span className={styles.themeLabel}>
                {value[0].toUpperCase() + value.slice(1)}
                <span className={styles.radio}>
                  {theme === value ? "✓" : ""}
                </span>
              </span>
              <span className={styles.themeDescription}>
                {descriptions[value]}
              </span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
