import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { shortName } from '../components/CharacterCard.jsx';

// Các vị tướng xếp theo thời gian; năm và trận đánh là mốc tiêu biểu nhất của từng người.
const TIMELINE = [
  { slug: 'ngo-quyen', year: 938, mark: 'Trận Bạch Đằng' },
  { slug: 'ly-thuong-kiet', year: 1077, mark: 'Phòng tuyến sông Như Nguyệt' },
  { slug: 'tran-quoc-toan', year: 1285, mark: 'Trận Hàm Tử' },
  { slug: 'tran-hung-dao', year: 1288, mark: 'Trận Bạch Đằng' },
  { slug: 'le-loi', year: 1428, mark: 'Khởi nghĩa Lam Sơn thắng lợi' },
  { slug: 'quang-trung', year: 1789, mark: 'Trận Ngọc Hồi – Đống Đa' },
];
const meta = (slug) => TIMELINE.find((t) => t.slug === slug);

export default function Home() {
  const [characters, setCharacters] = useState(null);
  const [selected, setSelected] = useState('tran-hung-dao');
  const [error, setError] = useState('');

  useEffect(() => {
    api.characters()
      .then((list) => {
        const bySlug = Object.fromEntries(list.map((c) => [c.slug, c]));
        setCharacters(TIMELINE.map((t) => bySlug[t.slug]).filter(Boolean));
      })
      .catch((e) => setError(e.message));
  }, []);

  const current = characters?.find((c) => c.slug === selected) ?? characters?.[0];
  const m = current && meta(current.slug);

  return (
    <main className="home">
      <div className="wrap">
        <h1 className="home__title">Lịch Sử Việt Nam</h1>
        <p className="home__lead">
          Sáu vị tướng giữ nước, từ năm 938 đến năm 1789. Chọn một người để nghe kể chuyện hoặc hỏi thẳng.
        </p>

        {error && <p className="msg--error">{error}</p>}
        {!characters && !error && <p className="muted">Đang tải danh sách…</p>}

        {current && (
          <section className="stage" aria-live="polite">
            <figure className="stage__frame" key={current.slug}>
              <img src={current.avatar} alt={`Ảnh minh hoạ ${current.name}`} />
            </figure>
            <div className="stage__text">
              <p className="stage__mark">{m?.mark}, năm {m?.year}</p>
              <h2 className="stage__name">{shortName(current)}</h2>
              <p className="stage__title">{current.title.split(' – ')[0]}</p>
              <p className="stage__tagline">{current.tagline}</p>
              <Link to={`/nhan-vat/${current.slug}`} className="cta">
                Trò chuyện với {shortName(current)}
              </Link>
            </div>
          </section>
        )}

        {characters && (
          <ol className="line" aria-label="Các vị tướng theo thời gian">
            {characters.map((c) => {
              const on = c.slug === current?.slug;
              return (
                <li key={c.slug} className={`line__item ${on ? 'line__item--on' : ''}`}>
                  <button type="button" onClick={() => setSelected(c.slug)} aria-pressed={on}>
                    <span className="line__year">{meta(c.slug)?.year}</span>
                    <img src={c.avatar} alt="" loading="lazy" />
                    <span className="line__name">{shortName(c)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
