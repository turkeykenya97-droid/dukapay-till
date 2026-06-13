import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/support")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Support</h1>
      <p>Working!</p>
    </div>
  ),
});
