import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { StudioSession } from "@/lib/studio-assistant/types";
import { sessionLabel, roomLabel } from "@/lib/calendar/display";
import { sessionDateTime } from "@/lib/calendar/time";
import styles from "./calendar.module.css";
export function SessionDetailsModal({
  session,
  onClose,
}: {
  session: StudioSession | null;
  onClose: () => void;
}) {
  const fields = session
    ? [
        ["Contact", session.contactName],
        ["Email", session.contactEmail],
        ["Facility", session.facilityName],
        ["Studio", roomLabel(session)],
        ["Starts", sessionDateTime(session.start) ?? session.rawStart],
        ["Ends", sessionDateTime(session.end) ?? session.rawEnd],
        [
          "Duration",
          session.start &&
          session.end &&
          Date.parse(session.end) > Date.parse(session.start)
            ? `${Math.round((Date.parse(session.end) - Date.parse(session.start)) / 60_000)} minutes`
            : null,
        ],
        ["Project", session.projectName],
        ["Project code", session.projectCode],
        ["Service", session.serviceName],
      ]
    : [];
  const metadata = session
    ? [
        ["Session ID", session.id],
        ["Booking ID", session.bookingId],
        ["Project ID", session.projectId],
        ["Room ID", session.roomId],
        ["Session type", session.sessionType],
        ["Booking type", session.bookingType],
        ["Status", session.status],
        ["Source timezone", session.timezone],
      ]
    : [];
  return (
    <Modal
      open={!!session}
      onClose={onClose}
      title={session ? sessionLabel(session) : "Session details"}
      description="Read only · All displayed times are America/Chicago."
    >
      <dl className={styles.details}>
        {fields
          .filter(([, value]) => value !== null)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      {session?.notes && (
        <section className={styles.notes}>
          <h3>Notes</h3>
          <p>{session.notes}</p>
        </section>
      )}
      <dl className={`${styles.details} ${styles.metadata}`}>
        {metadata
          .filter(([, value]) => value !== null)
          .map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
      <div className={styles.modalFooter}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
