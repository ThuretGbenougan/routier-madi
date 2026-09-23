import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/contractor/")({
  beforeLoad: () => {
    throw redirect({ to: "/contractor/login" });
  },
});
