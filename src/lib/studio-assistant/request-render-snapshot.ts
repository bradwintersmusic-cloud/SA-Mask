import "server-only";
import { cache } from "react";
import { getAllInternalRequests } from "./requests";

// Deduplicate shell/page reads within a render, never mutation pre/post reads.
export const getRequestRenderSnapshot = cache(getAllInternalRequests);
