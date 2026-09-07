import type { IeltsWritingReview, WritingReviewCriterion } from "../types";
import { isIeltsWritingReview } from "../writingReview";
import "./WritingReview.css";

const patternLabel = (value: string) => {
  switch (value.trim().toLowerCase()) {
    case "isolated": return "Đơn lẻ";
    case "recurring": return "Lặp lại";
    default: return value.trim() || "Chưa phân loại";
  }
};

const severityLabel = (value: string) => {
  switch (value.trim().toLowerCase()) {
    case "minor": return "Nhẹ";
    case "major": return "Nghiêm trọng";
    default: return value.trim() || "Chưa phân loại";
  }
};

export const WritingReviewResult = ({ value }: { value: unknown }) => {
  if (isIeltsWritingReview(value)) return <WritingReview review={value} />;
  return (
    <div className="writing-ai-review" lang="vi" role="status">
      <section className="writing-ai-review__intro">
        <h3>Review chưa đầy đủ</h3>
        <p>Kết quả AI thiếu dữ liệu bắt buộc hoặc có dữ liệu không hợp lệ. Vui lòng yêu cầu chấm lại bài viết.</p>
      </section>
    </div>
  );
};

const ReviewList = ({ title, items, empty = "Không có nội dung được ghi nhận." }: { title: string; items: string[]; empty?: string }) => (
  <div className="writing-ai-review__field">
    <h4>{title}</h4>
    {items.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="writing-ai-review__muted">{empty}</p>}
  </div>
);

const ReviewText = ({ title, text }: { title: string; text: string }) => (
  <div className="writing-ai-review__field"><h4>{title}</h4><p>{text || "Chưa có nhận xét."}</p></div>
);

const CriterionReview = ({ title, criterion, open }: { title: string; criterion: WritingReviewCriterion; open: boolean }) => (
  <details className="writing-ai-review__criterion" open={open}>
    <summary><span>{title}</span><strong>Band {criterion.band}</strong></summary>
    <div className="writing-ai-review__criterion-body">
      <ReviewText title="Lý do chấm band" text={criterion.justificationVi} />
      <div className="writing-ai-review__columns">
        <ReviewList title="Điểm mạnh" items={criterion.strengthsVi} />
        <ReviewList title="Điểm cần cải thiện" items={criterion.weaknessesVi} />
      </div>
      <ReviewText title="Vì sao chưa đạt band cao hơn?" text={criterion.whyNotHigherVi} />
      <ReviewList title="Cách cải thiện" items={criterion.improvementsVi} />
    </div>
  </details>
);

const Correction = ({ original, corrected, originalLabel = "Bản gốc", correctedLabel = "Gợi ý sửa" }: {
  original: string; corrected: string; originalLabel?: string; correctedLabel?: string;
}) => (
  <dl className="writing-ai-review__correction">
    <div><dt>{originalLabel}</dt><dd>{original}</dd></div>
    <div><dt>{correctedLabel}</dt><dd>{corrected}</dd></div>
  </dl>
);

