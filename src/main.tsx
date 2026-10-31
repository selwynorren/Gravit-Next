/**
 * The app's entry: the shell connected to the designer (its React root is
 * #mainframe, created in Designer.init), then the old start sequence (src/app/shell/pwa-boot.ts, bootstrap.ts).
 * The look (Gravit Next or classic, src/app/brand/branding.ts) is
 * taken over first; the introduction opens once the app is ready.
 */
import { afterAppStarted, startBranding } from "./app/brand/start.ts";
import { createDesktopContainer } from "./app/desktop/desktop-container.ts";
import { BrowserContainer } from "./app/shell/browser-container.ts";
import { boot } from "./app/shell/bootstrap.ts";
import { installShell } from "./app/shell/mount.tsx";
import { startApp } from "./app/shell/pwa-boot.ts";

startBranding();
installShell();

// The desktop app gets its files from the main process; a browser
// has no such channel and keeps the browser storage.
createDesktopContainer()
  .then((desktop) =>
    startApp(() => desktop ?? new BrowserContainer(), boot).then((designer) => {
      desktop?.attach(designer);
    }),
  )
  .then(
    () => {
      afterAppStarted();
    },
    (error: unknown) => console.error("[boot] the app did not start", error),
  );
