import { ErrorState } from "../../../shared/components/ErrorState";
import { PageLoading } from "../../../shared/components/PageLoading";
import { StatisticCard } from "../components/StatisticCard";
import { StreakCard } from "../components/StreakCard";
import { useStatistics } from "../hooks/useStatistics";

export const StatisticsPage = () => {
  const daily = useStatistics("daily");
  const overall = useStatistics("overall");

  if (daily.isLoading || overall.isLoading) {
    return <PageLoading label="Loading statistics..." />;
  }

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Statistics</h1>
        <p className="page__description">Current APIs derive statistics from review attempts.</p>
      </div>
      {daily.isError ? <ErrorState error={daily.error} title="Could not load daily statistics" /> : null}
      {overall.isError ? <ErrorState error={overall.error} title="Could not load overall statistics" /> : null}
      <StatisticCard label="Daily attempts" value={daily.data?.totalAttempts} />
      <StatisticCard label="Overall unique vocabulary" value={overall.data?.totalUniqueVocab} />
      <StatisticCard label="Most-wrong count" value={overall.data?.wrongCountVocab} />
      <StreakCard />
    </section>
  );
};
