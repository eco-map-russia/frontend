import { useEffect, useRef, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { http } from '../../api/http';

export default function RegionInfoModal({
  open,
  onClose,
  region,
  loading,
  error,
  onAddFavorite,
  addInProgress = false,
}) {
  console.log('RegionInfoModal from /UI/modals mounted');
  // текущий пользователь (для отображения своего коммента сразу после POST — на бэке тоже вернётся)
  const currentUser = useSelector((s) => s.profile?.user);
  const regionId = region?.id ?? region?.regionId ?? region?.code ?? null; // нормализуем идентификатор региона

  const [air, setAir] = useState({ aqi: null, loading: false, error: null });
  const airAbortRef = useRef(null);

  // комментарии
  const [comments, setComments] = useState([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsSize] = useState(10);
  const [commentsHasMore, setCommentsHasMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const commentsAbortRef = useRef(null);

  // форма отправки
  const [newComment, setNewComment] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // утилита форматирования даты
  const fmt = (iso) => {
    try {
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return iso ?? '';
    }
  };

  // грузим качество воздуха, когда модалка открылась и известны координаты
  useEffect(() => {
    if (!open || !region?.center?.lat || !region?.center?.lon) return;

    // отменяем предыдущий запрос
    if (airAbortRef.current) airAbortRef.current.abort();
    const controller = new AbortController();
    airAbortRef.current = controller;

    setAir({ aqi: null, loading: true, error: null });
    http
      .get('/air-quality/current', {
        params: { lat: region.center.lon, lon: region.center.lat },
        signal: controller.signal,
      })
      .then(({ data }) => {
        const aqi = data?.airQualityData?.europeanAqi ?? null;
        setAir({ aqi, loading: false, error: null });
      })
      .catch((e) => {
        // игнорируем отменённые запросы
        if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError')
          return;
        setAir({ aqi: null, loading: false, error: 'Не удалось загрузить данные о воздухе' });
      });

    return () => controller.abort();
  }, [open, region?.center?.lat, region?.center?.lon]);

  // загрузка комментариев (первая страница при открытии/смене региона)
  const fetchComments = useCallback(
    (page = 0, append = false) => {
      if (!open || !regionId) return;
      if (commentsAbortRef.current) commentsAbortRef.current.abort();
      const controller = new AbortController();
      commentsAbortRef.current = controller;
      setCommentsLoading(true);
      setCommentsError(null);
      return http
        .get(`/regions/${regionId}/comments`, {
          params: { page, size: commentsSize, direction: 'desc' },
          signal: controller.signal,
        })
        .then(({ data }) => {
          const list = Array.isArray(data?.content) ? data.content : [];
          setComments((prev) => (append ? [...prev, ...list] : list));
          setCommentsPage(data?.number ?? page);
          setCommentsHasMore(!(data?.last ?? true));
        })
        .catch((e) => {
          if (e?.code === 'ERR_CANCELED' || e?.name === 'CanceledError' || e?.name === 'AbortError')
            return;
          setCommentsError('Не удалось загрузить комментарии');
        })
        .finally(() => setCommentsLoading(false));
    },
    [open, regionId, commentsSize],
  );

  useEffect(() => {
    if (!open || !regionId) return;
    // сбрасываем состояние и грузим первые комментарии
    setComments([]);
    setCommentsPage(0);
    setCommentsHasMore(false);
    setNewComment('');
    fetchComments(0, false);
    return () => commentsAbortRef.current?.abort();
  }, [open, regionId, fetchComments]);

  // отправка комментария
  const submitComment = async () => {
    if (!newComment.trim() || !regionId) return;
    try {
      setSendLoading(true);
      await http.post(`/regions/${regionId}/comments`, { text: newComment.trim() });
      setNewComment('');
      // перезагружаем первую страницу, чтобы увидеть свой комментарий сверху
      await fetchComments(0, false); // чтобы сразу увидеть свой коммент сверху
    } catch (e) {
      alert('Не удалось отправить комментарий. Попробуйте ещё раз.');
    } finally {
      setSendLoading(false);
    }
    console.log('Submit comment:', newComment);
  };

  if (!open) return null;

  return (
    <div className="rim-backdrop" onClick={onClose}>
      <div className="rim-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rim-header">
          <h3>{region?.name ?? 'Регион'}</h3>
          <button className="rim-close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {loading ? (
          <div className="rim-body">Загрузка…</div>
        ) : error ? (
          <div className="rim-body rim-error">{error}</div>
        ) : (
          <div className="rim-body">
            <button
              onClick={() => onAddFavorite?.()}
              disabled={addInProgress}
              title="Добавить регион в избранное"
            >
              {addInProgress ? 'Добавляю…' : 'Добавить регион в избранное'}
            </button>
            <div className="rim-section">
              <b>Координаты центра:</b> {region?.center?.lon}, {region?.center?.lat}
            </div>

            <div className="rim-section">
              <h4>Почва</h4>
              <div>Хрон. загрязнение: {region?.soilData?.chronicSoilPollutionPercent ?? '—'}</div>
              <div>Индекс LDN: {region?.soilData?.landDegradationNeutralityIndex ?? '—'}</div>
            </div>

            <div className="rim-section">
              <h4>Вода</h4>
              <div>
                Грязные поверхностные воды: {region?.waterData?.dirtySurfaceWaterPercent ?? '—'}
              </div>
            </div>

            <div className="rim-section">
              <h4>Воздух</h4>
              {air.loading ? (
                <div>Загрузка…</div>
              ) : air.error ? (
                <div className="rim-error">{air.error}</div>
              ) : (
                <div>Европейский AQI: {air.aqi ?? '—'}</div>
              )}
            </div>

            <div className="rim-section">
              <h4>Заповедники</h4>
              {!(region?.natureReserves?.natureReserveDetailsDtos || []).length ? (
                <div>Нет данных</div>
              ) : (
                <ul className="rim-list">
                  {region.natureReserves.natureReserveDetailsDtos.map((r, i) => (
                    <li key={i}>
                      <div>
                        <b>{r.name}</b> — {r.area} км², основан {r.yearFounded}
                      </div>
                      {r.description ? <div className="rim-muted">{r.description}</div> : null}
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noreferrer">
                          Сайт
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* КОММЕНТАРИИ */}
            <div className="rim-section rim-comments">
              <h4>Комментарии</h4>
              {commentsLoading && !comments.length ? <div>Загрузка…</div> : null}
              {commentsError ? <div className="rim-error">{commentsError}</div> : null}
              {!commentsLoading && !commentsError && !comments.length ? (
                <div className="rim-muted">Пока нет комментариев. Будьте первым!</div>
              ) : null}

              <ul className="rim-comments-list">
                {comments.map((c) => (
                  <li key={c.id} className="rim-comment">
                    <div className="rim-comment-header">
                      <b className="rim-comment-author">
                        {c.username ||
                          `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim() ||
                          'Пользователь'}
                      </b>
                      <span className="rim-comment-date">{fmt(c.createdAt)}</span>
                    </div>
                    <div className="rim-comment-text">{c.text}</div>
                  </li>
                ))}
              </ul>

              {commentsHasMore ? (
                <button
                  className="rim-btn-more"
                  disabled={commentsLoading}
                  onClick={() => fetchComments(commentsPage + 1, true)}
                >
                  {commentsLoading ? 'Загрузка…' : 'Показать ещё'}
                </button>
              ) : null}

              {/* форма отправки */}
              <div className="rim-comment-form">
                <textarea
                  rows={3}
                  placeholder="Ваш комментарий..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={sendLoading || !newComment.trim()}
                >
                  {sendLoading ? 'Отправка…' : 'Оставить комментарий'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
