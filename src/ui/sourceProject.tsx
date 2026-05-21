import { sourceProject, sourceProjectDescription, sourceProjectPoweredByPrefix } from "../project.js";
import type { ViewChild } from "./types.js";

export function SourceProjectPoweredBySentence({ suffix = "." }: { suffix?: ViewChild }) {
  return (
    <>
      {sourceProjectPoweredByPrefix} <a href={sourceProject.websiteUrl}>{sourceProject.name}</a>, {sourceProjectDescription}{suffix}
    </>
  );
}
