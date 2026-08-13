import { Link, Navigate, useParams } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { HomeIcon } from "../components/HomeIcon";
import { LearningRouteChrome } from "../components/LearningRouteChrome";
import {
  getLearningCategoryPageClassName,
  getLearningNavigationGroup
} from "../learningNavigation";

export const LearningCategoryPage = () => {
  const { categoryKey } = useParams();
  const group = getLearningNavigationGroup(categoryKey);

  if (!group) {
    return <Navigate replace to={ROUTES.home} />;
  }

  return (
    <LearningRouteChrome compactTitle={group.label}>
      <section className={getLearningCategoryPageClassName(group.key)}>
        <header className="learning-category-page__header">
          <span><HomeIcon name={group.icon} size={34} /></span>
          <div>
            <p>Learning category</p>
            <h1>{group.label}</h1>
            <small>{group.description}</small>
          </div>
        </header>
        <div className="learning-category-page__list">
          {group.items.map((item) =>
            item.disabled ? (
              <button disabled key={item.label} type="button">
                <span className="learning-category-page__icon"><HomeIcon name={item.icon} size={22} /></span>
                <span className="learning-category-page__copy"><strong>{item.label}</strong><small>{item.description}</small></span>
              </button>
            ) : (
              <Link
                key={item.label}
                to={item.to ?? { pathname: ROUTES.home, hash: item.href }}
              >
                <span className="learning-category-page__icon"><HomeIcon name={item.icon} size={22} /></span>
                <span className="learning-category-page__copy"><strong>{item.label}</strong><small>{item.description}</small></span>
                <HomeIcon name="chevron" size={20} />
              </Link>
            )
          )}
        </div>
      </section>
    </LearningRouteChrome>
  );
};
