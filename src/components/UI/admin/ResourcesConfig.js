// src/admin/resourcesConfig.js

// ===== утилиты для описания полей =====
const uuid = (name, label, required = true) => ({
  name,
  label,
  type: 'text',
  required,
  placeholder: 'UUID',
});
const text = (name, label, required = true) => ({ name, label, type: 'text', required });
const textarea = (name, label, required = false) => ({ name, label, type: 'textarea', required });
const number = (name, label, min = null, max = null, step = 'any', required = true) => ({
  name,
  label,
  type: 'number',
  min,
  max,
  step,
  required,
});
const int = (name, label, min = null, max = null, required = true) => ({
  name,
  label,
  type: 'number',
  min,
  max,
  step: 1,
  required,
});
const date = (name, label, required = true) => ({ name, label, type: 'date', required });

// ===== конфиг по сущностям =====
const RESOURCES = {
  'nature-reserve': {
    label: 'Заповедники',
    base: '/admin/nature-reserve',
    methods: {
      GET: {
        needsId: false,
        queryFields: [int('page', 'Страница', 0), int('size', 'На странице', 1)],
      },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          text('name', 'Название'),
          uuid('regionId', 'Region ID'),
          number('area', 'Площадь (км²)', 0, null, 0.01),
          int('yearFounded', 'Год основания', 0, 3000),
          textarea('description', 'Описание', false),
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
          int('yearFounded', 'Год основания', 0, 3000),
          textarea('description', 'Описание', false),
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
      GET: {
        needsId: false,
        queryFields: [int('page', 'Страница', 0), int('size', 'На странице', 1)],
      },
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
      GET: {
        needsId: false,
        queryFields: [int('page', 'Страница', 0), int('size', 'На странице', 1)],
      },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          text('location', 'Локация'),
          uuid('cityId', 'City ID'),
          date('date', 'Дата'),
          text('organizer', 'Организатор'),
          textarea('description', 'Описание', false),
          int('participantsExpected', 'Ожидаемые участники', 0),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          text('location', 'Локация'),
          uuid('cityId', 'City ID'),
          date('date', 'Дата'),
          text('organizer', 'Организатор'),
          textarea('description', 'Описание', false),
          int('participantsExpected', 'Ожидаемые участники', 0),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  radiation: {
    label: 'Радиация',
    base: '/admin/radiation',
    methods: {
      GET: {
        needsId: false,
        queryFields: [int('page', 'Страница', 0), int('size', 'На странице', 1)],
      },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          uuid('pointId', 'Point ID'),
          number('betaFallout', 'Бета-выпадения', 0, null, 0.1),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          uuid('pointId', 'Point ID'),
          number('betaFallout', 'Бета-выпадения', 0, null, 0.1),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },
};

export default RESOURCES;
