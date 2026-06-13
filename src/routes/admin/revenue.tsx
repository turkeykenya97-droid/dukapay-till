import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/revenue")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Revenue & Subscriptions</h1>
      <p>Working!</p>
    </div>
  ),
});
