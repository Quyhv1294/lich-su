import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useSpeech } from '../hooks/useSpeech.js';
import ChatWindow from '../components/ChatWindow.jsx';
import StoryPlayer from '../components/StoryPlayer.jsx';
import ProfilePanel from '../components/ProfilePanel.jsx';
import Disclaimer from '../components/Disclaimer.jsx';
import CallScreen from '../components/CallScreen.jsx';
import { shortName } from '../components/CharacterCard.jsx';

export default function CharacterPage() {
  const { slug } = useParams();
  const [character, setCharacter] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState(null); // null | 'story' | 'profile'
  const [chatKey, setChatKey] = useState(0);
  const [calling, setCalling] = useState(false);
  const speech = useSpeech();

  useEffect(() => {
    setCharacter(null);
    setError('');
    setView(null);
    setChatKey(0);
    setCalling(false);
    api.character(slug).then(setCharacter).catch((e) => setError(e.message));
  }, [slug]);

  if (error) {
    return (
      <main className="wrap">
        <p className="msg--error">{error}</p>
        <Link to="/" className="btn">← Về trang chủ</Link>
      </main>
    );
  }
  if (!character) return <main className="wrap"><p className="muted">Đang tải…</p></main>;

  const toggle = (v) => setView((cur) => (cur === v ? null : v));

  return (
    <main className="wrap character" style={{ '--accent': character.accent }}>
      <div className="character__chat">
        <header className="character__head">
          <Link to="/" className="back">← Tất cả nhân vật</Link>
          <h1>{character.name} <small>{character.title}</small></h1>
          <button className="btn btn--primary call-open" onClick={() => { speech.stop(); setCalling(true); }}>📞 Gọi {shortName(character)}</button>
        </header>
        <ChatWindow key={`${character.id}-${chatKey}`} character={character} speech={speech} />
        <Disclaimer compact />
      </div>

      <aside className="panel" aria-label={`Về ${character.name}`}>
        <div className="panel__portrait">
          <img src={character.avatar} alt={`Ảnh minh hoạ ${character.name}`} />
          <span className="badge-ai">Ảnh minh hoạ do AI mô phỏng</span>
        </div>
        <p className="panel__era">{character.era}</p>
        <p className="panel__tagline">{character.tagline}</p>
        <div className="chips">
          {character.grades.map((g) => <span key={g} className="chip chip--grade">Lớp {g}</span>)}
        </div>

        <div className="panel__actions">
          <button className="btn btn--primary" onClick={() => { speech.stop(); setCalling(true); }}>📞 Gọi {shortName(character)}</button>
          <button className={`btn ${view === 'story' ? 'btn--on' : ''}`} onClick={() => toggle('story')}>🎧 Nghe kể chuyện</button>
          <button className={`btn ${view === 'profile' ? 'btn--on' : ''}`} onClick={() => toggle('profile')}>📜 Hồ sơ nhân vật</button>
          <button
            className="btn btn--ghost"
            onClick={() => { speech.stop(); setChatKey((k) => k + 1); }}
          >↺ Cuộc trò chuyện mới</button>
        </div>

        {view === 'story' && <StoryPlayer character={character} speech={speech} />}
        {view === 'profile' && <ProfilePanel character={character} />}
      </aside>
      {calling && <CallScreen character={character} onClose={() => setCalling(false)} />}
    </main>
  );
}
