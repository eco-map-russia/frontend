// components/UI/modals/RegionInfoModal.jsx
import { useEffect, useRef, useState } from 'react';
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
  const [air, setAir] = useState({ aqi: null, loading: false, error: null });
  const airAbortRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        params: { lat: region.center.lat, lon: region.center.lon },
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
              <b>Координаты центра:</b> {region?.center?.lat}, {region?.center?.lon}
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
          </div>
        )}
      </div>
    </div>
  );
}
