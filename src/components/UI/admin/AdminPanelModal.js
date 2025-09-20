// src/components/admin/AdminPanelModal.js
import { useEffect, useMemo, useState } from 'react';
import RESOURCES from './ResourcesConfig';
import { callAdminApi, hasMethod, buildBodyFromFields } from './AdminApi';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function AdminPanelModal({ open, onClose }) {
  const [resourceKey, setResourceKey] = useState('nature-reserve');

  // пагинация и данные
  const [page, setPage] = useState(0); // 0-based
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  const [list, setList] = useState([]); // контент текущей страницы
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // модалка формы (создание/редактирование)
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' | 'edit'
  const [formValues, setFormValues] = useState(null); // исходные значения (для edit)

  const resourceCfg = RESOURCES[resourceKey];
  const canCreate = hasMethod(resourceCfg, 'POST');
  const canUpdate = hasMethod(resourceCfg, 'PUT');
  const canDelete = hasMethod(resourceCfg, 'DELETE');

  const resourceOptions = useMemo(
    () => Object.entries(RESOURCES).map(([key, v]) => ({ value: key, label: v.label })),
    [],
  );

  const columns = useMemo(() => {
    // если в конфиге есть явные колонки — используем их
    if (resourceCfg.columns?.length) return resourceCfg.columns;

    // запасной вариант: взять видимые поля из POST/PUT
    const fields =
      resourceCfg.methods?.POST?.bodyFields ?? resourceCfg.methods?.PUT?.bodyFields ?? [];
    const pick = [
      'name',
      'location',
      'regionName',
      'cityName',
      'betaFallout',
      'dirtySurfaceWaterPercent',
      'latitude',
      'longitude',
      'yearFounded',
    ];
    const fieldKeys = fields.map((f) => f.name).filter((n) => n !== 'id');
    const uniq = Array.from(new Set(['id', ...pick, ...fieldKeys]));
    return uniq.slice(0, 6).map((key) => ({ key, label: key }));
  }, [resourceCfg]);

  // список сущностей (GET /?page&size)
  const fetchList = async (_page = page, _size = size) => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const data = await callAdminApi(resourceCfg, 'GET', { page: _page, size: _size });
      // ожидаем Spring Data формат: { content, totalPages, totalElements, number, size }
      const content = data?.content ?? [];
      setList(content);
      setTotalPages(data?.totalPages ?? 1);
      setTotalElements(data?.totalElements ?? content.length);
      setPage(data?.number ?? _page);
      setSize(data?.size ?? _size);
    } catch (e) {
      setError(e?.response?.data || e?.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  // при открытии модалки — подтянуть первую страницу
  useEffect(() => {
    if (open) fetchList(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // смена сущности сбрасывает пагинацию и перезагружает список
  useEffect(() => {
    if (!open) return;
    setPage(0);
    fetchList(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);

  // смена размера страницы
  const onChangeSize = (nextSize) => {
    setSize(nextSize);
    setPage(0);
    fetchList(0, nextSize);
  };

  const nextPage = () => {
    if (page + 1 < totalPages) {
      const p = page + 1;
      setPage(p);
      fetchList(p, size);
    }
  };
  const prevPage = () => {
    if (page > 0) {
      const p = page - 1;
      setPage(p);
      fetchList(p, size);
    }
  };

  const openCreate = () => {
    setFormMode('create');
    setFormValues(null);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setFormMode('edit');
    setFormValues(row);
    setFormOpen(true);
  };

  const onDelete = async (row) => {
    if (!canDelete) return;
    const id = row?.id;
    if (!id) return alert('У записи нет id');
    if (!window.confirm('Удалить запись? Это действие необратимо.')) return;

    setLoading(true);
    setError(null);
    try {
      await callAdminApi(resourceCfg, 'DELETE', { id });
      await fetchList(page, size);
    } catch (e) {
      setError(e?.response?.data || e?.message || 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="admin-modal__backdrop" onClick={onClose}>
      <div className="admin-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3>Админ-панель</h3>
          <button className="admin-btn admin-btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* верхняя панель */}
        <div className="admin-grid">
          <label>
            Категории
            <select value={resourceKey} onChange={(e) => setResourceKey(e.target.value)}>
              {resourceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="admin-toolbar">
            <span className="admin-hint">Всего: {totalElements}</span>
            <label className="admin-size">
              На странице
              <select value={size} onChange={(e) => onChangeSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            {canCreate && (
              <button className="admin-btn" onClick={openCreate}>
                Добавить
              </button>
            )}
          </div>
        </div>

        {/* таблица */}
        <div className="admin-table__wrap">
          {loading && <div className="admin-loader">Загрузка…</div>}
          {error && (
            <pre className="admin-result admin-result--error">{JSON.stringify(error, null, 2)}</pre>
          )}
          {!loading && !error && (
            <Table
              rows={list}
              columns={columns}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={openEdit}
              onDelete={onDelete}
            />
          )}
        </div>

        {/* пагинация */}
        <div className="admin-pagination">
          <button className="admin-btn admin-btn--ghost" disabled={page <= 0} onClick={prevPage}>
            ← Назад
          </button>
          <span>
            Стр. {totalPages ? page + 1 : 1} из {Math.max(totalPages, 1)}
          </span>
          <button
            className="admin-btn admin-btn--ghost"
            disabled={page + 1 >= totalPages}
            onClick={nextPage}
          >
            Вперёд →
          </button>
        </div>

        {/* модалка формы */}
        {formOpen && (
          <CrudFormModal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            mode={formMode}
            resourceCfg={resourceCfg}
            initial={formValues}
            onSaved={async () => {
              setFormOpen(false);
              await fetchList(page, size);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Таблица ---------- */
function Table({ rows, columns, canUpdate, canDelete, onEdit, onDelete }) {
  if (!rows?.length) {
    return <div className="admin-hint">Нет данных.</div>;
  }
  return (
    <table className="admin-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.key}>{c.label}</th>
          ))}
          {(canUpdate || canDelete) && <th className="admin-table__actions">Действия</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id || JSON.stringify(row)}>
            {columns.map((c) => (
              <td key={c.key}>{formatCell(row, c.key)}</td>
            ))}
            {(canUpdate || canDelete) && (
              <td className="admin-table__actions">
                {canUpdate && (
                  <button className="admin-btn admin-btn--link" onClick={() => onEdit(row)}>
                    Изменить
                  </button>
                )}
                {canDelete && (
                  <button className="admin-btn admin-btn--danger" onClick={() => onDelete(row)}>
                    Удалить
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
// фикс отображения вложенных свойств (координат точек наблюдения)
function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function formatCell(row, key) {
  const v = key.includes('.') ? getByPath(row, key) : row?.[key];
  if (v == null) return '—';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'Да' : 'Нет';
  if (typeof v === 'object') return JSON.stringify(v);
  // длинные тексты — слегка обрезаем
  const s = String(v);
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
}

/* ---------- Модалка формы создания/редактирования ---------- */
function CrudFormModal({ open, onClose, mode, resourceCfg, initial, onSaved }) {
  const methodKey = mode === 'edit' ? 'PUT' : 'POST';
  const methodCfg = resourceCfg.methods?.[methodKey];

  // предварительно проставим значения из объекта
  const [values, setValues] = useState(() => {
    if (!initial) return {};
    const fields = methodCfg?.bodyFields ?? [];
    // соберём только поля из схемы
    return buildBodyFromFields(fields, initial, { includeUndefined: false });
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const handleChange = (name, val) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...values };
      // id для PUT может приходить из initial
      const id = initial?.id ?? values?.id;
      await callAdminApi(resourceCfg, methodKey, { ...payload, id });
      await onSaved?.();
    } catch (e2) {
      setError(e2?.response?.data || e2?.message || 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-modal__backdrop" onClick={onClose}>
      <div
        className="admin-modal__content admin-modal__content--inner"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal__header">
          <h3>{mode === 'edit' ? 'Изменить' : 'Добавить'}</h3>
          <button className="admin-btn admin-btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        {!methodCfg ? (
          <p className="admin-hint">Этот ресурс не поддерживает {methodKey}.</p>
        ) : (
          <form onSubmit={onSubmit} className="admin-fields">
            {/* если для PUT нужен id в URL — скрыто покажем его, чтобы не путать пользователя */}
            {methodKey === 'PUT' && methodCfg.needsId && (initial?.id || values?.id) && (
              <input type="hidden" name="id" value={initial?.id ?? values?.id} />
            )}

            {methodCfg.bodyFields?.map((f) => {
              // при PUT не рендерим дублирующийся id (он уже в URL/hidden)
              if (methodKey === 'PUT' && methodCfg.needsId && f.name === 'id') return null;

              const common = {
                id: `f-${f.name}`,
                name: f.name,
                required: !!f.required,
                value: values?.[f.name] ?? '',
                onChange: (e) => handleChange(f.name, e.target.value),
              };

              if (f.type === 'textarea') {
                return (
                  <label key={f.name} className="admin-field">
                    {f.label}
                    <textarea rows={4} {...common} />
                  </label>
                );
              }
              const type = f.type === 'number' ? 'number' : f.type;
              return (
                <label key={f.name} className="admin-field">
                  {f.label}
                  <input
                    type={type}
                    min={f.min ?? undefined}
                    max={f.max ?? undefined}
                    step={f.step ?? undefined}
                    placeholder={f.placeholder ?? ''}
                    {...common}
                  />
                </label>
              );
            })}

            {error && (
              <pre className="admin-result admin-result--error">
                {JSON.stringify(error, null, 2)}
              </pre>
            )}

            <div className="admin-actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
                Отмена
              </button>
              <button className="admin-btn" disabled={submitting}>
                {submitting ? 'Сохраняю…' : 'Сохранить'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
