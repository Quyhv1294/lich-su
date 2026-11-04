// Một phần tử <audio> dùng chung. iPhone/Safari chỉ cho phát tiếng khi phần tử đã được "mở khoá"
// bằng một lần bấm của người dùng; nếu mỗi câu trả lời tạo <audio> mới (sau khi chờ server) thì bị chặn
// và app rơi về giọng máy. Mở khoá một lần lúc bấm nút rồi dùng lại phần tử này cho mọi câu.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
let el = null;

export const sharedAudio = () => (el ??= new Audio());

/** Gọi đồng bộ trong hàm xử lý bấm nút (trước mọi await). */
export function unlockAudio() {
  const a = sharedAudio();
  if (a.dataset.unlocked) return;
  a.src = SILENT;
  a.play().then(() => { a.dataset.unlocked = '1'; }).catch(() => {});
}
