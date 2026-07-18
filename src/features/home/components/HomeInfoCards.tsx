import { HomeIcon } from "./HomeIcon";

const cards = [
  {
    icon: "book" as const,
    metric: "1M+",
    title: "Words",
    description: "Meanings, examples, pronunciation, and translations."
  },
  {
    icon: "headphones" as const,
    metric: "Skill",
    title: "English practice",
    description: "Train different skills through interactive exercise types."
  },
  {
    icon: "brain" as const,
    metric: "SRS",
    title: "Smart review",
    description: "Review the right word at the right moment."
  },
  {
    icon: "chart" as const,
    metric: "Live",
    title: "Progress tracking",
    description: "Follow accuracy and the words you often miss."
  }
];

export const HomeInfoCards = () => (
  <section className="guest-info-grid" id="learning-lab">
    {cards.map((card) => (
      <article className="guest-info-card" key={card.title}>
        <span className="guest-info-card__icon">
          <HomeIcon name={card.icon} size={28} />
        </span>
        <div>
          <span>{card.metric}</span>
          <h3>{card.title}</h3>
          <p>{card.description}</p>
        </div>
      </article>
    ))}
  </section>
);
