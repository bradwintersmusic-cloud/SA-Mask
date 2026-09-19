import type { StudioSession } from "@/lib/studio-assistant/types";
import { centralDayRange, centralHour } from "./time";
import { usableSchedule } from "./display";
export function layoutTimeline(sessions: StudioSession[], date: string) {
  const day = centralDayRange(date);
  const dayStart = Date.parse(day.start),
    dayEnd = Date.parse(day.end);
  const timed = sessions.filter(
    (session) =>
      usableSchedule(session) &&
      Date.parse(session.start!) < dayEnd &&
      Date.parse(session.end!) > dayStart,
  );
  let start = centralHour(date, 8),
    end = centralHour(date, 22);
  for (const session of timed) {
    start = Math.min(start, Math.max(dayStart, Date.parse(session.start!)));
    end = Math.max(end, Math.min(dayEnd, Date.parse(session.end!)));
  }
  start = dayStart + Math.floor((start - dayStart) / 3_600_000) * 3_600_000;
  end = Math.min(
    dayEnd,
    dayStart + Math.ceil((end - dayStart) / 3_600_000) * 3_600_000,
  );
  const pixelsPerMinute = 0.9;
  const height = ((end - start) / 60_000) * pixelsPerMinute;
  const blocks = timed
    .map((session) => {
      const top = Math.max(
        0,
        Math.min(
          height - 44,
          ((Date.parse(session.start!) - start) / 60_000) * pixelsPerMinute,
        ),
      );
      const bottom = Math.min(
        height,
        Math.max(
          top + 44,
          ((Date.parse(session.end!) - start) / 60_000) * pixelsPerMinute,
        ),
      );
      return { session, top, height: bottom - top, lane: 0, columns: 1 };
    })
    .sort(
      (a, b) =>
        a.top - b.top ||
        b.height - a.height ||
        a.session.key.localeCompare(b.session.key),
    );
  let group: typeof blocks = [],
    laneEnds: number[] = [],
    groupEnd = -1;
  const finishGroup = () => {
    for (const block of group) block.columns = laneEnds.length;
    group = [];
    laneEnds = [];
  };
  for (const block of blocks) {
    if (block.top >= groupEnd) finishGroup();
    let lane = laneEnds.findIndex((value) => value <= block.top);
    if (lane < 0) lane = laneEnds.length;
    block.lane = lane;
    laneEnds[lane] = block.top + block.height;
    group.push(block);
    groupEnd = Math.max(...laneEnds);
  }
  finishGroup();
  const ticks: number[] = [];
  for (let value = start; value <= end; value += 3_600_000) ticks.push(value);
  return { start, end, height, blocks, ticks, pixelsPerMinute };
}
