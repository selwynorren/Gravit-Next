import { defaultLocaleEnvironment, type LocaleRuntime } from "./locale-runtime.ts";
import { Projects } from "./projects.ts";
import { bootstrapLocale, createProjectLocale } from "./translation.ts";

/**
 * The locale with every project's tables loaded and the language taken from
 * the browser. Built once, before any UI exists.
 */
export const baseLocale: LocaleRuntime = bootstrapLocale(defaultLocaleEnvironment());

/** GLocale: lookups for the Designer project, the one the app and the engine use. */
export const Locale: LocaleRuntime = createProjectLocale(baseLocale, Projects.Designer);

/** A locale for another project, sharing the loaded tables (old Factory). */
export function localeFactory(project: string): LocaleRuntime {
  return createProjectLocale(baseLocale, project);
}
