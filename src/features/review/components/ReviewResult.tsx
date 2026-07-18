export const ReviewResult = ({ correct }: { correct?: boolean | null }) => (
  <div className="panel">{correct ? "Correct" : "Review result will appear after submission."}</div>
);
