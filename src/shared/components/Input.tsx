import { InputHTMLAttributes, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label: string;
}

export const Input = ({ className = "", error, id, label, ...props }: InputProps) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={`input-field ${className}`}>
      <label htmlFor={inputId}>{label}</label>
      <input aria-invalid={Boolean(error)} id={inputId} {...props} />
      {error ? <span className="input-field__error">{error}</span> : null}
    </div>
  );
};
