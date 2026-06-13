import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/analytics")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Analytics</h1>
      <p>Working!</p>
    </div>
  ),
});
