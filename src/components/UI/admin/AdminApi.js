// src/components/admin/AdminApi.js
import { http } from '../../../api/http';

// Проверка доступности метода у ресурса
export function hasMethod(resourceCfg, method) {
  return !!resourceCfg?.methods?.[method];
}

// Основная универсальная функция (осталась для совместимости)
export async function callAdminApi(resourceCfg, method, values) {
  const methodCfg = resourceCfg?.methods?.[method];
  if (!methodCfg) throw new Error(`Метод ${method} не поддержан`);

  let url = resourceCfg.base;
  let body = null;
  let params = null;

  // id в URL (PUT/DELETE)
  if (methodCfg.needsId) {
    const id = values?.id;
    if (!id) throw new Error('Не указан ID');
    url = `${url}/${id}`;
  }

  // query для GET
  if (method === 'GET') {
    const page = Number(values?.page ?? 0);
    const size = Number(values?.size ?? 10);
    params = { page, size };
  }

  // тело для POST/PUT
  if (method === 'POST' || method === 'PUT') {
    body = buildBodyFromFields(methodCfg.bodyFields, values);
    if (method === 'PUT' && methodCfg.includeIdInBody && values?.id) {
      body.id = values.id;
    }
  }

  switch (method) {
    case 'GET':
      return http.get(url, { params }).then((r) => r.data);
    case 'POST':
      return http.post(url, body).then((r) => r.data);
    case 'PUT':
      return http.put(url, body).then((r) => r.data);
    case 'DELETE':
      return http.delete(url).then((r) => r.data);
    default:
      throw new Error(`Неизвестный метод: ${method}`);
  }
}

/** Собирает тело запроса из описания полей схемы */
export function buildBodyFromFields(fields = [], values = {}, { includeUndefined = false } = {}) {
  const out = {};
  fields.forEach((f) => {
    let raw = values?.[f.name];
    // если префилл из ответа и значения по имени нет — попробуем взять по sourcePath
    if ((raw === undefined || raw === '') && f.sourcePath) {
      raw = getByPath(values, f.sourcePath);
    }
    if (raw === undefined || raw === '') {
      if (includeUndefined) out[f.name] = undefined;
      return;
    }
    out[f.name] = cast(f, raw);
  });
  return out;
}

function getByPath(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj);
}

function cast(field, value) {
  if (field.type === 'number') {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return value;
}
