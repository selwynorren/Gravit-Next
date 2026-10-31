import workerSource from "pdfjs-dist/build/pdf.worker.js?raw";
import { applyPatches, WORKER_PATCHES } from "./pdfjs-patches.ts";

// Indirect eval runs the build at global scope, where its UMD wrapper
// and its self-initialization expect to run.
(0, eval)(applyPatches(workerSource, WORKER_PATCHES));
