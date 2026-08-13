import { HomeIcon } from "./HomeIcon";
import { getLearningNavigationGroup, homeCourseKeys, LearningNavigationKey } from "../learningNavigation";
import { useMediaQuery } from "../../../shared/hooks/useMediaQuery";

const courseTones: Record<LearningNavigationKey, string> = {
  vocabulary: "sky",
  listening: "lavender",
  reading: "mint",
  pronunciation: "sun",
  writing: "rose"
};

export const HomeHero = ({
  onCourseSelect
}: {
  onCourseSelect?: (key: LearningNavigationKey) => void;
}) => {
  const isMobile = useMediaQuery("(max-width: 760px)");

  return (
    <section className="guest-hero" id="vocabulary">
      <div className="guest-hero__heading">
        <h1>Build your English every day</h1>
        <p>Learn vocabulary, practice listening, and review smarter with one simple app.</p>
      </div>

      <div className="guest-course-row" aria-label="Learning categories">
        {homeCourseKeys.map((key) => {
          const card = getLearningNavigationGroup(key);
          if (!card) {
            return null;
          }
          const content = (
            <>
              <span className="guest-course-card__pattern" />
              <span className="guest-course-card__icon">
                <HomeIcon name={card.icon} size={42} />
              </span>
              <h2>{card.label}</h2>
              <p>{card.description}</p>
            </>
          );

          return isMobile ? (
            <button
              aria-label={`Open ${card.label} categories`}
              className={`guest-course-card guest-course-card--${courseTones[key]}`}
              key={key}
              onClick={() => onCourseSelect?.(key)}
              type="button"
            >
              {content}
            </button>
          ) : (
            <article className={`guest-course-card guest-course-card--${courseTones[key]}`} key={key}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
};
