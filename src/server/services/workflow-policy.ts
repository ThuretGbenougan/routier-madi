import { ValidationError, ConflictError } from "../errors/app-error.server";

export function assertCompletion(comment: string | undefined, hasAfterPhoto: boolean) {
  if (!comment || comment.trim().length < 5)
    throw new ValidationError([
      {
        path: "comment",
        code: "WORK_REPORT_REQUIRED",
        message: "Un compte rendu d’au moins cinq caractères est obligatoire.",
      },
    ]);
  if (!hasAfterPhoto)
    throw new ValidationError([
      {
        path: "photos",
        code: "AFTER_PHOTO_REQUIRED",
        message: "Ajoutez une photo après travaux pour cette intervention.",
      },
    ]);
}

export function assertControl(
  next: string,
  controlPassed: boolean | undefined,
  lastControl?: { passed: boolean; cycle: number },
  cycle = 1,
) {
  if (next === "CONTROLLED" && controlPassed !== true)
    throw new ValidationError([
      {
        path: "controlPassed",
        code: "CONTROL_MUST_PASS",
        message: "Un contrôle négatif doit entraîner une reprise des travaux.",
      },
    ]);
  if (next === "CLOSED" && (!lastControl?.passed || lastControl.cycle !== cycle))
    throw new ConflictError(
      "CONTROL_REQUIRED",
      "Un contrôle favorable est requis avant la clôture.",
    );
}
