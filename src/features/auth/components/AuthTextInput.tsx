import { InputHTMLAttributes, useId } from "react";
import { AuthIcon } from "./AuthIcon";

interface AuthTextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon: "mail" | "user";
  label: string;
}

export const AuthTextInput = ({ error, icon, id, label, ...props }: AuthTextInputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="auth-field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`auth-input-shell ${error ? "auth-input-shell--error" : ""}`}>
        <AuthIcon name={icon} />
        <input
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={Boolean(error)}
          id={inputId}
          {...props}
        />
      </div>
      {error ? (
        <span className="auth-field__error" id={`${inputId}-error`}>
          {error}
        </span>
      ) : null}
    </div>
  );
};
