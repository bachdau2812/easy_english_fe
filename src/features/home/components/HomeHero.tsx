import { HomeIcon } from "./HomeIcon";

const courseCards = [
  {
    description: "Learn English vocabulary",
    icon: "book" as const,
    tone: "sky",
    title: "Vocabulary"
  },
  {
    description: "Practice with audio lessons",
    icon: "headphones" as const,
    tone: "lavender",
    title: "Listening"
  },
  {
    description: "Practice reading comprehension",
    icon: "reading" as const,
    tone: "mint",
    title: "Reading"
  },
  {
    description: "Listen, repeat, and speak clearer",
    icon: "spell" as const,
    tone: "sun",
    title: "Pronunciation"
  },
  {
    description: "Practice clear English writing",
    icon: "pen" as const,
    tone: "rose",
    title: "Writing"
  }
];

export const HomeHero = () => (
  <section className="guest-hero" id="vocabulary">
    <div className="guest-hero__heading">
      <h1>Build your English every day</h1>
      <p>Learn vocabulary, practice listening, and review smarter with one simple app.</p>
    </div>

    <div className="guest-course-row" aria-label="Learning categories">
      {courseCards.map((card) => (
        <article className={`guest-course-card guest-course-card--${card.tone}`} key={card.title}>
          <span className="guest-course-card__pattern" />
          <span className="guest-course-card__icon">
            <HomeIcon name={card.icon} size={42} />
          </span>
          <h2>{card.title}</h2>
          <p>{card.description}</p>
        </article>
      ))}
    </div>
  </section>
);
