import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import Home from './pages/Home.jsx';
import CharacterPage from './pages/CharacterPage.jsx';
import InstallButton from './components/InstallButton.jsx';

function ModeBadge({ mode }) {
  if (!mode) return null;
  const online = mode === 'gemini';
  return (
    <span className={`mode ${online ? 'mode--on' : ''}`} title={online ? 'Đang dùng mô hình AI trực tuyến' : 'Trả lời từ kho tri thức soạn sẵn, không cần mạng hay khoá API'}>
      {online ? 'AI trực tuyến' : 'Demo offline'}
    </span>
  );
}

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [mode, setMode] = useState(null);

  useEffect(() => {
    api.characters().then(setCharacters).catch(() => {});
    api.health().then((h) => setMode(h.mode)).catch(() => {});
  }, []);

  return (
    <>
      <header className="topbar">
        <div className="wrap topbar__inner">
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width="28" height="28" />
            <span>Thần Tướng Kể Chuyện</span>
          </Link>
          <ModeBadge mode={mode} />
          <InstallButton />
          <nav className="tabs" aria-label="Điều hướng chính">
            <NavLink to="/" end className={({ isActive }) => `tab ${isActive ? 'tab--on' : ''}`}>Trang Chủ</NavLink>
            <NavLink
              to={`/nhan-vat/${characters.find((c) => c.slug === 'quang-trung')?.slug ?? characters[0]?.slug ?? ''}`}
              className={({ isActive }) => `tab ${isActive ? 'tab--on' : ''}`}
            >
              Trò Chuyện
            </NavLink>
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nhan-vat/:slug" element={<CharacterPage />} />
        <Route path="*" element={<main className="wrap"><p>Không tìm thấy trang. <Link to="/">Về trang chủ</Link></p></main>} />
      </Routes>

    </>
  );
}
