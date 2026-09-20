import styles from "./overview.module.css";
export default function LoadingOverview() {
  return <><header className={styles.pageHeader}><h1>Overview</h1></header><section className={styles.console} aria-busy="true" aria-label="Loading today's studio activity and requests"><div className={styles.todayHeader}><div><p className={styles.date}>Today</p><p role="status">Loading studio activity and requests…</p></div></div><div className={`${styles.content} ${styles.loadingBody}`} aria-hidden="true"><div className={styles.activity}>{Array.from({length:6},(_,i)=><div className={styles.skeleton} key={i}/>)}</div><div className={styles.attention}><div className={styles.skeleton}/></div><div className={styles.month}><div className={styles.skeleton}/></div></div></section></>;
}
