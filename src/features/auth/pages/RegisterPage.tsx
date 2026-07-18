import { Link } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { AuthCard } from "../components/AuthCard";
import { AuthLayout } from "../components/AuthLayout";
import { RegisterForm } from "../components/RegisterForm";

export const RegisterPage = () => (
  <AuthLayout>
    <AuthCard
      eyebrow="Start fresh"
      subtitle="Create your account, then verify your email with the code from the backend."
      title="Make English a daily loop"
    >
      <RegisterForm />
      <p className="auth-switch">
        Already learning here? <Link to={ROUTES.login}>Log in</Link>
      </p>
    </AuthCard>
  </AuthLayout>
);
