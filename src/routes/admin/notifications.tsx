import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/notifications")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Notifications</h1>
      <p>Working!</p>
    </div>
  ),
});
