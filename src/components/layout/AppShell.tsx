import type { ReactNode } from "react";
import { Navigation } from "./Navigation";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { Icon } from "@/components/ui/Icon";
import styles from "./layout.module.css";
function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.mark}>
        <span />
        <span />
        <span />
        <span />
      </span>
      <div>
        Studio Assistant<small>PRODUCTION · READ ONLY</small>
      </div>
    </div>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a className={styles.skip} href="#main-content">
        Skip to content
      </a>
      <aside className={styles.sidebar}>
        <Brand />
        <p className={`${styles.navCaption} eyebrow`}>Workspace</p>
        <Navigation />
        <div className={styles.sidebarFooter}>
          <Icon name="layers" />
          <div>
            <strong>Studio operations</strong>
            <p>34MSE / REM</p>
          </div>
        </div>
        <div className={styles.version}>
          <span className="eyebrow">SA / ADMIN</span>
          <span>v0.1</span>
        </div>
      </aside>
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.desktopCrumb}>
            Workspace <span>/</span> <strong>Production · Read Only</strong>
          </div>
          <div className={styles.mobileBrand}>
            <Brand />
          </div>
          <ThemeSwitcher />
        </header>
        <main id="main-content" className={styles.main} tabIndex={-1}>
          {children}
        </main>
        <footer className={styles.footer}>
          <span>Studio Assistant is the source of truth.</span>
          <span>
            Internal workspace <span className={styles.dot}>•</span> v0.1.0
          </span>
        </footer>
      </div>
      <Navigation mobile />
    </>
  );
}
