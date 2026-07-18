import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  eyebrow: string;
  subtitle: string;
  title: string;
}

export const AuthCard = ({ children, eyebrow, subtitle, title }: AuthCardProps) => (
  <section className="auth-card">
    <div className="auth-card__header">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </div>
    {children}
  </section>
);
