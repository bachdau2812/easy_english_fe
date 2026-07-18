import { Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { AuthModal } from "../../features/home/components/AuthModal";

export const RootLayout = () => {
  const auth = useAuth();

  return (
    <div className="app-shell">
      <Outlet />
      <AuthModal
        isOpen={auth.isAuthPromptOpen}
        onClose={auth.closeAuthPrompt}
        promptMessage={auth.authPromptMessage}
      />
    </div>
  );
};
