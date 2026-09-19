"use client";
import { useState, type ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import styles from "./batch-confirmation.module.css";
type Props = {
  title: string;
  description: string;
  affectedCount: number;
  actionLabel: string;
  destructive?: boolean;
  acknowledgement?: string;
  loading?: boolean;
  blockedReason?: string;
  onCancel: () => void;
  onConfirm?: () => void;
  children?: ReactNode;
};
// Mount only while confirming. Each new operation starts with acknowledgement cleared.
// All multi-record mutations must pass through this explicit confirmation UI.
export function BatchConfirmationModal(props: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const disabled = !props.onConfirm || !!props.loading || !!props.blockedReason || props.affectedCount <= 0 || (!!props.destructive && !acknowledged);
  const cancel = () => { if (!props.loading) props.onCancel(); };
  return <Modal open title={props.title} description={props.description} onClose={cancel}>
    <p>{props.affectedCount} records affected.</p>
    {props.children}
    {props.destructive && <label className={styles.acknowledgement}><input type="checkbox" checked={acknowledged} disabled={props.loading} onChange={event => setAcknowledged(event.target.checked)} />{props.acknowledgement ?? "I understand this destructive action affects all selected records."}</label>}
    {props.blockedReason && <p className={styles.notice}>{props.blockedReason}</p>}
    <div className={styles.actions}>
      <Button variant="secondary" disabled={props.loading} onClick={cancel}>Cancel</Button>
      <Button variant={props.destructive ? "danger" : "primary"} disabled={disabled} onClick={() => { if (!disabled) props.onConfirm?.(); }}>{props.loading ? "Processing…" : props.actionLabel}</Button>
    </div>
  </Modal>;
}
