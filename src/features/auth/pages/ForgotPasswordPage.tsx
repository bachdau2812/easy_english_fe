import { Link } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { AuthCard } from "../components/AuthCard";
import { AuthLayout } from "../components/AuthLayout";
import { ForgotPasswordForm } from "../components/ForgotPasswordForm";

export const ForgotPasswordPage = () => (
  <AuthLayout>
    <AuthCard
      eyebrow="Account recovery"
      subtitle="Move through email, code, and new password steps without leaving the page."
      title="Reset your password"
    >
      <ForgotPasswordForm />
      <p className="auth-switch">
        Remembered it? <Link to={ROUTES.login}>Back to login</Link>
      </p>
    </AuthCard>
  </AuthLayout>
);
