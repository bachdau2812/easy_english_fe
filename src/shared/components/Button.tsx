import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

export const Button = ({
  children,
  className = "",
  disabled,
  isLoading = false,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) => (
  <button
    className={`button button--${variant} ${className}`}
    disabled={disabled || isLoading}
    type={type}
    {...props}
  >
    {isLoading ? "Loading..." : children}
  </button>
);
