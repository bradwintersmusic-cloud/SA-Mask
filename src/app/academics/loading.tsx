import { PageHeader } from "@/components/layout/PageHeader";
import styles from "./academics.module.css";
export default function Loading() { return <><PageHeader title="Academics" description="Classes, Projects, and Shares that govern academic studio access."/><section className={styles.panel} aria-busy="true"><p role="status">Loading Classes, Projects, and facility Shares…</p><div aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div className={styles.skeleton} key={i}/>)}</div></section></>; }
