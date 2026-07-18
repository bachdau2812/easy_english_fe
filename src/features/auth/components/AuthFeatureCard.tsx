import { AuthIcon } from "./AuthIcon";

interface AuthFeatureCardProps {
  description: string;
  icon: "book" | "chart" | "ear" | "target";
  meta?: string;
  title: string;
}

export const AuthFeatureCard = ({ description, icon, meta, title }: AuthFeatureCardProps) => (
  <article className="auth-feature-card">
    <span className="auth-feature-card__icon">
      <AuthIcon name={icon} />
    </span>
    <div>
      {meta ? <span className="auth-feature-card__meta">{meta}</span> : null}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  </article>
);
