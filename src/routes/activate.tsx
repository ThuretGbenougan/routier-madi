import { createFileRoute } from "@tanstack/react-router";
import { ActivateUser } from "@/components/ActivateUser";
export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "Activation — Voirie Connect" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: ActivateUser,
});
