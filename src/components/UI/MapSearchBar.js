import { useEffect, useRef, useState, useCallback } from 'react';
import MapSearchBarIcon from '../../assets/images/sidebarIcons/map-search-bar-icon.svg'; // ваш путь к иконке
import { http } from '../../api/http'; // скорректируйте путь, если файл лежит иначе

const DEBOUNCE_MS = 1000;
const MIN_LEN = 2;

function MapSearchBar(props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const barRef = useRef(null);

  const search = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_LEN) {
      setResults([]);
      setOpen(false);
      setError(null);
      return;
    }
    // отменяем прошлый запрос
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const { data } = await http.get('/search', {
        params: { query: trimmed },
        signal: controller.signal,
      });
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch (e) {
      if (e.name !== 'CanceledError' && e.name !== 'AbortError') {
        setError('Ошибка загрузки');
        setResults([]);
        setOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // дебаунс при вводе
  useEffect(() => {
    const t = setTimeout(() => search(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, search]);

  // клик вне — закрыть подсказки
  useEffect(() => {
    const onDocClick = (e) => {
      if (!barRef.current) return;
      if (!barRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    search(query); // мгновенный поиск по кнопке/Enter
  };

  const handleSelect = (item) => {
    console.log('Выбрано (в комп. строки):', item); // требование шага 1
    setOpen(false);
    // опционально отдать наверх (для зума карты/запросов)
    if (props.onSelect) props.onSelect(item);
  };

  return (
    <div className="map-search" ref={barRef}>
      <form className="map-search-bar" onSubmit={onSubmit}>
        <input
          className="map-search-bar__input"
          type="text"
          placeholder="Поиск"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
        />
        <button className="map-search-bar__button" type="submit" aria-label="Найти">
          <img src={MapSearchBarIcon} alt="Поиск" />
        </button>
      </form>

      {open && (
        <div className="map-search-suggest">
          {loading && <div className="map-search-suggest__row">Загрузка…</div>}
          {!loading && error && <div className="map-search-suggest__row">{error}</div>}
          {!loading && !error && results.length === 0 && (
            <div className="map-search-suggest__row">Ничего не найдено</div>
          )}
          {!loading &&
            !error &&
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="map-search-suggest__row map-search-suggest__row--btn"
                onClick={() => handleSelect(item)}
                title={`${item.name} (${item.type})`}
              >
                <span className="map-search-suggest__name">{item.name}</span>
                <span className="map-search-suggest__meta">
                  {item.type === 'city' ? 'Город' : 'Регион'} · {item.lat.toFixed(3)},{' '}
                  {item.lon.toFixed(3)}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default MapSearchBar;
