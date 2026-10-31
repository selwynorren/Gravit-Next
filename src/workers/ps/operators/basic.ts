import type { PSPlainRecord } from "../objects.ts";
import { compareOperators } from "./basic-compare.ts";
import { dictOperators } from "./basic-dicts.ts";
import { fileOperators } from "./basic-files.ts";
import { mathOperators } from "./basic-math.ts";
import { matrixOperators } from "./basic-matrix.ts";
import { nameOperators } from "./basic-names.ts";
import { stackOperators } from "./basic-stack.ts";
import { stringOperators } from "./basic-strings.ts";

export const basicOperators: PSPlainRecord = {
  ...mathOperators,
  ...dictOperators,
  ...stringOperators,
  ...nameOperators,
  ...compareOperators,
  ...stackOperators,
  ...fileOperators,
  ...matrixOperators,
};
