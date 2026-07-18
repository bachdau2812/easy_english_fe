import { Link } from "react-router-dom";
import { ROUTES } from "../../../shared/constants/routes";
import { HomeIcon } from "../../home/components/HomeIcon";
import { ListenAndTypeReturnState, ListenExerciseSummaryResponse } from "../types";

export const ListeningLessonCard = ({
  lesson,
  returnState
}: {
  lesson: ListenExerciseSummaryResponse;
  returnState?: ListenAndTypeReturnState;
}) => (
  <article className="listen-lesson-card">
    <span className="listen-lesson-card__icon">
      <HomeIcon name="headphones" size={24} />
    </span>
    <div>
      <h3>
        {lesson.title ?? "Listening lesson"}
        <small>{lesson.speechToTextLangCode ?? "Unknown"}</small>
      </h3>
      <p>
        {lesson.completedPart ?? 0}/{lesson.totalPart ?? 0} part
      </p>
    </div>
    {lesson.id ? (
      <Link state={returnState} to={ROUTES.listenAndTypeLesson(lesson.id)}>
        Open lesson
      </Link>
    ) : null}
  </article>
);
