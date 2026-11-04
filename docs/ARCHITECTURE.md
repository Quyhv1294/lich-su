# Kiến trúc bản demo

## Tổng quan

```
Trình duyệt (React)  ──/api──▶  Express
  ChatWindow                      ├─ routes/chat      ─▶ guardrail.checkInput
  StoryPlayer                     │                     ─▶ retrieval.retrieve (kho tri thức 1 nhân vật)
  useSpeech (TTS/STT trình duyệt) │                     ─▶ llm.generateChat ─┬─ mock (offline)
                                  │                                          └─ gemini (REST)
                                  │                     ─▶ guardrail.checkOutput
                                  ├─ routes/story     (bản kể soạn sẵn)
                                  ├─ routes/characters
                                  └─ routes/feedback  (log ẩn danh)
```

## Luồng một lượt hỏi đáp (UC-10)

1. Client gửi `POST /api/chat { characterId, message, history }`.
2. `checkInput`: rỗng, quá 300 ký tự, prompt injection, nội dung không phù hợp, câu hỏi hiện đại (BR-02); che SĐT và email.
   Nếu vi phạm, trả lời theo vai bằng `safeReply`, **không gọi AI**.
3. `retrieve`: chấm điểm từ khoá trên FAQ, sự kiện và hồ sơ của **đúng nhân vật đó**, lấy tối đa 4 đoạn.
4. `generateChat`: chế độ `mock` chọn câu FAQ phù hợp hoặc từ chối khéo (BR-01); chế độ `gemini` ghép system prompt
   (persona, quy tắc, ngữ cảnh) rồi gọi API, lỗi hoặc quá 20 giây thì rơi về `mock`.
5. `checkOutput`: bỏ markdown, cắt tối đa 900 ký tự, gắn cờ nếu có từ nhạy cảm.
6. Trả `{ reply, followUps, sources, mode, flagged }`; log ẩn danh (không IP, không nội dung câu hỏi).

## Quyết định thiết kế

- **Lớp trừu tượng nhà cung cấp (AI-10):** chỉ `services/llm.js` biết về Gemini. Đổi sang OpenAI hay Claude chỉ sửa một file.
- **Persona qua prompt + RAG, không fine-tune (AI-01/02):** sửa nội dung bằng cách sửa JSON, không cần huấn luyện lại.
- **Mock mặc định:** demo chạy được ở mọi nơi, kết quả ổn định, không rủi ro nội dung ngoài kiểm soát.
- **Khoá API chỉ ở server**, giới hạn tần suất theo IP, body tối đa 20 KB.
- **Dữ liệu nhân vật là JSON tĩnh:** đủ cho demo; Phase P1 chuyển sang CSDL kèm quy trình thẩm định (UC-30..34).

## Lộ trình nâng cấp lên bản sản xuất

| Thành phần | Demo | Sản xuất |
|---|---|---|
| Truy xuất | Từ khoá | Embedding + kho vector (pgvector) |
| Giọng đọc | `speechSynthesis` của trình duyệt | Google Cloud TTS, âm thanh tạo sẵn và cache |
| Lưu trữ | JSON + log | PostgreSQL, hàng chờ kiểm duyệt |
| Xác thực | Không | Đăng nhập học sinh/giáo viên, phân quyền |
| Guardrail | Luật từ khoá | Từ khoá + bộ phân loại + kiểm tra đầu ra bằng mô hình |
| Ảnh | SVG minh hoạ tạm | Ảnh AI đã duyệt, lưu CDN |
