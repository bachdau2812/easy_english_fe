import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { Button } from "../../../shared/components/Button";
import { ROUTES } from "../../../shared/constants/routes";
import { authApi } from "../api/authApi";
import { AuthTextInput } from "./AuthTextInput";
import { PasswordInput } from "./PasswordInput";

type RegisterStep = "register" | "verify";

interface RegisterErrors {
  code?: string;
  confirmPassword?: string;
  email?: string;
  password?: string;
  username?: string;
}

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [step, setStep] = useState<RegisterStep>("register");
  const [username, setUsername] = useState("");

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: (response) => {
      flushSync(() => {
        setErrors({});
        setMessage(response || "Verification code sent. Check your email.");
        setRegisteredEmail(email.trim());
        setStep("verify");
      });
    }
  });

  const verifyEmail = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      flushSync(() => {
        setErrors({});
        setMessage(null);
      });
      navigate(ROUTES.login, { replace: true });
    }
  });

  const validate = (): boolean => {
    const nextErrors: RegisterErrors = {};

    if (username.trim().length < 3) {
      nextErrors.username = "Username should be at least 3 characters.";
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (password.length < 6) {
      nextErrors.password = "Password should be at least 6 characters.";
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (step === "verify") {
      if (!code.trim()) {
        setErrors({ code: "Enter the email verification code." });
        return;
      }

      verifyEmail.mutate({ email: registeredEmail || email.trim(), code: code.trim() });
      return;
    }

    if (!validate()) {
      return;
    }

    register.mutate({ email: email.trim(), password, username: username.trim() });
  };

  const pending = register.isPending || verifyEmail.isPending;
  const activeError = register.error ?? verifyEmail.error;

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      {activeError ? (
        <div className="auth-alert auth-alert--error" role="alert">
          {getSafeErrorMessage(activeError)}
        </div>
      ) : null}
      {message ? (
        <div className="auth-alert auth-alert--success" role="status">
          {message}
        </div>
      ) : null}

      {step === "register" ? (
        <>
          <AuthTextInput
            autoComplete="username"
            error={errors.username}
            icon="user"
            label="Username"
            onChange={(event) => {
              setUsername(event.target.value);
              setErrors((current) => ({ ...current, username: undefined }));
            }}
            placeholder="bachlearns"
            required
            value={username}
          />
          <AuthTextInput
            autoComplete="email"
            error={errors.email}
            icon="mail"
            label="Email"
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="bach@example.com"
            required
            type="email"
            value={email}
          />
          <PasswordInput
            autoComplete="new-password"
            error={errors.password}
            label="Password"
            onChange={(event) => {
              setPassword(event.target.value);
              setErrors((current) => ({ ...current, password: undefined }));
            }}
            placeholder="Create a strong password"
            required
            value={password}
          />
          <PasswordInput
            autoComplete="new-password"
            error={errors.confirmPassword}
            label="Confirm password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrors((current) => ({ ...current, confirmPassword: undefined }));
            }}
            placeholder="Repeat your password"
            required
            value={confirmPassword}
          />
        </>
      ) : (
        <AuthTextInput
          autoComplete="one-time-code"
          error={errors.code}
          icon="mail"
          inputMode="numeric"
          label="Email code"
          onChange={(event) => {
            setCode(event.target.value);
            setErrors((current) => ({ ...current, code: undefined }));
          }}
          placeholder="123456"
          required
          value={code}
        />
      )}

      <Button isLoading={pending} type="submit">
        {step === "register" ? "Create account" : "Submit code"}
      </Button>
    </form>
  );
};
