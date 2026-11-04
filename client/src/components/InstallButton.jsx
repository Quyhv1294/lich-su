import { useEffect, useState } from 'react';

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Nút "Cài ứng dụng": Android/Chrome cài trực tiếp; iPhone chỉ có thể thêm thủ công nên hiện hướng dẫn. */
export default function InstallButton() {
  const [prompt, setPrompt] = useState(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!prompt && !isIos())) return null;

  async function install() {
    if (prompt) {
      prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } else {
      setHelp((h) => !h);
    }
  }

  return (
    <div className="install">
      <button type="button" className="install__btn" onClick={install}>Cài ứng dụng</button>
      {help && (
        <p className="install__help" role="status">
          Trên iPhone: mở bằng Safari, bấm nút Chia sẻ (hình ô vuông có mũi tên lên), chọn “Thêm vào MH chính”.
        </p>
      )}
    </div>
  );
}
