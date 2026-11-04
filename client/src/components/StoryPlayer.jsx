import { useEffect, useState } from 'react';
import { api } from '../api.js';

/** Chọn sự kiện, đọc bản kể và tô sáng từng câu khi nghe (UC-11, UC-12, FR-VOI-03). */
export default function StoryPlayer({ character, speech }) {
  const [eventId, setEventId] = useState(character.events[0]?.id);
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    setLoading(true);
    setError('');
    speech.stop();
    api.story(character.id, eventId)
      .then((s) => alive && setStory(s))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id, eventId]);

  const playing = story && speech.speakingId === `story:${story.eventId}`;

  return (
    <div className="story">
      <div className="story__events" role="tablist" aria-label="Chọn sự kiện">
        {character.events.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === eventId}
            className={`event ${e.id === eventId ? 'event--on' : ''}`}
            onClick={() => setEventId(e.id)}
          >
            <span className="event__year">{e.year}</span>
            <span className="event__title">{e.title}</span>
          </button>
        ))}
      </div>

      {loading && <p className="muted">Đang chuẩn bị câu chuyện…</p>}
      {error && <p className="msg--error">{error}</p>}

      {story && !loading && (
        <article className="story__body">
          <h4>{story.title}</h4>
          <p className="story__text">
            {story.sentences.map((s, i) => (
              <span key={i} className={playing && speech.index === i ? 'hl' : ''}>{s} </span>
            ))}
          </p>
          <div className="story__actions">
            {speech.supported ? (
              <button
                className="btn btn--primary"
                onClick={() => (playing ? speech.stop() : speech.speak(`story:${story.eventId}`, story.sentences, story.voice))}
              >
                {playing ? '⏹ Dừng' : '🔊 Nghe kể chuyện'}
              </button>
            ) : (
              <span className="muted">Trình duyệt này chưa hỗ trợ đọc thành tiếng.</span>
            )}
          </div>
          {!story.reviewed && (
            <p className="note">Bản kể demo, chưa qua thẩm định của chuyên gia lịch sử.</p>
          )}
        </article>
      )}
    </div>
  );
}
