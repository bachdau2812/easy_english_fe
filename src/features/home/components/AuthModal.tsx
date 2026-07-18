import { FormEvent, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import flyingAroundTheWorld from "../../../assets/flying-around-the-world.svg";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { Button } from "../../../shared/components/Button";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { authApi } from "../../auth/api/authApi";
import { useAuth } from "../../auth/hooks/useAuth";
import { AuthTextInput } from "../../auth/components/AuthTextInput";
import { PasswordInput } from "../../auth/components/PasswordInput";
import { HomeIcon } from "./HomeIcon";

type AuthMode = "forgot" | "login" | "register" | "verify";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptMessage?: string | null;
}

interface RegisterDraft {
  confirmPassword: string;
  email: string;
  password: string;
  username: string;
}

interface FieldErrors {
  code?: string;
  forgotEmail?: string;
  confirmPassword?: string;
  email?: string;
  emailOrUsername?: string;
  password?: string;
  username?: string;
}

const initialRegisterDraft: RegisterDraft = {
  confirmPassword: "",
  email: "",
  password: "",
  username: ""
};

export const AuthModal = ({ isOpen, onClose, promptMessage }: AuthModalProps) => {
  const auth = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [forgotCode, setForgotCode] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<AuthMode>("register");
  const [password, setPassword] = useState("");
  const [registerDraft, setRegisterDraft] = useState<RegisterDraft>(initialRegisterDraft);
  const [isClosing, setIsClosing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const requestClose = () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 560);
  };

  useClickOutside(modalRef, requestClose);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      auth.completeLogin(response);
      onClose();
    }
  });

  const register = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      flushSync(() => {
        setErrors({});
        setSuccessMessage("Verification code sent. Check your email.");
        setMode("verify");
      });
    }
  });

  const verifyEmail = useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: () => {
      flushSync(() => {
        setErrors({});
        setSuccessMessage("Registration successful. Please log in.");
        setMode("login");
        setCode("");
        setRegisterDraft(initialRegisterDraft);
      });
    }
  });

  const forgotPassword = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      flushSync(() => {
        setErrors({});
        setSuccessMessage("Verification code sent. Check your email.");
        setForgotStep(2);
      });
    }
  });

  const submitForgotCode = useMutation({
    mutationFn: authApi.submitForgotPasswordCode,
    onSuccess: (message) => {
      flushSync(() => {
        setErrors({});
        setSuccessMessage(message || "A new password was sent to your email.");
        setForgotCode("");
        setForgotStep(1);
        setMode("login");
      });
    }
  });

  const validateLogin = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (!emailOrUsername.trim()) {
      nextErrors.emailOrUsername = "Enter your email or username.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateRegister = (): boolean => {
    const nextErrors: FieldErrors = {};

    if (registerDraft.username.trim().length < 3) {
      nextErrors.username = "At least 3 characters.";
    }

    if (!/^\S+@\S+\.\S+$/.test(registerDraft.email)) {
      nextErrors.email = "Enter a valid email.";
    }

    if (registerDraft.password.length < 6) {
      nextErrors.password = "At least 6 characters.";
    }

    if (registerDraft.confirmPassword !== registerDraft.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!validateLogin()) {
      return;
    }

    login.mutate({ username: emailOrUsername.trim(), password });
  };

  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!validateRegister()) {
      return;
    }

    register.mutate({
      email: registerDraft.email.trim(),
      password: registerDraft.password,
      username: registerDraft.username.trim()
    });
  };

  const handleVerifySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!code.trim()) {
      setErrors({ code: "Enter the email verification code." });
      return;
    }

    verifyEmail.mutate({ email: registerDraft.email.trim(), code: code.trim() });
  };

  const handleForgotSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (forgotStep === 1) {
      if (!/^\S+@\S+\.\S+$/.test(forgotEmail.trim())) {
        setErrors({ forgotEmail: "Enter the email used for your account." });
        return;
      }

      forgotPassword.mutate({ email: forgotEmail.trim() });
      return;
    }

    if (!forgotCode.trim()) {
      setErrors({ code: "Enter the verification code from your email." });
      return;
    }

    submitForgotCode.mutate({ email: forgotEmail.trim(), code: forgotCode.trim() });
  };

  const updateRegisterDraft = (key: keyof RegisterDraft, value: string) => {
    setRegisterDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  if (!isOpen) {
    return null;
  }

  const activeError =
    login.error ?? register.error ?? verifyEmail.error ?? forgotPassword.error ?? submitForgotCode.error;

  return (
    <div
      className={`home-auth-modal-backdrop ${isClosing ? "home-auth-modal-backdrop--closing" : ""}`}
      role="presentation"
    >
      <section
        aria-modal="true"
        className={`home-auth-modal ${isClosing ? "home-auth-modal--closing" : ""}`}
        ref={modalRef}
        role="dialog"
      >
        <button
          aria-label="Close authentication modal"
          className="home-auth-modal__close"
          onClick={requestClose}
          type="button"
        >
          <HomeIcon name="close" size={20} />
        </button>

        <div className="home-auth-modal__visual">
          <img alt="Flying around the world illustration" src={flyingAroundTheWorld} />
        </div>

        <div className="home-auth-modal__form">
          <div className="home-auth-modal__tabs">
            <button
              className={mode === "login" ? "home-auth-modal__tab--active" : ""}
              onClick={() => {
                setMode("login");
                setErrors({});
              }}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" || mode === "verify" ? "home-auth-modal__tab--active" : ""}
              onClick={() => {
                setMode("register");
                setErrors({});
              }}
              type="button"
            >
              Register
            </button>
          </div>

          {activeError ? (
            <div className="auth-alert auth-alert--error" role="alert">
              {getSafeErrorMessage(activeError)}
            </div>
          ) : null}

          {promptMessage && !activeError ? (
            <div className="auth-alert auth-alert--info" role="status">
              {promptMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="auth-alert auth-alert--success" role="status">
              {successMessage}
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="auth-form" noValidate onSubmit={handleLoginSubmit}>
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
                value={password}
              />
              <Button isLoading={login.isPending} type="submit">
                Login
              </Button>
              <button
                className="home-auth-modal__text-button"
                onClick={() => {
                  setMode("forgot");
                  setErrors({});
                  setSuccessMessage(null);
                }}
                type="button"
              >
                Forgot password?
              </button>
            </form>
          ) : null}

          {mode === "register" ? (
            <form className="auth-form" noValidate onSubmit={handleRegisterSubmit}>
              <AuthTextInput
                autoComplete="username"
                error={errors.username}
                icon="user"
                label="Username"
                onChange={(event) => updateRegisterDraft("username", event.target.value)}
                placeholder="bachlearns"
                value={registerDraft.username}
              />
              <AuthTextInput
                autoComplete="email"
                error={errors.email}
                icon="mail"
                label="Email"
                onChange={(event) => updateRegisterDraft("email", event.target.value)}
                placeholder="bach@example.com"
                type="email"
                value={registerDraft.email}
              />
              <PasswordInput
                autoComplete="new-password"
                error={errors.password}
                label="Password"
                onChange={(event) => updateRegisterDraft("password", event.target.value)}
                placeholder="Create password"
                value={registerDraft.password}
              />
              <PasswordInput
                autoComplete="new-password"
                error={errors.confirmPassword}
                label="Confirm"
                onChange={(event) => updateRegisterDraft("confirmPassword", event.target.value)}
                placeholder="Repeat password"
                value={registerDraft.confirmPassword}
              />
              <Button isLoading={register.isPending} type="submit">
                Register
              </Button>
            </form>
          ) : null}

          {mode === "verify" ? (
            <form className="auth-form" noValidate onSubmit={handleVerifySubmit}>
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
                value={code}
              />
              <Button isLoading={verifyEmail.isPending} type="submit">
                Submit code
              </Button>
            </form>
          ) : null}

          {mode === "forgot" ? (
            <form className="auth-form" noValidate onSubmit={handleForgotSubmit}>
              {forgotStep === 1 ? (
                <AuthTextInput
                  autoComplete="email"
                  error={errors.forgotEmail}
                  icon="mail"
                  label="Account email"
                  onChange={(event) => {
                    setForgotEmail(event.target.value);
                    setErrors((current) => ({ ...current, forgotEmail: undefined }));
                  }}
                  placeholder="bach@example.com"
                  type="email"
                  value={forgotEmail}
                />
              ) : (
                <AuthTextInput
                  autoComplete="one-time-code"
                  error={errors.code}
                  icon="mail"
                  inputMode="numeric"
                  label="Verification code"
                  onChange={(event) => {
                    setForgotCode(event.target.value);
                    setErrors((current) => ({ ...current, code: undefined }));
                  }}
                  placeholder="123456"
                  value={forgotCode}
                />
              )}
              <Button isLoading={forgotPassword.isPending || submitForgotCode.isPending} type="submit">
                {forgotStep === 1 ? "Send code" : "Submit code"}
              </Button>
              <button
                className="home-auth-modal__text-button"
                onClick={() => {
                  setMode("login");
                  setErrors({});
                  setSuccessMessage(null);
                }}
                type="button"
              >
                Back to login
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
};
