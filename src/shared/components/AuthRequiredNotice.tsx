import { Link } from "react-router-dom";
import { ROUTES } from "../constants/routes";

interface AuthRequiredNoticeProps {
  description?: string;
  title?: string;
}

export const AuthRequiredNotice = ({
  description = "Sign in or create an account to see saved learning data, practice history, and personal progress.",
  title = "Sign in to continue"
}: AuthRequiredNoticeProps) => (
  <section className="auth-required-notice">
    <div>
      <span>Account required</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="auth-required-notice__actions">
      <Link className="button button--primary" to={ROUTES.login}>
        Log in
      </Link>
      <Link className="button button--secondary" to={ROUTES.register}>
        Register
      </Link>
    </div>
  </section>
);
