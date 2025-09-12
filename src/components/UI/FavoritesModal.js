// src/components/UI/FavoritesModal.jsx
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFavoriteRegions,
  selectFavorites,
  setPage,
  setSize,
  deleteFavoriteRegion, // ⬅️ НОВОЕ
} from '../../store/favorites-slice';

export default function FavoritesModal({ open, onClose, onSelect }) {
  const dispatch = useDispatch();
  const {
    items = [],
    page = 0,
    size = 10,
    totalPages = 0,
    status = 'idle',
    error = null,
    first = true,
    last = true,
    deletingIds = {}, // ⬅️ НОВОЕ
  } = useSelector(selectFavorites);

  useEffect(() => {
    if (open) dispatch(fetchFavoriteRegions({ page, size }));
  }, [open, page, size, dispatch]);

  if (!open) return null;

  const handleDelete = (e, id) => {
    e.stopPropagation(); // чтобы не срабатывал onSelect по всей строке
    dispatch(deleteFavoriteRegion({ id }));
  };

  return (
    <div className="fav-modal__backdrop" onClick={onClose}>
      <div
        className="fav-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="fav-modal__header">
          <h3>Избранные регионы</h3>
          <button className="fav-modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="fav-modal__body">
          {status === 'loading' && <div className="fav-modal__state">Загрузка…</div>}
          {error && <div className="fav-modal__error">Ошибка: {String(error)}</div>}
          {status === 'succeeded' && items.length === 0 && (
            <div className="fav-modal__state">Список пуст</div>
          )}

          {items.length > 0 && (
            <ul className="fav-modal__list">
              {items.map((r) => {
                const deleting = !!deletingIds[r.id];
                return (
                  <li className="fav-modal__row" key={r.id}>
                    <button
                      className="fav-modal__item"
                      onClick={() => {
                        onSelect?.(r);
                        onClose?.();
                      }}
                      disabled={deleting}
                      title={r.name}
                    >
                      {r.name}
                    </button>
                    <button
                      className="fav-modal__delete"
                      onClick={(e) => handleDelete(e, r.id)}
                      disabled={deleting}
                      aria-label={`Удалить ${r.name} из избранного`}
                      title="Удалить"
                    >
                      {/* простая иконка корзины svg */}
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v7h-2v-7zm4 0h2v7h-2v-7z"
                          fill="currentColor"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="fav-modal__footer">
          <div className="fav-modal__pager">
            <button
              onClick={() => !first && dispatch(setPage(page - 1))}
              disabled={first || status === 'loading'}
            >
              Назад
            </button>
            <span className="fav-modal__page">
              {page + 1} / {Math.max(totalPages, 1)}
            </span>
            <button
              onClick={() => !last && dispatch(setPage(page + 1))}
              disabled={last || status === 'loading'}
            >
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
