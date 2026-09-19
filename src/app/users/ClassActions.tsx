"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BatchConfirmationModal } from "@/components/ui/BatchConfirmationModal";
import { classEmail } from "@/lib/email/class-email";
import type { StudioClass, ClassRoster } from "@/lib/studio-assistant/enrollment-types";
import styles from "./class-actions.module.css";
export function ClassActions({ course, roster }: { course: StudioClass; roster: ClassRoster }) {
  const [preview, setPreview] = useState(false);
  const [remove, setRemove] = useState(false);
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
      <Button variant="danger" disabled={!roster.users.length} onClick={() => setRemove(true)}>Remove All Students</Button>
    </div>
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
    {remove && <BatchConfirmationModal title="Remove all students?" description={`Remove every enrolled student from ${name}. No other class is affected.`} affectedCount={roster.users.length} actionLabel={`Remove ${roster.users.length} Students`} destructive acknowledgement="I understand this will remove all students from this class." blockedReason="Enrollment changes are disabled while Studio Assistant is in Read Only mode. The member removal endpoint is also unconfirmed." onCancel={() => setRemove(false)} />}
  </>;
}
