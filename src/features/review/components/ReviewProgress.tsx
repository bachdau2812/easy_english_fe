export const ReviewProgress = ({ current, total }: { current: number; total: number }) => (
  <div className="panel">
    Progress: {current} / {total}
  </div>
);
