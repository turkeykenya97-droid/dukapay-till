import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/smartpay")({
  component: () => (
    <div style={{ padding: "40px" }}>
      <h1>SmartPay Settings</h1>
      <p>Working!</p>
    </div>
  ),
});
