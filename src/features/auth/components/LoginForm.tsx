import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { Button } from "../../../shared/components/Button";
import { ROUTES } from "../../../shared/constants/routes";
import { useLogin } from "../hooks/useLogin";
import { AuthTextInput } from "./AuthTextInput";
import { PasswordInput } from "./PasswordInput";

interface LoginErrors {
  emailOrUsername?: string;
  password?: string;
}

export const LoginForm = () => {
  const login = useLogin();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [password, setPassword] = useState("");

  const validate = (): boolean => {
    const nextErrors: LoginErrors = {};

    if (!emailOrUsername.trim()) {
      nextErrors.emailOrUsername = "Enter your email or username.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    login.mutate({ username: emailOrUsername.trim(), password });
  };

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {login.error ? (
        <div className="auth-alert auth-alert--error" role="alert">
          {getSafeErrorMessage(login.error)}
        </div>
      ) : null}
      <AuthTextInput
        autoComplete="username"
        error={errors.emailOrUsername}
        icon="user"
        label="Email or username"
        onChange={(event) => {
          setEmailOrUsername(event.target.value);
          setErrors((current) => ({ ...current, emailOrUsername: undefined }));
        }}
        placeholder="bach or bach@example.com"
        required
        value={emailOrUsername}
      />
      <PasswordInput
        autoComplete="current-password"
        error={errors.password}
        label="Password"
        onChange={(event) => {
          setPassword(event.target.value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        placeholder="Your password"
        required
        value={password}
      />
      <div className="auth-form__meta">
        <span>Use your backend account credentials.</span>
        <Link to={ROUTES.forgotPassword}>Forgot password?</Link>
      </div>
      <Button isLoading={login.isPending} type="submit">
        Log in
      </Button>
    </form>
  );
};
