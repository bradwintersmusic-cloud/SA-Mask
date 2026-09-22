"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BatchConfirmationModal } from "@/components/ui/BatchConfirmationModal";
import { removeStudents } from "./actions";
import { classEmail } from "@/lib/email/class-email";
import type { StudioClass, ClassRoster } from "@/lib/studio-assistant/enrollment-types";
import styles from "./class-actions.module.css";
export function ClassActions({ course, roster, writesEnabled, busy, onRefresh, onResult, onBusy }: { course: StudioClass; roster: ClassRoster; writesEnabled: boolean; busy: boolean; onRefresh: () => Promise<void>; onResult: (message: string) => void; onBusy: (busy: boolean) => void }) {
  const [preview, setPreview] = useState(false);
  const [remove, setRemove] = useState<number[] | null>(null);
  const [removing, setRemoving] = useState(false);
  const removalLock = useRef(false);
  const students = roster.users.filter(user => user.role === "student");
  async function executeRemoval() {
    if (!remove?.length || removalLock.current || !writesEnabled) return;
    removalLock.current = true; setRemoving(true); onBusy(true);
    try {
      const result = await removeStudents(course.id, remove);
      onResult(result.data ? `${result.data.removedUserIds.length} students removed. ${result.data.failures.length} removals could not be confirmed.${result.data.failures.length ? " Failed member IDs: " + result.data.failures.map(item => item.userId).join(", ") : ""}` : result.error ?? "Removal unavailable.");
      setRemove(null);
      await onRefresh();
    } catch { onResult("Removal could not be confirmed. Refresh before retrying."); }
    finally { removalLock.current = false; setRemoving(false); onBusy(false); }
  }
  const [feedback, setFeedback] = useState("");
  const email = classEmail(course, roster.users);
  const name = course.name ?? course.code ?? `Class #${course.id}`;
  async function copy() {
    try { await navigator.clipboard.writeText(email.mailto); setFeedback("Mailto link copied."); }
    catch { setFeedback("Clipboard access failed. Select and copy the link below."); }
  }
  return <>
    <div className={styles.actions}>
      <Button variant="secondary" disabled={!email.recipients.length} onClick={() => { setFeedback(""); setPreview(true); }}>Email Class ({email.recipients.length})</Button>
      <Button variant="danger" disabled={!writesEnabled || busy || removing || !students.length} onClick={() => setRemove(students.map(user => user.id))}>Remove All Students</Button>
    </div>
    {roster.users.some(user => user.role === "unknown") && <p>Members with unknown roles are excluded from Remove All Students.</p>}
    {!email.recipients.length && <p>No enrolled students have valid email addresses.</p>}
    {preview && <Modal open onClose={() => setPreview(false)} title={`Email ${name}`} description="Open a draft in your default mail application. You review and send it there; this dashboard never sends email.">
      <p><strong>{email.recipients.length} recipients · BCC</strong></p>
      <ul className={styles.recipients} aria-label="BCC recipients">{email.recipients.map(address => <li key={address}>{address}</li>)}</ul>
      <p><strong>Subject</strong><br />{email.subject}</p>
      {email.unusuallyLong && <p className={styles.note}>This link is long. Some mail applications may not accept all recipients; verify the draft. No addresses have been truncated.</p>}
      <p role="status">{feedback}</p>
      <details><summary>Inspect mailto link</summary><textarea aria-label="Generated mailto link" readOnly value={email.mailto} className={styles.link} /></details>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setPreview(false)}>Cancel</Button>
        <Button variant="secondary" onClick={copy}>Copy Mailto Link</Button>
        <Button onClick={() => { window.location.href = email.mailto; }}>Open Draft in Mail</Button>
      </div>
    </Modal>}
    {remove && <BatchConfirmationModal title="Remove all students?" description={`Remove every enrolled student from ${name}. No other class is affected.`} affectedCount={remove.length} actionLabel={`Remove ${remove.length} Students`} loading={removing} onConfirm={executeRemoval} destructive acknowledgement="I understand this will remove all students from this class." blockedReason={writesEnabled ? undefined : "Enrollment changes disabled"} onCancel={() => setRemove(null)} />}
  </>;
}
