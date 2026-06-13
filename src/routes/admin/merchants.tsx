import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/merchants")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Merchants</h1>
      <p>Working!</p>
    </div>
  ),
});
