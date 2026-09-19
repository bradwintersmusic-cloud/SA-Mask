import type { InternalRequest } from "@/lib/studio-assistant/types";
import {
  requestContext,
  requestDate,
  requestKey,
  requestTime,
} from "./request-display";
import styles from "./requests.module.css";
type Props = {
  requests: InternalRequest[];
  selected: Set<string>;
  disabled: boolean;
  onToggle: (key: string) => void;
};
export function RequestList({ requests, selected, disabled, onToggle }: Props) {
  function checkbox(request: InternalRequest) {
    const key = requestKey(request);
    return (
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={selected.has(key)}
          disabled={disabled}
          onChange={() => onToggle(key)}
        />
        <span className="sr-only">
          Select {request.requesterName}, {request.facilityName}, request #
          {request.id}
        </span>
      </label>
    );
  }
  return (
    <>
      <div className={styles.desktopList}>
        <table className={styles.table}>
          <caption className="sr-only">
            Pending internal requests, sorted by start time. Times in
            America/Chicago.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">Select</span>
              </th>
              <th scope="col">Requester</th>
              <th scope="col">Facility / room</th>
              <th scope="col">Date / time</th>
              <th scope="col">Project / session</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr
                key={requestKey(request)}
                data-selected={selected.has(requestKey(request))}
              >
                <td>{checkbox(request)}</td>
                <td>
                  <strong>{request.requesterName}</strong>
                  <span className={styles.secondary}>
                    {request.requesterEmail ?? "Email not provided"}
                  </span>
                  <span className={styles.metadata}>#{request.id}</span>
                </td>
                <td>
                  <strong>{request.facilityName}</strong>
                  <span className={styles.secondary}>{request.roomName}</span>
                </td>
                <td>
                  <strong>{requestDate(request)}</strong>
                  <span className={styles.secondary}>
                    {requestTime(request)}
                  </span>
                </td>
                <td>{requestContext(request)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.mobileList} aria-label="Pending internal requests">
        {requests.map((request) => (
          <li
            key={requestKey(request)}
            className={styles.requestCard}
            data-selected={selected.has(requestKey(request))}
          >
            <div className={styles.cardTitle}>
              {checkbox(request)}
              <div>
                <strong>{request.requesterName}</strong>
                <span className={styles.secondary}>
                  {request.requesterEmail ?? "Email not provided"}
                </span>
              </div>
              <span className={styles.metadata}>#{request.id}</span>
            </div>
            <dl>
              <div>
                <dt>Location</dt>
                <dd>
                  {request.facilityName} · {request.roomName}
                </dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>
                  {requestDate(request)}
                  <span className={styles.secondary}>
                    {requestTime(request)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Context</dt>
                <dd>{requestContext(request)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
