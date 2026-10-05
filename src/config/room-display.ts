import { facilities } from "./facilities";

type Room = { facilityId: number; roomId?: number | null; roomName?: string | null };
const remId = facilities.find(facility => facility.key === "rem")!.studioAssistantId;
// IDs verified from the calendar response or confirmed by the administrator.
// Rooms without a confirmed ID use exact names only.
const remRooms = [
  { name: "Studio A", id: 10477 },
  { name: "Studio B", id: 10478 },
  { name: "Studio C", id: 10482 },
  { name: "Studio D", id: 10485 },
  { name: "Classroom B25", id: 10486 },
  { name: "Restoration Studio", id: 10479 },
  { name: "Edit Bay B11", id: 10481, aliases: ["B11", "Studio B11"] },
  { name: "Edit Bay B12", id: 10484, aliases: ["B12", "Studio B12"] },
  { name: "Edit Bay B13", id: 10483, aliases: ["B13", "Studio B13"] },
  { name: "Edit Bay B14", id: 10480, aliases: ["B14", "Studio B14"] },
  { name: "Classroom B19", id: 10487 },
];
function configuredRoom(room: Room) {
  if (room.facilityId !== remId) return undefined;
  const name = room.roomName?.trim().toLowerCase();
  return remRooms.find(entry => entry.id !== undefined && entry.id === room.roomId)
    ?? remRooms.find(entry => [entry.name, ...(entry.aliases ?? [])].some(alias => alias.toLowerCase() === name));
}
export function getRoomDisplayName(room: Room) {
  // Existing verified 34MSE calendar names (README live inventory).
  const mseId = facilities.find(facility => facility.key === "34mse")!.studioAssistantId;
  const verifiedName = room.facilityId === mseId && !room.roomName
    ? ({ 10475: "Columbia Studio A", 10476: "Quonset Hut Studio" } as Record<number, string>)[room.roomId ?? 0]
    : undefined;
  return configuredRoom(room)?.name ?? room.roomName ?? verifiedName
    ?? (room.roomId ? `Studio #${room.roomId}` : "Studio not provided");
}
export function getRoomSortOrder(room: Room) {
  const entry = configuredRoom(room);
  return entry ? remRooms.indexOf(entry) : remRooms.length;
}
export function compareRoomDisplay(a: Room, b: Room) {
  return (a.facilityId === remId && b.facilityId === remId ? getRoomSortOrder(a) - getRoomSortOrder(b) : 0)
    || getRoomDisplayName(a).localeCompare(getRoomDisplayName(b), undefined, { numeric: true });
}