export const WritingReview = ({ review }: { review: IeltsWritingReview }) => {
  const task1 = "task1Analysis" in review ? review.task1Analysis : null;
  const task2 = "task2Analysis" in review ? review.task2Analysis : null;
  const criteria: Array<{ key: keyof IeltsWritingReview["criteria"]; title: string }> = [
    { key: "task", title: task1 ? "Task Achievement · Đáp ứng yêu cầu đề" : "Task Response · Trả lời yêu cầu đề" },
    { key: "coherenceCohesion", title: "Coherence & Cohesion · Mạch lạc và liên kết" },
    { key: "lexicalResource", title: "Lexical Resource · Vốn từ vựng" },
    { key: "grammaticalRangeAccuracy", title: "Grammatical Range & Accuracy · Ngữ pháp" }
  ];

  return (
    <div className="writing-ai-review" lang="vi">
      <section className="writing-ai-review__intro">
        <span className="writing-ai-review__task">IELTS Writing Task {task1 ? 1 : 2}</span>
        <h3>Nhận xét tổng quan</h3>
        <p>{review.summaryVi || "Chưa có nhận xét tổng quan."}</p>
      </section>

      <section className="writing-ai-review__section">
        <h3>Đánh giá theo tiêu chí</h3>
        <div className="writing-ai-review__criteria">
          {criteria.map(({ key, title }, index) => <CriterionReview key={key} title={title} criterion={review.criteria[key]} open={index === 0} />)}
        </div>
      </section>

      {task1 ? <section className="writing-ai-review__section">
        <h3>Phân tích Task 1</h3>
        <p className="writing-ai-review__status">Overview: <strong>{task1.overviewPresent ? "Đã có" : "Chưa có"}</strong></p>
        <ReviewText title="Đánh giá overview" text={task1.overviewAssessmentVi} />
        <ReviewList title="Đặc điểm chính đã trình bày" items={task1.keyFeaturesCoveredVi} />
        <ReviewList title="Đặc điểm còn thiếu hoặc chưa rõ" items={task1.missingOrWeakKeyFeaturesVi} />
        <div className="writing-ai-review__field">
          <h4>Sai lệch dữ kiện ({task1.factualErrors.length})</h4>
          {task1.factualErrors.length ? task1.factualErrors.map((error, index) => <article className="writing-ai-review__example" key={index}>
            <span className={`writing-ai-review__tag${error.severity.trim().toLowerCase() === "major" ? " writing-ai-review__tag--major" : ""}`}>{severityLabel(error.severity)}</span>
            <Correction original={error.learnerClaim} corrected={error.correctedFact} originalLabel="Nhận định trong bài" correctedLabel="Dữ kiện đúng" />
            <p>{error.explanationVi}</p>
          </article>) : <p className="writing-ai-review__muted">Không ghi nhận sai lệch dữ kiện.</p>}
        </div>
      </section> : null}

      {task2 ? <section className="writing-ai-review__section">
        <h3>Phân tích Task 2</h3>
        <ReviewText title="Dạng đề" text={task2.questionType} />
        <ReviewList title="Yêu cầu của đề bài" items={task2.taskRequirementsVi} />
        <ReviewList title="Yêu cầu đã đáp ứng" items={task2.addressedRequirementsVi} />
        <ReviewList title="Yêu cầu còn thiếu hoặc chưa rõ" items={task2.missingOrWeakRequirementsVi} />
        <p className="writing-ai-review__status">Đề yêu cầu nêu lập trường: <strong>{task2.positionRequired ? "Có" : "Không"}</strong></p>
        <ReviewText title="Đánh giá lập trường" text={task2.positionAssessmentVi} />
        <ReviewText title="Phát triển ý" text={task2.ideaDevelopmentAssessmentVi} />
        <ReviewText title="Mức độ liên quan đến đề bài" text={task2.relevanceAssessmentVi} />
      </section> : null}

      <section className="writing-ai-review__section">
        <h3>Lỗi ngữ pháp ({review.grammarErrors.length})</h3>
        {review.grammarErrors.length ? review.grammarErrors.map((error, index) => <article className="writing-ai-review__example" key={index}>
          <div className="writing-ai-review__example-heading"><h4>{error.errorType}</h4><span className="writing-ai-review__tag">{patternLabel(error.pattern)}</span></div>
          <Correction original={error.original} corrected={error.corrected} />
          <p>{error.explanationVi}</p>
        </article>) : <p className="writing-ai-review__muted">Không ghi nhận lỗi ngữ pháp.</p>}
      </section>

      <section className="writing-ai-review__section">
        <h3>Vấn đề từ vựng ({review.lexicalIssues.length})</h3>
        {review.lexicalIssues.length ? review.lexicalIssues.map((issue, index) => <article className="writing-ai-review__example" key={index}>
          <h4>{issue.issueType}</h4>
          <Correction original={issue.original} corrected={issue.suggestion} />
          <p>{issue.explanationVi}</p>
        </article>) : <p className="writing-ai-review__muted">Không ghi nhận vấn đề từ vựng.</p>}
      </section>

      <section className="writing-ai-review__section">
        <h3>Cấu trúc ngữ pháp dùng tốt</h3>
        {review.successfulGrammar.length ? review.successfulGrammar.map((example, index) => <article className="writing-ai-review__example" key={index}>
          <h4>{example.feature}</h4><blockquote>{example.excerpt}</blockquote><p>{example.commentVi}</p>
        </article>) : <p className="writing-ai-review__muted">Chưa có cấu trúc nổi bật được ghi nhận.</p>}
      </section>

      <section className="writing-ai-review__section writing-ai-review__priorities">
        <h3>Ưu tiên cải thiện</h3>
        {review.priorityImprovementsVi.length ? <ol>{review.priorityImprovementsVi.map((item, index) => <li key={index}>{item}</li>)}</ol> : <p className="writing-ai-review__muted">Chưa có đề xuất ưu tiên.</p>}
      </section>
    </div>
  );
};
