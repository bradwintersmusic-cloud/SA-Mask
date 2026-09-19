import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { facilities } from "@/config/facilities";
import type { RequestAction } from "@/lib/studio-assistant/types";
import styles from "./requests.module.css";
type Props = {
  facility: string;
  onFacility: (value: string) => void;
  visibleCount: number;
  selectedCount: number;
  allSelected: boolean;
  someSelected: boolean;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onAction: (action: RequestAction) => void;
};
export function RequestToolbar(props: Props) {
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current)
      allRef.current.indeterminate = props.someSelected && !props.allSelected;
  }, [props.someSelected, props.allSelected]);
  return (
    <>
      <div
        className={styles.filters}
        role="group"
        aria-label="Filter by facility"
      >
        <span className={styles.filterLabel}>Facility</span>
        {[
          { key: "all", name: "All" },
          ...facilities.map((facility) => ({
            key: String(facility.studioAssistantId),
            name: facility.name,
          })),
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={props.facility === item.key}
            disabled={props.busy}
            onClick={() => props.onFacility(item.key)}
          >
            {item.name}
          </button>
        ))}
        <span className={styles.resultCount}>{props.visibleCount} visible</span>
      </div>
      <div className={styles.actionBar}>
        <div className={styles.selection}>
          <label className={styles.selectAll}>
            <input
              ref={allRef}
              type="checkbox"
              checked={props.allSelected}
              disabled={props.busy || !props.visibleCount}
              onChange={props.onSelectAll}
            />
            Select visible
          </label>
          <span aria-live="polite">{props.selectedCount} selected</span>
          <Button
            variant="ghost"
            disabled={props.busy || !props.selectedCount}
            onClick={props.onClear}
          >
            Clear
          </Button>
        </div>
        <span className="muted">Read only · Request actions disabled</span>
        <div className={styles.actionButtons}>
          <Button disabled={true} onClick={() => props.onAction("approve")}>
            Approve Selected
          </Button>
          <Button
            variant="danger"
            disabled={true}
            onClick={() => props.onAction("deny")}
          >
            Deny Selected
          </Button>
        </div>
        {props.selectedCount > 100 && (
          <p role="status">Select up to 100 requests per batch.</p>
        )}
      </div>
    </>
  );
}
