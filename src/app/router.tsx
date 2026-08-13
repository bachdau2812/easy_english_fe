import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthLayout } from "./layouts/AuthLayout";
import { MainLayout } from "./layouts/MainLayout";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { RootLayout } from "./layouts/RootLayout";
import { ForgotPasswordPage } from "../features/auth/pages/ForgotPasswordPage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { WordDetailPage } from "../features/dictionary/pages/WordDetailPage";
import { HomePage } from "../features/home/pages/HomePage";
import { LearningCategoryPage } from "../features/home/pages/LearningCategoryPage";
import { ListeningDetailPage } from "../features/listening/pages/ListeningDetailPage";
import { ListenAndTypeExplorePage } from "../features/listening/pages/ListenAndTypeExplorePage";
import { ListeningListPage } from "../features/listening/pages/ListeningListPage";
import { IeltsReadingDetailPage, IeltsReadingPage } from "../features/reading/pages/IeltsReadingPage";
import { WritingExplorePage, WritingPracticePage } from "../features/writing/pages/WritingPage";
import { ReviewPage } from "../features/review/pages/ReviewPage";
import { SearchPage } from "../features/search/pages/SearchPage";
import { StatisticsPage } from "../features/statistics/pages/StatisticsPage";
import { VocabularyExplorePage, VocabularyTopicWordsPage } from "../features/vocabulary/pages/VocabularyExplorePage";
import { SavedVocabularyPage } from "../features/vocabulary/pages/SavedVocabularyPage";
import { EmptyState } from "../shared/components/EmptyState";
import { ROUTES } from "../shared/constants/routes";

const DashboardPage = () => (
  <section className="page">
    <div className="page__header">
      <h1 className="page__title">Dashboard</h1>
      <p className="page__description">A home base for today&apos;s learning work.</p>
    </div>
    <div className="panel">
      <EmptyState
        description="Daily queue, streak, and recent activity can be composed here as APIs mature."
        title="Dashboard placeholder"
      />
    </div>
  </section>
);

const ProfilePage = () => (
  <section className="page">
    <div className="page__header">
      <h1 className="page__title">Profile</h1>
      <p className="page__description">User info and username editing use `/users/info`.</p>
    </div>
    <div className="panel">
      <EmptyState
        description="Wire this page to `authApi.updateUserInfo` when profile editing UI is expanded."
        title="Profile placeholder"
      />
    </div>
  </section>
);

const NotFoundPage = () => (
  <section className="page">
    <div className="page__header">
      <h1 className="page__title">Page not found</h1>
      <p className="page__description">This route is not part of the current app map.</p>
    </div>
  </section>
);

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: ROUTES.home,
        element: <HomePage />
      },
      {
        path: ROUTES.learningCategory(),
        element: <LearningCategoryPage />
      },
      {
        path: ROUTES.vocabularyTopics,
        element: <VocabularyExplorePage mode="topics" />
      },
      {
        path: ROUTES.vocabularyTopicWords(),
        element: <VocabularyTopicWordsPage />
      },
      {
        path: ROUTES.vocabularyLevels,
        element: <VocabularyExplorePage mode="levels" />
      },
      {
        path: ROUTES.vocabularyMine,
        element: <VocabularyExplorePage mode="mine" />
      },
      {
        path: ROUTES.listenAndType,
        element: <ListenAndTypeExplorePage />
      },
      {
        path: ROUTES.readingIelts,
        element: <IeltsReadingPage />
      },
      {
        path: ROUTES.readingIeltsSource(),
        element: <IeltsReadingDetailPage />
      },
      {
        path: ROUTES.writingTask(),
        element: <WritingExplorePage />
      },
      {
        path: ROUTES.writingProblem(),
        element: <WritingPracticePage />
      },
      {
        element: <AuthLayout />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
          { path: ROUTES.forgotPassword, element: <ForgotPasswordPage /> }
        ]
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: ROUTES.listenAndTypeLesson(),
            element: <ListeningDetailPage />
          },
          {
            path: "/app",
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate replace to={ROUTES.dashboard} /> },
              { path: "dashboard", element: <DashboardPage /> },
              { path: "search", element: <SearchPage /> },
              { path: "words/:wordId", element: <WordDetailPage /> },
              { path: "vocabularies", element: <SavedVocabularyPage /> },
              { path: "review", element: <ReviewPage /> },
              { path: "listening", element: <ListeningListPage /> },
              { path: "listening/:lessonId", element: <ListeningDetailPage /> },
              { path: "statistics", element: <StatisticsPage /> },
              { path: "profile", element: <ProfilePage /> }
            ]
          }
        ]
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  }
]);

export const AppRouter = () => <RouterProvider router={router} />;
