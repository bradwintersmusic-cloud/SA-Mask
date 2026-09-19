"use client";
import { themes, useTheme, type Theme } from "./ThemeProvider";
import styles from "./theme.module.css";
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return (
    <label className={styles.switcher}>
      <span>Appearance</span>
      <select
        aria-label="Appearance"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
      >
        {themes.map((value) => (
          <option value={value} key={value}>
            {value[0].toUpperCase() + value.slice(1)}
          </option>
        ))}
      </select>
    </label>
  );
}
