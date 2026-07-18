import { ReactNode } from "react";
import { AuthHeroPanel } from "./AuthHeroPanel";

export const AuthLayout = ({ children }: { children: ReactNode }) => (
  <div className="auth-page">
    <AuthHeroPanel />
    <div className="auth-form-column">{children}</div>
  </div>
);
