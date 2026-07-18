interface PageLoadingProps {
  label?: string;
}

export const PageLoading = ({ label = "Loading..." }: PageLoadingProps) => (
  <div className="state" role="status">
    <strong>{label}</strong>
  </div>
);
