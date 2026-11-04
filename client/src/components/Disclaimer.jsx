/** Luôn hiển thị: nhân vật do AI mô phỏng (BR-09). */
export default function Disclaimer({ compact = false }) {
  return (
    <p className={`disclaimer ${compact ? 'disclaimer--compact' : ''}`} role="note">
      <span aria-hidden="true">ⓘ</span>
      <span>
        Nhân vật do <strong>AI mô phỏng</strong>, nội dung dùng để học tập.
        {!compact && ' Em hãy đối chiếu với sách giáo khoa và hỏi thầy cô khi cần.'}
      </span>
    </p>
  );
}
