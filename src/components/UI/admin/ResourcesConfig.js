// src/components/admin/ResourcesConfig.js

// ===== утилиты для описания полей =====
const uuid = (name, label, required = true) => ({
  name,
  label,
  type: 'text',
  required,
  placeholder: 'UUID',
});
const text = (name, label, required = true, placeholder = '') => ({
  name,
  label,
  type: 'text',
  required,
  placeholder,
});
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

// ===== конфиг по сущностям (V2) =====
const RESOURCES = {
  'nature-reserve': {
    label: 'Заповедники',
    base: '/admin/nature-reserve',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Название' },
      { key: 'regionName', label: 'Регион' },
      { key: 'area', label: 'Площадь' },
      { key: 'yearFounded', label: 'Год' },
      { key: 'description', label: 'Описание' },
    ],
    methods: {
      GET: { needsId: false },
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
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'regionName', label: 'Регион' },
      { key: 'chronicSoilPollutionPercent', label: 'Хроническое загрязнение (%)' },
      { key: 'landDegradationNeutralityIndex', label: 'Индекс нейтральности деградации' },
    ],
    methods: {
      GET: { needsId: false },
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
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'location', label: 'Локация' },
      { key: 'cityName', label: 'Город' },
      { key: 'date', label: 'Дата' },
      { key: 'organizer', label: 'Организатор' },
      { key: 'participantsExpected', label: 'Участников (ожид.)' },
    ],
    methods: {
      GET: { needsId: false },
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
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'pointName', label: 'Точка' },
      { key: 'betaFallout', label: 'Бета-выпадения' },
    ],
    methods: {
      GET: { needsId: false },
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

  water: {
    label: 'Вода',
    base: '/admin/water',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'regionName', label: 'Регион' },
      { key: 'dirtySurfaceWaterPercent', label: 'Загрязнённые поверхностные воды (%)' },
    ],
    methods: {
      GET: { needsId: false },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          uuid('regionId', 'Region ID'),
          number('dirtySurfaceWaterPercent', 'Загрязнённые поверхностные воды (%)', 0, 100, 0.1),
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          uuid('regionId', 'Region ID'),
          number('dirtySurfaceWaterPercent', 'Загрязнённые поверхностные воды (%)', 0, 100, 0.1),
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  points: {
    label: 'Точки наблюдения',
    base: '/admin/points',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Название' },
      { key: 'cityName', label: 'Город' },
      { key: 'coordinatesResponseDto.lat', label: 'Широта' },
      { key: 'coordinatesResponseDto.lon', label: 'Долгота' },
    ],
    methods: {
      GET: { needsId: false },
      POST: {
        needsId: false,
        includeIdInBody: false,
        bodyFields: [
          text('name', 'Название'),
          uuid('cityId', 'City ID'),
          // бэкенд ждёт плоские latitude/longitude, но для префилла из ответа возьмём sourcePath
          {
            name: 'latitude',
            label: 'Широта',
            type: 'number',
            min: -90,
            max: 90,
            step: 0.000001,
            required: true,
            sourcePath: 'coordinatesResponseDto.lat',
          },
          {
            name: 'longitude',
            label: 'Долгота',
            type: 'number',
            min: -180,
            max: 180,
            step: 0.000001,
            required: true,
            sourcePath: 'coordinatesResponseDto.lon',
          },
        ],
      },
      PUT: {
        needsId: true,
        includeIdInBody: true,
        bodyFields: [
          uuid('id', 'ID'),
          text('name', 'Название'),
          uuid('cityId', 'City ID'),
          {
            name: 'latitude',
            label: 'Широта',
            type: 'number',
            min: -90,
            max: 90,
            step: 0.000001,
            required: true,
            sourcePath: 'coordinatesResponseDto.lat',
          },
          {
            name: 'longitude',
            label: 'Долгота',
            type: 'number',
            min: -180,
            max: 180,
            step: 0.000001,
            required: true,
            sourcePath: 'coordinatesResponseDto.lon',
          },
        ],
      },
      DELETE: { needsId: true, bodyFields: [] },
    },
  },

  // только GET
  cities: {
    label: 'Города',
    base: '/admin/cities',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Название' },
    ],
    methods: { GET: { needsId: false } },
  },

  // только GET
  regions: {
    label: 'Регионы',
    base: '/admin/regions',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Название' },
    ],
    methods: { GET: { needsId: false } },
  },
};

export default RESOURCES;
