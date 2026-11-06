export function shortName(c) {
  return c.name.split(' – ').pop();
}

// "Thế kỷ XIII – Nhà Trần" -> "Nhà Trần (Thế kỷ XIII)"
function eraBadge(era) {
  const [century, label] = era.split(' – ');
  return label ? `${label} (${century})` : century;
}

export default function CharacterCard({ c, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`card ${selected ? 'card--on' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(c.slug)}
    >
      <img className="card__img" src={c.avatar} alt={`Ảnh minh hoạ ${c.name}`} loading="lazy" />
      <span className="card__shade" aria-hidden="true" />
      <span className="card__body">
        <span className="card__era">{eraBadge(c.era)}</span>
        <span className="card__name">{shortName(c)}</span>
        <span className="card__title">{c.title.split(' – ')[0]}</span>
      </span>
    </button>
  );
}
