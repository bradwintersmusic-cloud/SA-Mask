"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import styles from "./modal.module.css";
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const backdropPress = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget)
          onClose();
        backdropPress.current = false;
      }}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Studio Assistant</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close modal">
            <Icon name="close" />
          </Button>
        </header>
        <div className={styles.body}>
          {description && (
            <p id={descriptionId} className={styles.description}>
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </dialog>
  );
}
