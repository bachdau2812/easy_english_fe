import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { EmptyState } from "../../../shared/components/EmptyState";
import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { HomeIcon } from "../../home/components/HomeIcon";
import { ListeningLessonCard } from "../components/ListeningLessonCard";
import {
  useListeningCategories,
  useListeningExercises,
  useListeningSubCategories
} from "../hooks/useListeningExercises";
import { ListenAndTypeReturnState } from "../types";

export const ListenAndTypeBrowser = ({
  className = "",
  onTitleChange
}: {
  className?: string;
  onTitleChange?: (title: string) => void;
}) => {
  const location = useLocation();
  const returnState = location.state as ListenAndTypeReturnState | null;
  const categories = useListeningCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(returnState?.categoryId ?? null);
  const [selectedSubCategoryName, setSelectedSubCategoryName] = useState<string | null>(
    returnState?.subCategoryName ?? null
  );
  const subCategories = useListeningSubCategories(selectedCategoryId);
  const lessons = useListeningExercises(selectedSubCategoryName);
  const selectedCategory = categories.data?.find((category) => category.id === selectedCategoryId);
  const selectedCategoryTitle =
    selectedCategory?.categoryName ?? selectedCategory?.slug ?? returnState?.categoryTitle ?? null;

  useEffect(() => {
    const nextState = location.state as ListenAndTypeReturnState | null;

    if (!nextState) {
      return;
    }

    setSelectedCategoryId(nextState.categoryId ?? null);
    setSelectedSubCategoryName(nextState.subCategoryName ?? null);
    onTitleChange?.(nextState.subCategoryName ?? nextState.categoryTitle ?? "Listen and Type");
  }, [location.key, location.state, onTitleChange]);

  return (
    <div className={`listen-type-browser ${selectedCategoryId ? "listen-type-browser--selected" : ""} ${className}`}>
      {categories.isLoading ? <PageLoading label="Loading categories..." /> : null}
      {categories.isError ? <ErrorState error={categories.error} title="Could not load categories" /> : null}
      {categories.data?.length ? (
        <div className="listen-category-list" aria-label="Listen and type categories">
          {categories.data.map((category) => {
            const label = category.categoryName ?? category.slug ?? "Listen category";

            return (
              <button
                className={`listen-category-card ${selectedCategoryId === category.id ? "listen-category-card--active" : ""}`}
                data-label={label}
                disabled={!category.id}
                key={category.id ?? category.slug}
                onClick={() => {
                  setSelectedCategoryId(category.id ?? null);
                  setSelectedSubCategoryName(null);
                  onTitleChange?.(label);
                }}
                title={label}
                type="button"
              >
                <span className="listen-category-card__icon">
                  <HomeIcon name="waveform" size={25} />
                </span>
                <span>
                  <strong>{label}</strong>
                </span>
                <HomeIcon name="chevron" size={20} />
              </button>
            );
          })}
        </div>
      ) : null}

      {!categories.isLoading && !categories.isError && !categories.data?.length ? (
        <EmptyState description="No listen-and-type categories were returned." />
      ) : null}

      {selectedCategoryId ? (
        <section className={`listen-content-panel ${selectedSubCategoryName ? "listen-content-panel--lessons" : ""}`}>
          {subCategories.isLoading ? <PageLoading label="Loading sub categories..." /> : null}
          {subCategories.isError ? (
            <ErrorState error={subCategories.error} title="Could not load sub categories" />
          ) : null}
          {!subCategories.isLoading && !subCategories.isError && !subCategories.data?.length ? (
            <EmptyState description="No sub categories were returned for this category." />
          ) : null}
          {subCategories.data?.length && !selectedSubCategoryName ? (
            <div className="listen-subcategory-list" aria-label="Listen and type sub categories">
              {subCategories.data.map((subCategoryName) => (
                <button
                  className={`listen-subcategory-card ${
                    selectedSubCategoryName === subCategoryName ? "listen-subcategory-card--active" : ""
                  }`}
                  key={subCategoryName}
                  onClick={() => {
                    setSelectedSubCategoryName(subCategoryName);
                    onTitleChange?.(subCategoryName);
                  }}
                  type="button"
                >
                  <span>
                    <HomeIcon name="quiz" size={21} />
                  </span>
                  <strong>{subCategoryName}</strong>
                  <HomeIcon name="chevron" size={17} />
                </button>
              ))}
            </div>
          ) : null}

          {selectedSubCategoryName ? (
            <section className="listen-lessons-panel">
              {lessons.isLoading ? <PageLoading label="Loading lessons..." /> : null}
              {lessons.isError ? <ErrorState error={lessons.error} title="Could not load lessons" /> : null}
              {!lessons.isLoading && !lessons.data?.length ? (
                <EmptyState description="No lessons were returned for this sub category." />
              ) : null}
              {lessons.data?.length ? (
                <div className="listen-lesson-grid">
                  {lessons.data.map((lesson) => (
                    <ListeningLessonCard
                      key={lesson.id}
                      lesson={lesson}
                      returnState={{
                        categoryId: selectedCategoryId,
                        categoryTitle: selectedCategoryTitle,
                        subCategoryName: selectedSubCategoryName
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export const ListeningListPage = () => (
  <section className="page">
    <div className="page__header">
      <h1 className="page__title">Listen and Type</h1>
      <p className="page__description">Choose a category first, then pick a listening lesson.</p>
    </div>
    <ListenAndTypeBrowser />
  </section>
);
