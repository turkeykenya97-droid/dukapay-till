import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/signin")({
  beforeLoad: async () => {
    throw redirect({ to: "/login" });
  },
});
