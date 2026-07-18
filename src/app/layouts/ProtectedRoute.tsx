import { Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { AuthRequiredNotice } from "../../shared/components/AuthRequiredNotice";
import { PageLoading } from "../../shared/components/PageLoading";

export const ProtectedRoute = () => {
  const auth = useAuth();

  if (auth.isLoading) {
    return <PageLoading label="Restoring session..." />;
  }

  if (!auth.isAuthenticated) {
    return (
      <AuthRequiredNotice
        description="Log in or register an account to view this learning area and keep your progress connected."
        title="Log in to view this page"
      />
    );
  }

  return <Outlet />;
};
