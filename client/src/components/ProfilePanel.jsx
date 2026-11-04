const SECTIONS = [
  ['biography', 'Tiểu sử'],
  ['career', 'Sự nghiệp'],
  ['thought', 'Tư tưởng và chiến lược'],
  ['works', 'Tác phẩm / dấu ấn'],
  ['personality', 'Tính cách'],
  ['style', 'Phong cách'],
];

export default function ProfilePanel({ character }) {
  const p = character.profile || {};
  return (
    <div className="profile">
      {SECTIONS.filter(([k]) => p[k]).map(([k, label]) => (
        <section key={k}>
          <h4>{label}</h4>
          <p>{p[k]}</p>
        </section>
      ))}
      {p.quotes?.length > 0 && (
        <section>
          <h4>Lời được ghi lại</h4>
          <ul className="quotes">
            {p.quotes.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </section>
      )}
      <p className="note">Hồ sơ demo, cần chuyên gia đối chiếu sử liệu trước khi dùng chính thức.</p>
    </div>
  );
}
