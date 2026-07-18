import { FormEvent, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { getSafeErrorMessage } from "../../../shared/api/apiError";
import { Button } from "../../../shared/components/Button";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";
import { authApi } from "../../auth/api/authApi";
import { AuthTextInput } from "../../auth/components/AuthTextInput";
import { PasswordInput } from "../../auth/components/PasswordInput";
import { useAuth } from "../../auth/hooks/useAuth";
import { HomeIcon } from "./HomeIcon";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AccountTab = "password" | "profile";

export const AccountModal = ({ isOpen, onClose }: AccountModalProps) => {
  const auth = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>("profile");
  const [newPassword, setNewPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [username, setUsername] = useState(auth.username ?? "");

  useClickOutside(modalRef, onClose);

  const updateProfile = useMutation({
    mutationFn: () => {
      if (!auth.userId) {
        throw new Error("Please sign in again before changing your profile.");
      }

      return authApi.updateUserInfo({ userId: auth.userId, username: username.trim() });
    },
    onSuccess: (user) => {
      auth.updateSessionUser(user);
      setSuccessMessage("Username updated.");
    }
  });

  const resetPassword = useMutation({
    mutationFn: () => {
      if (!auth.userId) {
        throw new Error("Please sign in again before changing your password.");
      }

      return authApi.resetPassword({
        userId: auth.userId,
        oldPassword,
        newPassword
      });
    },
    onSuccess: (message) => {
      setOldPassword("");
      setNewPassword("");
      setSuccessMessage(message || "Password updated.");
    }
  });

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (username.trim().length < 3) {
      return;
    }

    updateProfile.mutate();
  };

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage(null);

    if (!oldPassword || newPassword.length < 6) {
      return;
    }

    resetPassword.mutate();
  };

  if (!isOpen) {
    return null;
  }

  const activeError = updateProfile.error ?? resetPassword.error;

  return (
    <div className="home-auth-modal-backdrop" role="presentation">
      <section
        aria-modal="true"
        className="home-account-modal"
        ref={modalRef}
        role="dialog"
      >
        <button
          aria-label="Close account settings"
          className="home-auth-modal__close"
          onClick={onClose}
          type="button"
        >
          <HomeIcon name="close" size={20} />
        </button>

        <div className="home-account-modal__header">
          <p>Account settings</p>
          <h2>{auth.username ?? "Learner"}</h2>
          <span>Update your public name or refresh your password.</span>
        </div>

        <div className="home-auth-modal__tabs">
          <button
            className={activeTab === "profile" ? "home-auth-modal__tab--active" : ""}
            onClick={() => {
              setActiveTab("profile");
              setSuccessMessage(null);
            }}
            type="button"
          >
            Username
          </button>
          <button
            className={activeTab === "password" ? "home-auth-modal__tab--active" : ""}
            onClick={() => {
              setActiveTab("password");
              setSuccessMessage(null);
            }}
            type="button"
          >
            Password
          </button>
        </div>

        {activeError ? (
          <div className="auth-alert auth-alert--error" role="alert">
            {getSafeErrorMessage(activeError)}
          </div>
        ) : null}

        {successMessage ? (
          <div className="auth-alert auth-alert--success" role="status">
            {successMessage}
          </div>
        ) : null}

        {activeTab === "profile" ? (
          <form className="auth-form" noValidate onSubmit={handleProfileSubmit}>
            <AuthTextInput
              autoComplete="username"
              error={username.trim().length > 0 && username.trim().length < 3 ? "At least 3 characters." : undefined}
              icon="user"
              label="Username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Your username"
              value={username}
            />
            <Button isLoading={updateProfile.isPending} type="submit">
              Save username
            </Button>
          </form>
        ) : null}

        {activeTab === "password" ? (
          <form className="auth-form" noValidate onSubmit={handlePasswordSubmit}>
            <PasswordInput
              autoComplete="current-password"
              error={undefined}
              label="Current password"
              onChange={(event) => setOldPassword(event.target.value)}
              placeholder="Current password"
              value={oldPassword}
            />
            <PasswordInput
              autoComplete="new-password"
              error={newPassword.length > 0 && newPassword.length < 6 ? "At least 6 characters." : undefined}
              label="New password"
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New password"
              value={newPassword}
            />
            <Button isLoading={resetPassword.isPending} type="submit">
              Change password
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
};
