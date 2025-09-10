import { http } from '../../../api/http';

// Собираем путь и вызываем соответствующий метод axios
export async function callAdminApi(resourceCfg, method, values) {
  const methodCfg = resourceCfg.methods[method];
  if (!methodCfg) throw new Error(`Метод ${method} не поддержан`);

  let url = resourceCfg.base; // base уже начинается с /admin/...
  let body = null;

  // id в path — для PUT/DELETE (и иногда для GET по id, если захотите добавить)
  if (methodCfg.needsId) {
    const id = values?.id;
    if (!id) throw new Error('Не указан ID');
    url = `${url}/${id}`;
  }

  // Тело запроса: для POST/PUT
  if (method === 'POST' || method === 'PUT') {
    // собираем объект только из описанных полей (и учитываем группы)
    body = collectBodyFromFields(methodCfg.bodyFields, values);

    // Иногда бэкенд требует id также в body при PUT
    if (method === 'PUT' && methodCfg.includeIdInBody && values?.id) {
      body.id = values.id;
    }
  }

  // Вызов
  switch (method) {
    case 'GET':
      return http.get(url).then((r) => r.data);
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

function collectBodyFromFields(fields, values) {
  const body = {};
  fields.forEach((f) => {
    if (f.type === 'group') {
      const groupVal = {};
      f.fields.forEach((sf) => {
        const v = values?.[f.name]?.[sf.name];
        if (v !== undefined && v !== '') groupVal[sf.name] = cast(sf, v);
      });
      if (Object.keys(groupVal).length) body[f.name] = groupVal;
    } else {
      const v = values?.[f.name];
      if (v !== undefined && v !== '') body[f.name] = cast(f, v);
    }
  });
  return body;
}

function cast(field, value) {
  if (field.type === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) return undefined;
    return n;
  }
  // date input возвращает 'YYYY-MM-DD' — оставляем как строку ISO-дня
  return value;
}
