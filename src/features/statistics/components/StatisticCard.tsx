interface StatisticCardProps {
  label: string;
  value?: number | null;
}

export const StatisticCard = ({ label, value }: StatisticCardProps) => (
  <article className="panel">
    <strong>{label}</strong>
    <p>{value ?? 0}</p>
  </article>
);
