import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import { getServerEnv } from "../src/server/env.server";
import { qstash } from "../src/server/integrations/qstash.server";

const env = getServerEnv();
if (!env.PUBLIC_APP_URL || !env.CLOUDINARY_UPLOAD_PRESET)
  throw new Error("PUBLIC_APP_URL and CLOUDINARY_UPLOAD_PRESET are required");
if (!process.argv.includes("--apply")) {
  console.log(
    "Dry run: configure a signed image preset (8 MiB), serial ML queue, and 15-minute maintenance schedule. Pass --apply to create/update these resources.",
  );
} else {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET)
    throw new Error("Cloudinary credentials are required");
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  const preset = {
    unsigned: false,
    allowed_formats: "jpg,jpeg,png,webp",
    max_file_size: 8 * 1024 * 1024,
    overwrite: false,
  };
  try {
    await cloudinary.api.update_upload_preset(env.CLOUDINARY_UPLOAD_PRESET, preset);
  } catch (error) {
    if (
      (error as { error?: { http_code?: number }; http_code?: number }).error?.http_code !== 404 &&
      (error as { http_code?: number }).http_code !== 404
    )
      throw error;
    await cloudinary.api.create_upload_preset({ name: env.CLOUDINARY_UPLOAD_PRESET, ...preset });
  }
  await qstash("queues", { queueName: "routier-ml", parallelism: 1 });
  const destination = `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/api/internal/maintenance`;
  const schedules = (await qstash("schedules", undefined, undefined, "GET")) as {
    scheduleId: string;
    destination: string;
  }[];
  const existing = schedules.find((schedule) => schedule.destination === destination);
  const result = await qstash(
    `schedules/${destination}`,
    {},
    {
      "Upstash-Cron": "*/15 * * * *",
      "Upstash-Retries": "0",
      "Upstash-Timeout": "180s",
      ...(existing ? { "Upstash-Schedule-Id": existing.scheduleId } : {}),
    },
  );
  console.log(JSON.stringify({ maintenanceScheduleId: result.scheduleId }));
}
