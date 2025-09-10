import { http } from '../../../api/http';

// Собираем путь и вызываем соответствующий метод axios
export async function callAdminApi(resourceCfg, method, values) {
  const methodCfg = resourceCfg.methods[method];
  if (!methodCfg) throw new Error(`Метод ${method} не поддержан`);

  let url = resourceCfg.base;
  let body = null;
  let params = null;

  if (methodCfg.needsId) {
    const id = values?.id;
    if (!id) throw new Error('Не указан ID');
    url = `${url}/${id}`;
  }

  if (method === 'GET' && methodCfg.queryFields?.length) {
    params = collectFromFields(methodCfg.queryFields, values);
  }

  if (method === 'POST' || method === 'PUT') {
    body = collectFromFields(methodCfg.bodyFields, values);
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

function collectFromFields(fields = [], values = {}) {
  const out = {};
  fields.forEach((f) => {
    const v = values?.[f.name];
    if (v !== undefined && v !== '') out[f.name] = cast(f, v);
  });
  return out;
}

function cast(field, value) {
  if (field.type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) return undefined;
    return n;
  }
  return value;
}
