"use client";
import { useRef, useState, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { BatchConfirmationModal } from "@/components/ui/BatchConfirmationModal";
import type {
  BatchRequestResult,
  InternalRequest,
  RequestAction,
  RequestsSnapshot,
} from "@/lib/studio-assistant/types";
import { refreshRequests, updateRequests } from "./actions";
import { RequestList } from "./RequestList";
import { RequestToolbar } from "./RequestToolbar";
import { requestKey } from "./request-display";
import styles from "./requests.module.css";
type Feedback = { result: BatchRequestResult; requests: InternalRequest[] };
export function RequestsWorkspace({
  initialSnapshot,
  writesEnabled,
}: {
  initialSnapshot: RequestsSnapshot;
  writesEnabled: boolean;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [facility, setFacility] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<{
    action: RequestAction;
    requests: InternalRequest[];
  } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const inFlight = useRef(false);
  const pendingRef = useRef(new Set<string>());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const latestSnapshot = useRef(initialSnapshot.loadedAt);
  const visible = snapshot.requests.filter(
    (request) => facility === "all" || String(request.facilityId) === facility,
  );
  const allSelected =
    visible.length > 0 &&
    visible.every((request) => selected.has(requestKey(request)));
  const someSelected = visible.some((request) =>
    selected.has(requestKey(request)),
  );
  function acceptSnapshot(
    next: RequestsSnapshot,
    successful = new Set<string>(),
  ) {
    if (next.loadedAt < latestSnapshot.current) {
      setSelected(previous => new Set([...previous].filter(key => !successful.has(key))));
      return;
    }
    latestSnapshot.current = next.loadedAt;
    // A failed facility read must not make its unresolved requests disappear.
    setSnapshot(previous => ({ ...next, requests: [...next.requests, ...previous.requests.filter(request => next.issues.some(issue => issue.facilityId === request.facilityId))] }));
    const available = new Set(next.requests.map(requestKey));
    setSelected(
      (previous) =>
        new Set(
          [...previous].filter(
            (key) => available.has(key) && !successful.has(key),
          ),
        ),
    );
  }
  function refresh() {
    if (inFlight.current || pendingRef.current.size) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      try {
        acceptSnapshot(await refreshRequests());
      } catch {
        setError(
          "Refresh failed. The displayed queue may be out of date. Try Refresh again before acting.",
        );
      } finally {
        inFlight.current = false;
      }
    });
  }
  function toggle(key: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function selectAll() {
    setSelected((previous) => {
      const next = new Set(previous);
      visible.forEach((request) => {
        if (allSelected) next.delete(requestKey(request));
        else next.add(requestKey(request));
      });
      return next;
    });
  }
  function confirmAction(action: RequestAction) {
    if (!writesEnabled || inFlight.current || pendingRef.current.size) return;
    const requests = visible.filter((request) =>
      selected.has(requestKey(request)),
    );
    if (requests.length) setConfirmation({ action, requests });
  }
  function execute() {
    if (!writesEnabled || !confirmation || inFlight.current || pendingRef.current.size) return;
    const confirmed = confirmation;
    inFlight.current = true;
    setConfirmation(null);
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await updateRequests(
          confirmed.action,
          confirmed.requests.map(({ id, facilityId }) => ({ id, facilityId })),
        );
        if (!response.data) {
          setError(response.error);
          return;
        }
        const result = response.data;
        const successful = new Set(
          result.results.filter((item) => item.success).map(requestKey),
        );
        acceptSnapshot(result.snapshot, successful);
        setFeedback({ result, requests: confirmed.requests });
      } catch {
        setError(
          "The batch response was interrupted. Some updates may have completed. Refresh and review the queue before retrying.",
        );
        try {
          acceptSnapshot(await refreshRequests());
        } catch {
          /* Keep the warning and last known queue. */
        }
      } finally {
        inFlight.current = false;
      }
    });
  }
  async function quickAction(request: InternalRequest, action: RequestAction) {
    const key = requestKey(request);
    if (!writesEnabled || inFlight.current || confirmation || pendingRef.current.has(key)) return;
    pendingRef.current.add(key);
    setPending(new Set(pendingRef.current));
    setRowErrors(previous => ({ ...previous, [key]: "" }));
    try {
      const response = await updateRequests(action, [{ id: request.id, facilityId: request.facilityId }]);
      if (!response.data) {
        setRowErrors(previous => ({ ...previous, [key]: response.error }));
        return;
      }
      const result = response.data;
      const successful = new Set(result.results.filter(item => item.success).map(requestKey));
      acceptSnapshot(result.snapshot, successful);
      const failure = result.results.find(item => !item.success);
      if (failure) setRowErrors(previous => ({ ...previous, [key]: failure.message }));
      setFeedback({ result, requests: [request] });
    } catch {
      setRowErrors(previous => ({ ...previous, [key]: "Update could not be confirmed. Refresh before retrying." }));
    } finally {
      pendingRef.current.delete(key);
      setPending(new Set(pendingRef.current));
    }
  }
  const failed = feedback?.result.results.filter((item) => !item.success) ?? [];
  const succeeded =
    feedback?.result.results.filter((item) => item.success).length ?? 0;
  return (
    <>
      <PageHeader
        title="Internal Requests"
        description="Review pending requests across 34MSE and REM."
        action={
          <Button variant="secondary" onClick={refresh} disabled={busy || pending.size > 0}>
            {busy ? "Working…" : "Refresh"}
          </Button>
        }
      />
      <div className={styles.workspace} aria-busy={busy}>
        {snapshot.issues.length > 0 && (
          <div className={styles.warning} role="alert">
            {snapshot.issues.map((issue) => (
              <p key={issue.facilityId}>
                <strong>{issue.facilityName}:</strong> {issue.message}
              </p>
            ))}
            <p>
              Unavailable facilities are excluded from the list and its count.
            </p>
          </div>
        )}
        {error && (
          <div className={styles.warning} role="alert">
            {error}
          </div>
        )}
        {feedback && (
          <div
            className={failed.length ? styles.warning : styles.feedback}
            role="status"
          >
            <p>
              <strong>
                {succeeded} {succeeded === 1 ? "request" : "requests"}{" "}
                {feedback.result.action === "approve" ? "approved" : "denied"}.
              </strong>
              {failed.length > 0 &&
                ` ${failed.length} ${failed.length === 1 ? "update" : "updates"} could not be confirmed.`}
            </p>
            {failed.length > 0 && (
              <ul>
                {failed.map((item) => {
                  const request = feedback.requests.find(
                    (request) => requestKey(request) === requestKey(item),
                  );
                  return (
                    <li key={requestKey(item)}>
                      {request?.requesterName ?? "Request"} ·{" "}
                      {request?.facilityName} · #{item.id}: {item.message}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
        <RequestToolbar
          facility={facility}
          onFacility={(value) => {
            setFacility(value);
            setSelected(new Set());
          }}
          visibleCount={visible.length}
          selectedCount={selected.size}
          allSelected={allSelected}
          someSelected={someSelected}
          writesEnabled={writesEnabled}
          busy={busy || !!error || pending.size > 0}
          onSelectAll={selectAll}
          onClear={() => setSelected(new Set())}
          onAction={confirmAction}
        />
        <div className={styles.queueNote}>
          <span>Chronological order · Times in America/Chicago</span>
          <span>Selection clears when the facility filter changes.</span>
        </div>
        {busy && (
          <p role="status" className={styles.progress}>
            Updating queue… Please wait before starting another action.
          </p>
        )}
        {visible.length ? (
          <RequestList
            requests={visible}
            selected={selected}
            disabled={busy || !!error}
            onToggle={toggle}
            pending={pending}
            errors={rowErrors}
            actionsDisabled={!writesEnabled || busy || !!error || !!confirmation}
            onAction={quickAction}
          />
        ) : (
          <div className={styles.empty}>
            <h2>
              {snapshot.issues.some(
                (issue) =>
                  facility === "all" || String(issue.facilityId) === facility,
              )
                ? "Queue unavailable or incomplete"
                : "No requests waiting"}
            </h2>
            <p>
              {snapshot.issues.some(
                (issue) =>
                  facility === "all" || String(issue.facilityId) === facility,
              )
                ? "Refresh after resolving the connection error above."
                : facility === "all"
                  ? "No internal requests are currently waiting for review."
                  : "No internal requests are waiting for review at this facility."}
            </p>
          </div>
        )}
      </div>
      {confirmation && <BatchConfirmationModal
        affectedCount={confirmation.requests.length}
        actionLabel={`${confirmation.action === "approve" ? "Approve" : "Deny"} ${confirmation.requests.length}`}
        loading={busy}
        blockedReason={writesEnabled ? undefined : "Request actions disabled"}
        onConfirm={execute}
        onCancel={() => setConfirmation(null)}
        title={`${confirmation?.action === "approve" ? "Approve" : "Deny"} ${confirmation?.requests.length ?? 0} ${confirmation?.requests.length === 1 ? "request" : "requests"}?`}
        description={`This will ${confirmation?.action === "approve" ? "confirm" : "decline"} each selected request in Studio Assistant.`}
      >
        <ul className={styles.confirmList}>
          {confirmation?.requests.map((request) => (
            <li key={requestKey(request)}>
              <strong>{request.requesterName}</strong>
              <span>
                {request.facilityName} · {request.roomName} · #{request.id}
              </span>
            </li>
          ))}
        </ul>
      </BatchConfirmationModal>}
    </>
  );
}
