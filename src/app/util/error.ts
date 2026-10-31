export class GError extends Error {
  constructor(...args: ConstructorParameters<typeof Error>) {
    super(...args);
    this.name = "GError";
  }

  override toString(): string {
    return "[Object GError]";
  }
}
