import { useEffect, useMemo, useState } from 'react';
import RESOURCES from './ResourcesConfig';
import { callAdminApi } from './AdminApi';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

export default function AdminPanelModal({ open, onClose }) {
  const [resourceKey, setResourceKey] = useState('nature-reserve');
  const [method, setMethod] = useState('GET');
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const resourceCfg = RESOURCES[resourceKey];
  const methodCfg = resourceCfg.methods[method];

  // Сбрасываем форму при смене сущности/метода
  useEffect(() => {
    setValues({});
    setResult(null);
    setError(null);
  }, [resourceKey, method, open]);

  const resourceOptions = useMemo(
    () => Object.entries(RESOURCES).map(([key, v]) => ({ value: key, label: v.label })),
    [],
  );

  if (!open) return null;

  const handleChange = (namePath, val) => {
    // namePath: ['coordinatesResponseDto','lat'] для group; ['name'] для обычных
    setValues((prev) => {
      const copy = { ...prev };
      if (namePath.length === 1) {
        copy[namePath[0]] = val;
      } else {
        const [g, sub] = namePath;
        copy[g] = { ...(copy[g] || {}), [sub]: val };
      }
      return copy;
    });
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await callAdminApi(resourceCfg, method, values);
      setResult(data);
    } catch (e) {
      setError(e?.response?.data || e?.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal__backdrop" onClick={onClose}>
      <div className="admin-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal__header">
          <h3>Админ-панель</h3>
          <button className="admin-btn admin-btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="admin-grid">
          <label>
            Сущность
            <select value={resourceKey} onChange={(e) => setResourceKey(e.target.value)}>
              {resourceOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Метод
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.filter((m) => resourceCfg.methods[m]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Поля формы */}
        <FormFields method={method} methodCfg={methodCfg} values={values} onChange={handleChange} />

        <div className="admin-actions">
          <button className="admin-btn" disabled={loading} onClick={submit}>
            {loading ? 'Выполняю…' : 'Отправить'}
          </button>
        </div>

        <ResultBlock result={result} error={error} />
      </div>
    </div>
  );
}

function FormFields({ method, methodCfg, values, onChange }) {
  const rows = [];

  // ID в URL (PUT/DELETE)
  if (methodCfg.needsId) {
    rows.push(
      <label key="id" className="admin-field">
        ID (в URL)
        <input
          type="text"
          placeholder="UUID"
          value={values.id || ''}
          onChange={(e) => onChange(['id'], e.target.value)}
          required
        />
      </label>,
    );
  }

  // Поля для GET (query ?page=&size=)
  if (method === 'GET' && methodCfg.queryFields?.length) {
    methodCfg.queryFields.forEach((f) => {
      rows.push(
        <label key={`body-${f.name}`} className="admin-field">
          {f.label}
          <input
            type="number"
            min={f.min ?? undefined}
            max={f.max ?? undefined}
            step={f.step ?? undefined}
            required={!!f.required}
            value={values?.[f.name] ?? ''}
            onChange={(e) => onChange([f.name], e.target.value)}
          />
        </label>,
      );
    });
  }

  // Поля тела (POST/PUT)
  if (method === 'POST' || method === 'PUT') {
    methodCfg.bodyFields.forEach((f) => {
      // при PUT не рендерим дублирующийся id из body
      if (method === 'PUT' && methodCfg.needsId && f.name === 'id') return;

      if (f.type === 'textarea') {
        rows.push(
          <label key={`body-${f.name}`} className="admin-field">
            {f.label}
            <textarea
              rows={3}
              value={values?.[f.name] ?? ''}
              onChange={(e) => onChange([f.name], e.target.value)}
              required={!!f.required}
            />
          </label>,
        );
      } else {
        rows.push(
          <label key={`body-${f.name}`} className="admin-field">
            {f.label}
            <input
              type={f.type === 'number' ? 'number' : f.type}
              min={f.min ?? undefined}
              max={f.max ?? undefined}
              step={f.step ?? undefined}
              required={!!f.required}
              placeholder={f.placeholder ?? ''}
              value={values?.[f.name] ?? ''}
              onChange={(e) => onChange([f.name], e.target.value)}
            />
          </label>,
        );
      }
    });
  }

  if (!rows.length) {
    return <p className="admin-hint">Для выбранного метода дополнительных полей не требуется.</p>;
  }
  return <div className="admin-fields">{rows}</div>;
}

function ResultBlock({ result, error }) {
  if (error) {
    return <pre className="admin-result admin-result--error">{JSON.stringify(error, null, 2)}</pre>;
  }
  if (result) {
    return <pre className="admin-result">{JSON.stringify(result, null, 2)}</pre>;
  }
  return null;
}
