import { className } from "./class-name.ts";

/** A translation key: the class id (old class name) and the key within it. */
export class LocaleKey {
  private readonly _name: string;
  private readonly _key: string;

  constructor(clazz: unknown, key: string) {
    this._name = className(clazz);
    this._key = key;
  }

  getClassReference(): string {
    return this._name;
  }

  getKey(): string {
    return this._key;
  }
}
