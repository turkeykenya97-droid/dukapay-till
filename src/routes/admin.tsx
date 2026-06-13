import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSessionServer } from "@/lib/admin-auth.server";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const [ready, setReady] = useState(false);
  const getSession = useServerFn(getAdminSessionServer);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    // Don't check session on login page - let it render immediately
    if (isLoginPage) {
      setReady(true);
      return;
    }

    // Check session once for protected pages
    getSession({ data: {} })
      .then((session) => {
        if (!session) {
          // No session, redirect to login will happen in child route's beforeLoad
          setReady(true);
        } else {
          setReady(true);
        }
      })
      .catch(() => {
        // Error checking session, allow page to load - child route will handle redirect
        setReady(true);
      });
  }, []); // EMPTY ARRAY - runs once only

  if (!ready && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <Outlet />;
}
