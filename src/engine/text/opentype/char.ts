type MaybeChar = string | null | undefined;

/** An Arabic letter. */
export function isArabicChar(c: MaybeChar): boolean {
  return /[؀-ٟ٪-ےۺ-ۿ]/.test(c as string);
}

/** An Arabic letter that doesn't join the next letter. */
export function isIsolatedArabicChar(char: MaybeChar): boolean {
  return /[ذڐءر١ٱآزٲڒۂأٳړۃؤڔۄإٵڕۅۥٶږۆاٷڗۇوڈژۈډڙۉڊۊ٫ڋۋڌڍۍ۽ڎۮ۾دڏۏۯ]/.test(char as string);
}

/** An Arabic tashkeel (diacritic) or similar mark. */
export function isTashkeelArabicChar(char: MaybeChar): boolean {
  // The class lists combining marks on purpose; each is matched on its own.
  // eslint-disable-next-line no-misleading-character-class
  return /[؀-؅،-؎ؐ-؛؞ً-ٰٟۖ-ۜ۟-۪ۤۧۨ-ۭ]/.test(char as string);
}

export function isWhiteSpace(c: MaybeChar): boolean {
  return /\s/.test(c as string);
}
