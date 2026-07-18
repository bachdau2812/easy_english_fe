import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { PageLoading } from "../../shared/components/PageLoading";
import { ROUTES } from "../../shared/constants/routes";

export const AuthLayout = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <PageLoading label="Restoring session..." />;
  }

  if (auth.isAuthenticated) {
    return <Navigate replace to={ROUTES.home} />;
  }

  return (
    <main className="auth-route-shell">
      <Outlet />
    </main>
  );
};
