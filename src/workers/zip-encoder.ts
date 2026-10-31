import { deflate } from "pako";
import { uuid } from "../engine/core/util.ts";
import type { MessageWorker, PromiseFactory } from "../io/export/jpeg-encoder.ts";

export class ZipEncoder {
  /** Posts the buffer (transferred) to the first worker; resolves with the deflated bytes. */
  concurrencyEncode(
    factory: PromiseFactory,
    workers: MessageWorker[],
    buffer: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    return factory.createPromise<ArrayBuffer>((resolve, reject) => {
      const worker = workers[0] as MessageWorker;
      const id = uuid();
      worker.postMessage({ uuid: id, command: "zipencoder", buffer }, [buffer]);
      const onError = (error: unknown): void => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        reject(error);
      };
      const onMessage = (event: MessageEvent): void => {
        const data = event.data as { uuid?: string; command?: string; buffer: ArrayBuffer };
        if (data.uuid === id && "zipencoder" === data.command) {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          resolve(data.buffer);
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
    });
  }

  encode(data: ArrayBuffer | Uint8Array): Uint8Array {
    return deflate(data instanceof Uint8Array ? data : new Uint8Array(data));
  }
}
