import { Link } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { AuthCard } from "../components/AuthCard";
import { AuthLayout } from "../components/AuthLayout";
import { LoginForm } from "../components/LoginForm";

export const LoginPage = () => (
  <AuthLayout>
    <AuthCard
      eyebrow="Welcome back"
      subtitle="Jump back into reviews, saved words, and listening practice."
      title="Log in to your habit"
    >
      <LoginForm />
      <p className="auth-switch">
        New here? <Link to={ROUTES.register}>Create an account</Link>
      </p>
    </AuthCard>
  </AuthLayout>
);
