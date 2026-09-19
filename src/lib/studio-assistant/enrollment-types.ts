export type StudioUser = {
    id: number;
    name: string | null;
    email: string | null;
    username: string | null;
    code: string | null;
};
export type StudioClass = {
    id: number;
    name: string | null;
    code: string | null;
    snippet: string | null;
};
export type Directory = {
    users: StudioUser[];
    classes: StudioClass[];
    issues: string[];
    usersLoaded: boolean;
    classesLoaded: boolean;
};
export type ClassEnrollment = {
    classId: number;
    state: "enrolled" | "not-enrolled" | "unknown";
};
export type ClassRoster = {
    classId: number;
    users: StudioUser[];
};
export type UserEnrollment = {
    userId: number;
    classes: ClassEnrollment[];
    failedClassIds: number[];
};
