import flyingAroundTheWorld from "../../../assets/flying-around-the-world.svg";
import { AuthFeatureCard } from "./AuthFeatureCard";

export const AuthHeroPanel = () => (
  <section className="auth-hero-panel" aria-label="Vocab App learning highlights">
    <div className="auth-hero-visual">
      <img alt="Flying around the world illustration" src={flyingAroundTheWorld} />
    </div>

    <div className="auth-feature-grid">
      <AuthFeatureCard
        description="Meanings, examples, pronunciation, and translations in one friendly place."
        icon="book"
        meta="1M+"
        title="Words"
      />
      <AuthFeatureCard
        description="Build real skills with quick, interactive exercises."
        icon="ear"
        title="English practice"
      />
      <AuthFeatureCard
        description="Review the right words at the right moment."
        icon="target"
        title="Smart review"
      />
      <AuthFeatureCard
        description="Track accuracy and the words you miss most often."
        icon="chart"
        title="Progress tracking"
      />
    </div>
  </section>
);
