import "server-only";
import { facilities } from "@/config/facilities";
import { studioAssistantFetch } from "./client";
import { fetchSchoolClasses } from "./classes";
import { deriveProjectTypes, normalizeAcademicClasses, normalizeAcademicProjects, normalizeAcademicShares, type AcademicProject, type AcademicSnapshot } from "./academic-model";
export async function getAcademics(): Promise<AcademicSnapshot> {
  // All aggregate reads start together; one failed facility does not discard another.
  const [classResults, projects, shares] = await Promise.all([
    Promise.allSettled([fetchSchoolClasses().then(normalizeAcademicClasses)]),
    Promise.allSettled(facilities.map(f => studioAssistantFetch(`/api/studio/${f.studioAssistantId}/project`).then(normalizeAcademicProjects))),
    Promise.allSettled(facilities.map(f => studioAssistantFetch(`/api/studio/${f.studioAssistantId}/share`).then(raw => normalizeAcademicShares(raw, f)))),
  ]);
  const classes = classResults[0];
  const issues: string[] = [];
  function check(result: PromiseSettledResult<{ complete: boolean }>, label: string) {
    if (result.status === "rejected") issues.push(`${label} could not be loaded. Refresh to retry.`);
    else if (!result.value.complete) issues.push(`${label}: completeness could not be verified. Showing returned records only.`);
    return result.status === "fulfilled" && result.value.complete;
  }
  const classesComplete = check(classes, "Classes");
  const projectResponsesComplete = projects.map((r, i) => check(r, `${facilities[i].name} Projects`)).every(Boolean);
  const sharesComplete = shares.map((r, i) => check(r, `${facilities[i].name} Shares`)).every(Boolean);
  const loadedShares = shares.flatMap(r => r.status === "fulfilled" ? r.value.items : []);
  // Facilities can return the same academic Projects. IDs are the relationship keys,
  // so duplicates must not inflate lists/counts or produce duplicate React keys.
  const projectIndex = new Map<number, AcademicProject>();
  const conflictingClassIds = new Set<number>();
  for (const result of projects) {
    if (result.status !== "fulfilled") continue;
    for (const project of result.value.items) {
      const existing = projectIndex.get(project.id);
      if (!existing) projectIndex.set(project.id, project);
      else if (existing.classId !== project.classId) conflictingClassIds.add(project.id);
    }
  }
  for (const id of conflictingClassIds) projectIndex.set(id, { ...projectIndex.get(id)!, classId: null });
  if (conflictingClassIds.size) issues.push(`${conflictingClassIds.size} Projects have conflicting Class references across facilities. Their Class relationships are unavailable.`);
  const loadedProjects = [...projectIndex.values()];
  const unresolved = loadedShares.filter(s => s.projectId !== null && !projectIndex.has(s.projectId)).length;
  if (unresolved) issues.push(`${unresolved} Shares reference Projects not returned by the facility endpoints. Their Class relationships are unavailable.`);
  const projectsComplete = projectResponsesComplete && unresolved === 0 && conflictingClassIds.size === 0;
  return { classes: classes.status === "fulfilled" ? classes.value.items : [], projects: deriveProjectTypes(loadedProjects, loadedShares, sharesComplete), shares: loadedShares, classesComplete, projectsComplete, sharesComplete, issues };
}
