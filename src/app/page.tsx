import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Icon } from "@/components/ui/Icon";
import { facilities } from "@/config/facilities";
import styles from "./overview.module.css";
export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Studio administration workspace."
      />
      <div className={styles.overview}>
        <section aria-labelledby="tools-heading">
          <h2 id="tools-heading">Tools</h2>
          <div className={styles.shortcuts}>
            <Link href="/requests">
              <Icon name="requests" />
              <div>
                <strong>Internal Requests</strong>
                <p>
                  Review requests across{" "}
                  {facilities.map((facility) => facility.name).join(" and ")}.
                  Approve or deny selected sessions.
                </p>
              </div>
              <Icon name="arrow" />
            </Link>
            <Link href="/calendar">
              <Icon name="calendar" />
              <div>
                <strong>Calendar &amp; Daily List</strong>
                <p>View studio schedules and read-only session details.</p>
              </div>
              <Icon name="arrow" />
            </Link>
            <Link href="/settings">
              <Icon name="settings" />
              <div>
                <strong>Settings</strong>
                <p>Choose Dark, Light, or Belmont appearance.</p>
              </div>
              <Icon name="arrow" />
            </Link>
          </div>
        </section>
        <section aria-labelledby="facilities-heading">
          <h2 id="facilities-heading">Configured facilities</h2>
          <ul className={styles.facilities}>
            {facilities.map((facility) => (
              <li key={facility.key}>
                <strong>{facility.name}</strong>
                <span>Studio Assistant #{facility.studioAssistantId}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            Facility configuration only. Open Internal Requests to load the
            current queues.
          </p>
        </section>
      </div>
    </>
  );
}
