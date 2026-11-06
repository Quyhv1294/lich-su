import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import CharacterCard, { shortName } from '../components/CharacterCard.jsx';

const ORDER = ['tran-hung-dao', 'le-loi', 'quang-trung', 'ngo-quyen', 'ly-thuong-kiet', 'tran-quoc-toan'];
const rank = (c) => {
  const i = ORDER.indexOf(c.slug);
  return i === -1 ? ORDER.length : i;
};

export default function Home() {
  const [characters, setCharacters] = useState(null);
  const [selected, setSelected] = useState('quang-trung');
  const [error, setError] = useState('');

  useEffect(() => {
    api.characters()
      .then((list) => setCharacters([...list].sort((a, b) => rank(a) - rank(b))))
      .catch((e) => setError(e.message));
  }, []);

  const current = characters?.find((c) => c.slug === selected) ?? characters?.[0];

  return (
    <main className="wrap home">
      <h1 className="home__title">Lịch Sử Việt Nam</h1>
      <p className="home__lead">
        Chọn một vị tướng huyền thoại để nghe họ kể chuyện hoặc trò chuyện trực tiếp.
        Công nghệ AI tái hiện hình ảnh và giọng nói chân thực.
      </p>

      {error && <p className="msg--error">{error}</p>}
      {!characters && !error && <p className="muted home__status">Đang tải danh sách…</p>}

      <div className="grid">
        {characters?.map((c) => (
          <CharacterCard key={c.id} c={c} selected={c.slug === current?.slug} onSelect={setSelected} />
        ))}
      </div>

      {current && (
        <div className="home__cta">
          <Link to={`/nhan-vat/${current.slug}`} className="cta">
            Bắt đầu trò chuyện với {shortName(current)}
          </Link>
        </div>
      )}
    </main>
  );
}
