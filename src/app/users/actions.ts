"use server";
import { addClassMember, removeClassMember, removeAllClassMembers, getSchoolUsers } from "@/lib/studio-assistant/enrollment";
import { assertEnrollmentWritesEnabled } from "@/lib/studio-assistant/write-safety";
export async function updateEnrollment(action: "add" | "remove", classId: number, userId: number) {
  try {
    assertEnrollmentWritesEnabled();
    if (action === "add") {
      const user = (await getSchoolUsers()).find(user => user.id === userId);
      if (!user) throw new Error("Unknown school member.");
      await addClassMember(classId, user);
    } else if (action === "remove") await removeClassMember(classId, userId);
    else throw new Error("Invalid action.");
    return { success: true };
  } catch { return { success: false, error: "Enrollment update could not be confirmed. Refresh before retrying." }; }
}
export async function removeStudents(classId: number, studentIds: number[]) {
  try { return { data: await removeAllClassMembers(classId, studentIds) }; }
  catch { return { error: "Student removal could not be confirmed. Refresh before retrying." }; }
}
