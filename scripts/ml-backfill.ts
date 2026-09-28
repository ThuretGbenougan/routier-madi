import "dotenv/config";
import { db } from "../src/server/db.server";
import { isMlEligible } from "../src/server/services/photo-policy";

const apply = process.argv.includes("--apply");
try {
  const photos = await db.photo.findMany({
    include: { request: true, analysis: { include: { outbox: true } } },
  });
  const eligible = photos.filter(
    (p) =>
      p.deliveryUrl &&
      isMlEligible(p.request.problemType, p.kind, p.storageProvider) &&
      (!p.analysis || (p.analysis.status === "PENDING" && p.analysis.outbox.length === 0)),
  );
  console.log(
    JSON.stringify({ apply, eligible: eligible.length, excluded: photos.length - eligible.length }),
  );
  if (apply) {
    for (const photo of eligible)
      await db.$transaction(async (tx) => {
        const analysis = await tx.mlAnalysis.upsert({
          where: { photoId: photo.id },
          create: { photoId: photo.id },
          update: {},
        });
        if (analysis.status !== "PENDING") return;
        await tx.mlOutbox.upsert({
          where: {
            analysisId_generation: { analysisId: analysis.id, generation: analysis.generation },
          },
          create: { analysisId: analysis.id, generation: analysis.generation },
          update: {},
        });
      });
    await db.mlAnalysis.updateMany({
      where: {
        status: "PENDING",
        photo: {
          OR: [
            { storageProvider: "demo" },
            { kind: { not: "CITIZEN" } },
            { request: { problemType: { not: "POTHOLE" } } },
          ],
        },
      },
      data: { status: "SKIPPED" },
    });
  }
} finally {
  await db.$disconnect();
}
