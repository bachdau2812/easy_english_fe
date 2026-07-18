import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { Button } from "../../../shared/components/Button";
import { authApi } from "../api/authApi";
import { AuthTextInput } from "./AuthTextInput";
import { PasswordInput } from "./PasswordInput";

type ForgotPasswordStep = 1 | 2 | 3;

interface ForgotPasswordErrors {
  code?: string;
  confirmPassword?: string;
  emailOrUsername?: string;
  newPassword?: string;
}

const isEmail = (value: string): boolean => /^\S+@\S+\.\S+$/.test(value);

export const ForgotPasswordForm = () => {
  const [code, setCode] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<ForgotPasswordStep>(1);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestCode = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword({ email }),
    onSuccess: (message) => {
      setSuccessMessage(message);
      setStep(2);
    }
  });

  const verifyCode = useMutation({
    mutationFn: () => authApi.submitForgotPasswordCode({ email: emailOrUsername.trim(), code }),
    onSuccess: (message) => {
      setSuccessMessage(message);
      setStep(3);
    }
  });

  const completeReset = useMutation({
    mutationFn: () => authApi.completeForgotPasswordWithNewPassword(),
    onError: () => setSuccessMessage(null)
  });

  const handleStepOne = () => {
    const value = emailOrUsername.trim();

    if (!value) {
      setErrors({ emailOrUsername: "Enter the email linked to your account." });
      return;
    }

    if (!isEmail(value)) {
      setErrors({
        emailOrUsername:
          "The current backend forgot-password endpoint accepts email only. Username reset needs backend support."
      });
      return;
    }

    setErrors({});
    requestCode.mutate(value);
  };

  const handleStepTwo = () => {
    if (code.trim().length < 4) {
      setErrors({ code: "Enter the verification code from your email." });
      return;
    }

    setErrors({});
    verifyCode.mutate();
  };

  const handleStepThree = () => {
    const nextErrors: ForgotPasswordErrors = {};

    if (newPassword.length < 6) {
      nextErrors.newPassword = "New password should be at least 6 characters.";
    }

    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    completeReset.mutate();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (step === 1) {
      handleStepOne();
      return;
    }

    if (step === 2) {
      handleStepTwo();
      return;
    }

    handleStepThree();
  };

  const pending = requestCode.isPending || verifyCode.isPending || completeReset.isPending;
  const error = requestCode.error ?? verifyCode.error ?? completeReset.error;

  return (
    <form className="auth-form" noValidate onSubmit={handleSubmit}>
      <div className="auth-stepper" aria-label="Forgot password progress">
        {[1, 2, 3].map((item) => (
          <span
            aria-current={step === item ? "step" : undefined}
            className={`auth-stepper__dot ${step >= item ? "auth-stepper__dot--active" : ""}`}
            key={item}
          />
        ))}
      </div>

      {error ? (
        <div className="auth-alert auth-alert--error" role="alert">
          {getSafeErrorMessage(error)}
        </div>
      ) : null}

      {successMessage ? (
        <div className="auth-alert auth-alert--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {step === 1 ? (
        <AuthTextInput
          autoComplete="email"
          error={errors.emailOrUsername}
          icon="mail"
          label="Email or username"
          onChange={(event) => {
            setEmailOrUsername(event.target.value);
            setErrors((current) => ({ ...current, emailOrUsername: undefined }));
          }}
          placeholder="bach@example.com"
          required
          value={emailOrUsername}
        />
      ) : null}

      {step === 2 ? (
        <AuthTextInput
          autoComplete="one-time-code"
          error={errors.code}
          icon="mail"
          inputMode="numeric"
          label="Verification code"
          onChange={(event) => {
            setCode(event.target.value);
            setErrors((current) => ({ ...current, code: undefined }));
          }}
          placeholder="123456"
          required
          value={code}
        />
      ) : null}

      {step === 3 ? (
        <>
          <PasswordInput
            autoComplete="new-password"
            error={errors.newPassword}
            label="New password"
            onChange={(event) => {
              setNewPassword(event.target.value);
              setErrors((current) => ({ ...current, newPassword: undefined }));
            }}
            placeholder="New password"
            required
            value={newPassword}
          />
          <PasswordInput
            autoComplete="new-password"
            error={errors.confirmPassword}
            label="Confirm new password"
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setErrors((current) => ({ ...current, confirmPassword: undefined }));
            }}
            placeholder="Repeat new password"
            required
            value={confirmPassword}
          />
          <p className="auth-form__hint">
            Backend TODO: current docs say code submission emails a generated password; no public
            endpoint accepts a chosen new password yet.
          </p>
        </>
      ) : null}

      <Button isLoading={pending} type="submit">
        {step === 1 ? "Send code" : step === 2 ? "Verify code" : "Set new password"}
      </Button>
    </form>
  );
};
