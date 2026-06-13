import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/logs")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Audit Logs</h1>
      <p>Working!</p>
    </div>
  ),
});
