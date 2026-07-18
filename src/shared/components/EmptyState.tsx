interface EmptyStateProps {
  description?: string;
  title?: string;
}

export const EmptyState = ({
  description = "There is nothing to show yet.",
  title = "No results"
}: EmptyStateProps) => (
  <div className="state">
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
);
