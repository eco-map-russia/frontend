import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFavoriteRegions,
  selectFavorites,
  setPage,
  setSize,
} from '../../store/favorites-slice';

export default function FavoritesModal({ open, onClose, onSelect }) {
  const dispatch = useDispatch();
  const { items, page, size, totalPages, status, error, first, last } =
    useSelector(selectFavorites);

  // Загружаем список при открытии окна и при смене page/size
  useEffect(() => {
    if (open) {
      dispatch(fetchFavoriteRegions({ page, size }));
    }
  }, [open, page, size, dispatch]);

  if (!open) return null;

  const handleBackdropClick = () => onClose?.();
  const stop = (e) => e.stopPropagation();

  const handlePrev = () => {
    if (!first) dispatch(setPage(page - 1));
  };
  const handleNext = () => {
    if (!last) dispatch(setPage(page + 1));
  };

  return (
    <div className="fav-modal__backdrop" onClick={handleBackdropClick}>
      <div
        className="fav-modal"
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="favModalTitle"
      >
        <div className="fav-modal__header">
          <h3 id="favModalTitle">Избранные регионы</h3>
          <button className="fav-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="fav-modal__body">
          {status === 'loading' && <div className="fav-modal__state">Загрузка…</div>}
          {status === 'failed' && (
            <div className="fav-modal__error">
              Ошибка: {String(error || 'не удалось загрузить')}
            </div>
          )}
          {status === 'succeeded' && items.length === 0 && (
            <div className="fav-modal__state">Список пуст</div>
          )}
          {status === 'succeeded' && items.length > 0 && (
            <ul className="fav-modal__list">
              {items.map((r) => (
                <li key={r.id}>
                  <button
                    className="fav-modal__item"
                    onClick={() => {
                      // не обязательно сейчас, но пригодится:
                      // можно прокинуть onSelect, чтобы перемещаться к региону на карте
                      onSelect?.(r);
                      onClose?.();
                    }}
                  >
                    {r.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="fav-modal__footer">
          <div className="fav-modal__pager">
            <button onClick={handlePrev} disabled={first || status === 'loading'}>
              Назад
            </button>
            <span className="fav-modal__page">
              {page + 1} / {Math.max(totalPages, 1)}
            </span>
            <button onClick={handleNext} disabled={last || status === 'loading'}>
              Далее
            </button>
          </div>

          <label className="fav-modal__size">
            На странице:
            <select
              value={size}
              onChange={(e) => dispatch(setSize(Number(e.target.value)))}
              disabled={status === 'loading'}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
