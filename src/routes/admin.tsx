import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return <Navigate to="/admin/dashboard" />;
}
