import { InputHTMLAttributes, useId, useState } from "react";
import { AuthIcon } from "./AuthIcon";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  label: string;
}

export const PasswordInput = ({ error, id, label, ...props }: PasswordInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`auth-input-shell ${error ? "auth-input-shell--error" : ""}`}>
        <AuthIcon name="lock" />
        <input
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={Boolean(error)}
          id={inputId}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <button
          aria-label={isVisible ? "Hide password" : "Show password"}
          className="auth-icon-button"
          onClick={() => setIsVisible((current) => !current)}
          type="button"
        >
          <AuthIcon name={isVisible ? "eyeOff" : "eye"} />
        </button>
      </div>
      {error ? (
        <span className="auth-field__error" id={`${inputId}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
};
