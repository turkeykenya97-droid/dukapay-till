import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/dashboard")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Admin Dashboard</h1>
      <p>Working!</p>
    </div>
  ),
});
