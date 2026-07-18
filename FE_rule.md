## UI/UX Visual Style Rule

Tôi không muốn giao diện bị đại trà, khô cứng, hoặc giống các web dashboard cơ bản mà AI thường tạo ra.  
Frontend cần có cảm giác hiện đại, mượt, trẻ trung, hợp Gen Z, nhưng vẫn phải dễ nhìn, dễ thao tác và không làm người dùng bị rối.

### Design direction

- Giao diện phải có cá tính riêng, không dùng layout quá mặc định kiểu: navbar đơn giản + card trắng + button xanh cơ bản.
- Ưu tiên cảm giác:
  - modern
  - smooth
  - playful nhưng không trẻ con
  - clean
  - premium
  - dễ tập trung khi học
- Phù hợp với ứng dụng học tiếng Anh/vocabulary/listening/review.
- Có thể dùng hiệu ứng chuyển động, hover, animation, micro-interaction, nhưng phải có mục đích và không gây khó chịu.

### Visual style

- Dùng màu sắc hiện đại, có điểm nhấn rõ ràng.
- Không dùng quá nhiều màu cùng lúc.
- Nên có một primary color, một accent color và neutral background.
- Có thể dùng gradient nhẹ, glassmorphism nhẹ, shadow mềm, border tinh tế.
- Không làm UI quá phẳng hoặc quá giống admin dashboard.
- Card, button, input, dropdown phải có style riêng, nhìn có chiều sâu.
- Typography phải dễ đọc, phân cấp rõ ràng:
  - heading nổi bật
  - body text dễ đọc
  - label/helper text nhỏ nhưng rõ
- Spacing phải thoáng, không nhồi nhét.

### Animation / interaction

- Thêm micro-interactions cho các hành động chính:
  - hover button
  - focus input
  - open/close dropdown
  - loading autocomplete
  - chọn suggestion
  - chuyển câu hỏi review
  - submit answer đúng/sai
  - audio play/pause
- Animation phải mượt, ngắn, tự nhiên.
- Không dùng animation quá lố, không làm chậm thao tác.
- Ưu tiên các transition khoảng 150ms–300ms.
- Với các flow học tập, animation nên giúp người dùng cảm thấy có tiến trình và phản hồi rõ ràng.

### Icons

- Dùng icon đẹp và nhất quán.
- Không dùng emoji thay thế icon chính trong UI nghiêm túc.
- Có thể dùng icon library như Lucide React hoặc tương đương.
- Icon phải hỗ trợ ý nghĩa hành động:
  - search
  - volume/audio
  - bookmark/save
  - streak/fire
  - stats/chart
  - review/check/wrong
  - notification
  - user/profile
- Icon size, stroke width và màu phải đồng bộ.

### Gen Z style, but usable

- Giao diện có thể trẻ trung, có điểm nhấn, có motion, nhưng không được rối.
- Không dùng quá nhiều gradient, neon, blur hoặc animation cùng lúc.
- Không làm chữ khó đọc.
- Không hy sinh usability để lấy hiệu ứng.
- Các action chính phải luôn dễ thấy:
  - Search
  - Save vocabulary
  - Start review
  - Submit answer
  - Play audio
  - Next question

### Component behavior

Mỗi component phải có đủ trạng thái:

- default
- hover
- focus
- active
- disabled
- loading
- error nếu phù hợp

Các page gọi API phải có:

- loading state đẹp, không chỉ text "Loading..."
- empty state có icon/message/action
- error state có message rõ và retry button nếu hợp lý
- success state rõ ràng

### Layout

- Mobile-first hoặc responsive tốt.
- Không được vỡ layout trên màn hình nhỏ.
- Search/autocomplete phải dễ dùng trên mobile.
- Review session phải tập trung, ít nhiễu.
- Word detail page phải chia section rõ:
  - header word
  - pronunciation
  - definitions/senses
  - examples
  - idioms
  - save/review action

### What to avoid

Không tạo UI kiểu quá generic như:

- card trắng cơ bản không style
- button xanh mặc định
- form khô cứng
- spacing chật
- không có hover/focus state
- icon không đồng bộ
- dashboard layout nhàm chán
- animation ngẫu nhiên không có mục đích
- quá nhiều màu làm mất tập trung

### Implementation expectation

Khi tạo component/page, hãy chủ động làm UI đẹp hơn mức cơ bản.  
Nếu dùng Tailwind CSS, hãy tạo className có design rõ ràng, có spacing, radius, shadow, transition, hover/focus state.  
Nếu dùng animation library như Framer Motion, chỉ dùng cho các interaction có giá trị như dropdown, page transition, card reveal, answer feedback.

Mục tiêu cuối cùng:  
Ứng dụng phải tạo cảm giác “muốn dùng để học mỗi ngày”, không giống một CRUD/admin page thông thường.