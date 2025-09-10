// Универсальные описатели полей
const uuid = (name, label, required = true) => ({
  name,
  label,
  type: 'text',
  required,
  placeholder: 'UUID',
});
const text = (name, label, required = true) => ({ name, label, type: 'text', required });
const number = (name, label, min = null, max = null, step = 'any', required = true) => ({
  name,
  label,
  type: 'number',
  min,
  max,
  step,
  required,
});
const date = (name, label, required = true) => ({ name, label, type: 'date', required });

// Вложенные поля (пример для координат)
const group = (name, label, fields) => ({ name, label, type: 'group', fields });

// === Конфиг по сущностям ===
// На каждый метод указываем: нужен ли id в path, какие поля показывать в форме, и включать ли id в тело (PUT обычно да).
const RESOURCES = {
  'nature-reserve': {
    label: 'Заповедники',
    base: '/admin/nature-reserve',
    methods: {
      GET: { needsId: false, bodyFields: [] },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          // по REST обычно id для POST не передаем — бэкенд генерит
          text('name', 'Название'),
          uuid('regionId', 'Region ID'),
          number('area', 'Площадь (км²)', 0, null, 0.01),
          number('yearFounded', 'Год основания', 0, 3000, 1),
          text('description', 'Описание', false),
          text('website', 'Сайт', false),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          text('name', 'Название'),
          uuid('regionId', 'Region ID'),
          number('area', 'Площадь (км²)', 0, null, 0.01),
          number('yearFounded', 'Год основания', 0, 3000, 1),
          text('description', 'Описание', false),
          text('website', 'Сайт', false),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  soil: {
    label: 'Почва',
    base: '/admin/soil',
    methods: {
      GET: { needsId: false, bodyFields: [] },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          uuid('regionId', 'Region ID'),
          number('chronicSoilPollutionPercent', 'Хроническое загрязнение (%)', -100, 100, 0.1),
          number(
            'landDegradationNeutralityIndex',
            'Индекс нейтральности деградации',
            -100,
            100,
            0.1,
          ),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          uuid('regionId', 'Region ID'),
          number('chronicSoilPollutionPercent', 'Хроническое загрязнение (%)', -100, 100, 0.1),
          number(
            'landDegradationNeutralityIndex',
            'Индекс нейтральности деградации',
            -100,
            100,
            0.1,
          ),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  'cleanup-events': {
    label: 'Субботники',
    base: '/admin/cleanup-events',
    methods: {
      GET: { needsId: false, bodyFields: [] },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          text('cityName', 'Город'),
          text('location', 'Локация'),
          date('date', 'Дата'),
          group('coordinatesResponseDto', 'Координаты', [
            number('lat', 'Широта', -90, 90, 0.000001),
            number('lon', 'Долгота', -180, 180, 0.000001),
          ]),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          text('cityName', 'Город'),
          text('location', 'Локация'),
          date('date', 'Дата'),
          group('coordinatesResponseDto', 'Координаты', [
            number('lat', 'Широта', -90, 90, 0.000001),
            number('lon', 'Долгота', -180, 180, 0.000001),
          ]),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  radiation: {
    label: 'Радиация',
    base: '/admin/radiation',
    methods: {
      GET: { needsId: false, bodyFields: [] },
      // Ниже — пример; при необходимости скорректируйте имена полей под ваш бекенд
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          uuid('regionId', 'Region ID'),
          number('gammaBackground', 'Гамма-фон (µR/h)', 0, null, 0.1),
          date('measuredAt', 'Дата измерения'),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          uuid('regionId', 'Region ID'),
          number('gammaBackground', 'Гамма-фон (µR/h)', 0, null, 0.1),
          date('measuredAt', 'Дата измерения'),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },
};

export default RESOURCES;
