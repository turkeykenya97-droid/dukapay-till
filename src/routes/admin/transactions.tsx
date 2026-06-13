import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/transactions")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>Transactions</h1>
      <p>Working!</p>
    </div>
  ),
});
