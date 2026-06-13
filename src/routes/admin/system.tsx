import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/system")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>System Health</h1>
      <p>Working!</p>
    </div>
  ),
});
