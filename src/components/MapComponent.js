import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import { ObjectManager } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

import { http } from '../api/http';
import { fetchRegions } from '../store/regions-slice'; // импорт thunk
import { selectActiveFilter } from '../store/filter-slice';

import MapSearchBar from './UI/MapSearchBar';
import MapFilter from './UI/MapFilter';
import AdminPanel from './UI/AdminPanel';
import SideBar from './UI/SideBar';
import NavigateButtons from './UI/NavigateButtons';
import MapCalendar from './UI/MapCalendar';

const FILTER_TYPE_BY_ID = {
  0: 'air',
  1: 'radiation',
  2: 'water',
  3: 'soil',
  4: 'cleanup-events',
};

function makePointsAdaptor({ getId, getName, getLonLat, toProps }) {
  return function adapt(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => {
      const [lon, lat] = getLonLat(p);
      return {
        id: getId(p),
        coords: [lon, lat], // coordorder: 'longlat' → [lon, lat]
        props: toProps(p, { name: getName(p) }),
      };
    });
  };
}

const adaptAirPoints = makePointsAdaptor({
  getId: (p) => p.pointId,
  getName: (p) => p.pointName ?? 'Точка',
  getLonLat: (p) => [p.CoordinatesResponseDto.lon, p.CoordinatesResponseDto.lat],
  toProps: (p) => ({
    hintContent: `${p.pointName} • AQI: ${p.europeanAqi}`,
    balloonContent: `
      <div style="font-size:13px;">
        <b>${p.pointName}</b><br/>
        PM2.5: ${p.pm25} • PM10: ${p.pm10}<br/>
        NO₂: ${p.nitrogenDioxide} • SO₂: ${p.sulphurDioxide}<br/>
        O₃: ${p.ozone} • CO₂: ${p.carbonDioxide}
      </div>
    `,
  }),
});

function makeRegionChoroplethAdaptor({
  getId,
  getGeoJsonString,
  getRegionName,
  getPercent,
  extraProps,
}) {
  return function adapt(raw) {
    if (!Array.isArray(raw)) return { type: 'FeatureCollection', features: [] };

    const numifyRing = (ring) => ring.map((pt) => [Number(pt[0]), Number(pt[1])]);
    const numifyPoly = (poly) => poly.map(numifyRing);

    const features = [];

    for (const r of raw) {
      let geom;
      try {
        const geoJsonStr = getGeoJsonString(r);
        if (!geoJsonStr) continue;
        geom = JSON.parse(geoJsonStr);
      } catch {
        continue;
      }
      if (!geom || !geom.coordinates) continue;

      const baseProps = {
        regionName: getRegionName(r),
        percent: Number(getPercent(r)) || 0,
        ...(typeof extraProps === 'function' ? extraProps(r) : {}),
      };

      if (geom.type === 'Polygon') {
        features.push({
          type: 'Feature',
          id: String(getId(r)),
          geometry: { type: 'Polygon', coordinates: numifyPoly(geom.coordinates) },
          properties: baseProps,
        });
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polyCoords, idx) => {
          features.push({
            type: 'Feature',
            id: `${getId(r)}-${idx}`,
            geometry: { type: 'Polygon', coordinates: numifyPoly(polyCoords) },
            properties: baseProps,
          });
        });
      }
    }

    return { type: 'FeatureCollection', features };
  };
}

// INSERT ↓↓↓ новый адаптер для радиации
const adaptRadiationPoints = makePointsAdaptor({
  getId: (p) => p.pointId,
  getName: (p) => p.pointName ?? 'Точка',
  // Внимание: в radiation — coordinatesResponseDto (нижний регистр)
  getLonLat: (p) => [p.coordinatesResponseDto.lon, p.coordinatesResponseDto.lat],
  toProps: (p) => ({
    hintContent: `${p.pointName} • β: ${p.betaFallout}`,
    balloonContent: `
      <div style="font-size:13px;">
        <b>${p.pointName}</b><br/>
        Бета-выпадение: ${p.betaFallout}
      </div>
    `,
  }),
});

const adaptCleanupEventsPoints = makePointsAdaptor({
  getId: (p) => p.id,
  getName: (p) => p.cityName ?? 'Инициатива',
  getLonLat: (p) => [p.coordinatesResponseDto.lon, p.coordinatesResponseDto.lat],
  toProps: (p) => ({
    // всплывающая подсказка + дата
    hintContent: `${p.cityName ?? 'Инициатива'} • ${formatDate(p.date)}`,
    // балун с городом, местом и датой
    balloonContent: `
      <div style="font-size:13px;line-height:1.35">
        <b>${p.cityName ?? 'Инициатива'}</b><br/>
        ${p.location ? `Место: ${p.location}<br/>` : ''}
        Дата: ${formatDate(p.date)}
      </div>
    `,
  }),
});

const adaptWaterChoropleth = makeRegionChoroplethAdaptor({
  getId: (r) => r.regionId,
  getGeoJsonString: (r) => r.geoJson,
  getRegionName: (r) => r.regionName,
  getPercent: (r) => r.dirtySurfaceWaterPercent, // 0..100
  extraProps: (r) => ({ metric: 'water', dirtySurfaceWaterPercent: r.dirtySurfaceWaterPercent }),
});

const adaptSoilChoropleth = makeRegionChoroplethAdaptor({
  getId: (r) => r.regionId,
  getGeoJsonString: (r) => r.geoJson,
  getRegionName: (r) => r.regionName,
  // берём % хронического загрязнения почв под раскраску
  getPercent: (r) => r.chronicSoilPollutionPercent, // 0..100
  extraProps: (r) => ({
    metric: 'soil',
    chronicSoilPollutionPercent: r.chronicSoilPollutionPercent,
    landDegradationNeutralityIndex: r.landDegradationNeutralityIndex,
  }),
});

function percentToColor(p) {
  const clamped = Math.max(0, Math.min(100, Number(p) || 0));
  const t = clamped / 100; // 0..1
  const r = Math.round(255 * t);
  const g = Math.round(200 * (1 - t));
  const b = 60;
  const a = 0.6; // прозрачность заливки
  return `rgba(${r},${g},${b},${a})`;
}

// Нормализуем 0..100 → 0..1
const norm01 = (p) => Math.max(0, Math.min(1, (Number(p) || 0) / 100));

// простая линейная интерполяция цветов
function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

// Палитра для воды: от светло-голубого к насыщенно-синему
function waterColor(p) {
  const t = norm01(p);
  const r = lerp(80, 0, t); // было 180→0
  const g = lerp(180, 80, t); // было 220→120
  const b = lerp(255, 255, t);
  const a = lerp(0.55, 0.95, t); // было 0.25→0.75
  return rgba(r, g, b, a);
}

function soilColor(p) {
  const t = norm01(p);
  const r = lerp(100, 210, t); // теплее и ярче
  const g = lerp(200, 40, t);
  const b = lerp(70, 40, t);
  const a = lerp(0.55, 0.95, t);
  return rgba(r, g, b, a);
}

// Универсальный селектор палитры
function fillColorByMetric(metric, p) {
  if (metric === 'water') return waterColor(p);
  if (metric === 'soil') return soilColor(p);
  // fallback — твой старый градиент
  return percentToColor(p);
}

// ✅ Подкорректированный meta: для air используем adaptAirPoints
const LAYER_META = {
  air: { mode: 'points', adapt: adaptAirPoints }, // <— ВАЖНО
  radiation: { mode: 'points', adapt: adaptRadiationPoints },
  water: { mode: 'choropleth', adapt: adaptWaterChoropleth },
  soil: { mode: 'choropleth', adapt: adaptSoilChoropleth },
  'cleanup-events': { mode: 'points', adapt: adaptCleanupEventsPoints },
};

function toFeatureCollection(points) {
  return {
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature',
      id: p.id,
      geometry: { type: 'Point', coordinates: p.coords }, // [lon, lat]
      properties: p.props,
    })),
  };
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru-RU');
}

function MapComponent() {
  const [mapReady, setMapReady] = useState(false);
  const [pointsFC, setPointsFC] = useState(null);
  const dispatch = useDispatch();
  const { items: regions, status, error } = useSelector((s) => s.regions);
  const activeFilter = useSelector(selectActiveFilter);
  const { isLoggedIn } = useSelector((s) => s.auth); // чтобы не дергать до логина

  const mapRef = useRef(null);
  const polylabelerRef = useRef(null);
  // const didMountRef = useRef(false); // Чтобы не сработал useEffect при первом рендере
  const omRef = useRef(null); // ObjectManager для точек
  const regionCollectionRef = useRef(null);
  //const waterLayerRef = useRef(null); // хранит geoQuery результата для воды

  /* ========================= Работа с коллекцией регионов ========================= */
  const ensureRegionCollection = useCallback(() => {
    const map = mapRef.current;
    if (!map || !window.ymaps) return null;
    if (!regionCollectionRef.current) {
      regionCollectionRef.current = new window.ymaps.GeoObjectCollection();
      map.geoObjects.add(regionCollectionRef.current);
    }
    return regionCollectionRef.current;
  }, []); //

  const clearRegionCollection = () => {
    const coll = regionCollectionRef.current;
    if (!coll) return;
    try {
      coll.removeAll();
    } catch (e) {
      console.warn('removeAll failed', e);
    }
  };

  const bringRegionCollectionToFront = useCallback(() => {
    const map = mapRef.current;
    const coll = ensureRegionCollection();
    if (!map || !coll) return;
    try {
      map.geoObjects.remove(coll);
      map.geoObjects.add(coll);
    } catch {}
  }, [ensureRegionCollection]);

  /* ========================= Отрисовка Регионов России ========================= */

  useEffect(() => {
    const check = async () => {
      if (!window.ymaps) {
        console.log('❌ ymaps не загрузился');
        return;
      }
      try {
        // ждём готовности API и самого модуля плагина
        await window.ymaps.ready(['polylabel.create', 'util.calculateArea']);

        // получаем конструктор плагина через module loader
        const Polylabel = await window.ymaps.modules
          .require(['polylabel.create'])
          .then((Polylabel) => Polylabel);

        console.log('✅ Polylabeler подключён:', Polylabel);
      } catch (e) {
        console.log('❌ Polylabeler не найден / не загрузился', e);
      }
    };
    check();
  }, []);

  useEffect(() => {
    if (!mapReady || !window.ymaps) return;

    (async () => {
      const ymaps = window.ymaps;
      await ymaps.ready(['polylabel.create', 'util.calculateArea']);
      const map = mapRef.current;

      // Берём конструктор лейблера (как в README)
      // Можно и так: const [Polylabel] = await ymaps.modules.require(['polylabel.create']);
      const PolylabelCtor = ymaps.polylabel.create;

      // --- helper: превращаем borders.* в FeatureCollection с Polygon-ами
      const buildFC = (geojson) => {
        const feats = (geojson?.features ?? []).flatMap((f, idx) => {
          const name =
            f.properties?.name ||
            f.properties?.name_ru ||
            f.properties?.hintContent ||
            `Регион ${idx + 1}`;
          const make = (coords, part = 0) => ({
            type: 'Feature',
            id: `${idx}-${part}`,
            geometry: { type: 'Polygon', coordinates: coords },
            properties: { name },
          });
          if (f.geometry?.type === 'Polygon') return [make(f.geometry.coordinates)];
          if (f.geometry?.type === 'MultiPolygon')
            return f.geometry.coordinates.map((c, p) => make(c, p));
          return [];
        });
        return { type: 'FeatureCollection', features: feats };
      };

      // --- главная функция добавления + подписи
      const addFCAndFit = (fc) => {
        // 1) Делаем коллекцию из FC и сразу рисуем на карту
        const q = ymaps.geoQuery(fc).addToMap(map);

        // 2) Стилизуем только полигоны и задаём обязательный labelLayout
        const polygons = q.search('geometry.type="Polygon"');
        polygons.setOptions({
          fillColor: '#2D7DB8',
          fillOpacity: 0.6,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.9,
          strokeWidth: 1,
          labelDefaults: 'light',
          labelLayout: '{{properties.name}}', // <-- ОБЯЗАТЕЛЬНО
        });

        // 3) Подгоним карту под все регионы
        const bounds = q.getBounds();
        if (bounds) map.setBounds(bounds, { checkZoomRange: true });

        // 4) Стартуем polylabeler ПОСЛЕ того, как геообъекты и опции уже есть
        if (polylabelerRef.current?.destroy) polylabelerRef.current.destroy();
        polylabelerRef.current = new PolylabelCtor(map, q);

        console.log(`🟦 Полигонов добавлено: ${polygons.getLength?.() ?? 'n/a'}`);
      };

      try {
        // основной источник — границы РФ
        const borders = await ymaps.borders.load('RU', { lang: 'ru', quality: 2 });
        if (borders?.features) {
          addFCAndFit(buildFC(borders));
        } else if (borders?.geoObjects) {
          // Если пришла коллекция, работаем прямо с ней
          const coll = borders.geoObjects;
          map.geoObjects.add(coll);
          ymaps.geoQuery(coll).search('geometry.type="Polygon"').setOptions({
            fillColor: '#2D7DB8',
            fillOpacity: 0.6,
            strokeColor: '#FFFFFF',
            strokeOpacity: 0.9,
            strokeWidth: 1,
            labelDefaults: 'light',
            labelLayout: '{{properties.name}}',
          });
          if (polylabelerRef.current?.destroy) polylabelerRef.current.destroy();
          polylabelerRef.current = new PolylabelCtor(map, coll);
          const bounds = coll.getBounds?.();
          if (bounds) map.setBounds(bounds, { checkZoomRange: true });
        } else {
          console.warn('borders.load: неожиданный формат', borders);
        }
      } catch (e) {
        console.warn('borders.load не удалось, пробуем локальный файл', e);
        try {
          const r = await fetch(process.env.PUBLIC_URL + '/geo/ru_adm1.json');
          addFCAndFit(buildFC(await r.json()));
        } catch (err) {
          console.error('Не удалось получить границы РФ', err);
        }
      }
    })();

    return () => {
      if (polylabelerRef.current?.destroy) polylabelerRef.current.destroy();
      polylabelerRef.current = null;
    };
  }, [mapReady]);

  /* ========================= Координаты с Бэка ========================= */

  // 1) грузим регионы один раз при заходе (и когда пользователь авторизовался)
  useEffect(() => {
    if (isLoggedIn && status === 'idle') {
      dispatch(fetchRegions());
    }
  }, [dispatch, isLoggedIn, status]);

  // 2) просто выведем массив в консоль, когда он загрузится
  useEffect(() => {
    if (status === 'succeeded') {
      console.log('Регионы получены:', regions);
      // если в слайсе парсишь geoJson -> regions[i].geometry будет уже объектом
    }
    if (status === 'failed') {
      console.warn('Ошибка загрузки регионов:', error);
    }
  }, [status, regions, error]);

  /* ========================= Выбранный фильтр ========================= */
  // Логируем изменение фильтра именно в MapComponent
  // useEffect(() => {
  //   if (!didMountRef.current) {
  //     didMountRef.current = true;
  //     return;
  //   }
  //   if (activeFilter) {
  //     console.log(`Активный фильтр: ${activeFilter.label} (id=${activeFilter.id})`);
  //     // здесь же можно инициировать фильтрацию слоёв карты/догрузку данных
  //   } else {
  //     console.log('Фильтр снят');
  //     // здесь можно вернуть слои к дефолтному состоянию
  //   }
  // }, [activeFilter]);

  useEffect(() => {
    // очистка на логауте/сбросе фильтра
    if (!activeFilter || !isLoggedIn) {
      setPointsFC(null);
      // снять водный слой, если был
      clearRegionCollection();
      return;
    }

    const type = FILTER_TYPE_BY_ID[activeFilter.id];
    const meta = LAYER_META[type];
    if (!type || !meta) {
      setPointsFC(null);
      clearRegionCollection();
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const { data: raw } = await http.get(`/map/layer/${encodeURIComponent(type)}`, {
          signal: controller.signal,
        });

        // POINTS — как раньше
        if (meta.mode === 'points') {
          const normalized = meta.adapt ? meta.adapt(raw) : raw;
          setPointsFC(toFeatureCollection(normalized));

          // снести водный слой, если был
          clearRegionCollection();
          return;
        }

        // CHOROPLETH — строим FC и рисуем полигоны
        if (meta.mode === 'choropleth') {
          const fc = meta.adapt(raw);
          if (!fc || !Array.isArray(fc.features) || fc.features.length === 0) {
            clearRegionCollection();
            setPointsFC(null);
            return;
          }

          const ymaps = window.ymaps;
          const map = mapRef.current;
          if (!ymaps || !map) return;

          // 1) очистили
          clearRegionCollection();
          // 2) убедились, что коллекция есть и прикреплена к карте
          const coll = ensureRegionCollection();
          coll.options.set({
            zIndex: 3000,
            zIndexHover: 3001,
            zIndexActive: 3002,
            zIndexDrag: 3003,
          });
          if (!coll) return;
          bringRegionCollectionToFront();

          for (const f of fc.features) {
            const regionName = f.properties.regionName;
            const rawP = f.properties.percent;
            // 9999 трактуем как «нет данных»
            const isNoData = Number(rawP) >= 9999;
            const p = isNoData ? 0 : Math.max(0, Math.min(100, Number(rawP) || 0));
            const metric = f.properties.metric;

            let hint = `${regionName} • ${isNoData ? 'нет данных' : p + '%'}`;
            if (metric === 'soil') {
              const csp = f.properties.chronicSoilPollutionPercent;
              const ldn = f.properties.landDegradationNeutralityIndex;
              hint = `${regionName}\n• Хрон. загрязнение: ${isNoData ? 'н/д' : csp + '%'}\n• Индекс LDN: ${ldn}`;
            } else if (metric === 'water') {
              hint = `${regionName} • Загрязнение воды: ${isNoData ? 'н/д' : p + '%'}`;
            }

            const poly = new ymaps.Polygon(
              f.geometry.coordinates,
              { ...f.properties, hintContent: hint },
              {
                fillColor: isNoData ? 'rgba(160,160,160,0.75)' : fillColorByMetric(metric, p), // ↑ плотнее
                fillOpacity: 0.85, // ← принудительно плотнее заливка (на случай, если в цвете альфа низкая)
                strokeColor: '#ffffff',
                strokeOpacity: 0.9,
                strokeWidth: 1.2,
                zIndex: 3000, // ← выше подложки
                zIndexHover: 3001,
                zIndexActive: 3002,
                zIndexDrag: 3003,
              },
            );
            coll.add(poly);
          }

          setPointsFC(null);
          return;
        }

        // другие режимы (heatmap для soil — оставим на потом)
        setPointsFC(null);
        clearRegionCollection();
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Ошибка загрузки слоя:', err?.response?.data || err.message);
        }
        setPointsFC(null);
        clearRegionCollection();
      }
    })();

    return () => controller.abort();
  }, [activeFilter, isLoggedIn, bringRegionCollectionToFront, ensureRegionCollection]);

  const hasPoints = !!pointsFC;
  useEffect(() => {
    const om = omRef.current;

    // Вешаем хэндлер только если OM реально есть и у него есть events
    const canAttach =
      om &&
      om.objects &&
      om.objects.events &&
      typeof om.objects.events.add === 'function' &&
      typeof om.objects.events.remove === 'function';

    if (!canAttach) return;

    const onObjectClick = (e) => {
      try {
        const objectId = e.get('objectId');
        const targetOm = omRef.current; // мог измениться
        const geoObj =
          targetOm && targetOm.objects && typeof targetOm.objects.getById === 'function'
            ? targetOm.objects.getById(objectId)
            : null;
        console.log('Клик по точке:', geoObj?.properties);
      } catch (err) {
        console.warn('OM click handler error:', err);
      }
    };

    om.objects.events.add('click', onObjectClick);

    return () => {
      try {
        // защита от состояния после размонтирования
        if (
          om &&
          om.objects &&
          om.objects.events &&
          typeof om.objects.events.remove === 'function'
        ) {
          om.objects.events.remove('click', onObjectClick);
        }
      } catch (err) {
        console.warn('Detach OM click handler error:', err);
      }
    };
    // Привязываем/отвязываем только по факту наличия точек
  }, [hasPoints]);

  /* ========================= Обработчики событий ========================= */

  const mapClickHandler = (e) => {
    const coords = e.get('coords');
    console.log('Координаты клика:', coords);
    if (activeFilter) {
      console.log('Активный фильтр:', { id: activeFilter.id, label: activeFilter.label });
    } else {
      console.log('Активный фильтр: нет (null)');
    }
  };

  const dateChangeHandler = (date) => {
    console.log('Выбрана дата:', date);
    // здесь можно подгрузить данные карты за выбранный день
  };

  const zoomInHandler = () => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getZoom();
    map.setZoom(current + 1, { duration: 300 }); // плавное приближение
  };
  const zoomOutHandler = () => {
    const map = mapRef.current;
    if (!map) return;
    const current = map.getZoom();
    map.setZoom(current - 1, { duration: 300 }); // плавное отдаление
  };
  const zoomToUserHandler = () => {
    const map = mapRef.current;
    if (!map || !('geolocation' in navigator)) return;

    const goTo = (lat, lon) => {
      const target = [lon, lat]; // <-- порядок меняем местами
      map.panTo(target, { duration: 500 }).then(() => {
        const z = map.getZoom ? map.getZoom() : 9;
        map.setZoom(Math.max(z, 14), { duration: 300 });
      });
    };

    const opts = {
      enableHighAccuracy: true, // просим GPS/датчики
      timeout: 8000, // ждём до 8с
      maximumAge: 0, // не берем старый кеш
    };

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        goTo(coords.latitude, coords.longitude); // порядок lat, lon
      },
      (err) => {
        console.warn('Geolocation error:', err);
        // Fallback: оставляем текущий центр или покажите подсказку пользователю
      },
      opts,
    );
  };

  return (
    <YMaps query={{ apikey: config.YANDEX_MAP_API_KEY, lang: 'ru_RU', coordorder: 'longlat' }}>
      <div className="map-container">
        <Map
          defaultState={{ center: [37.57, 55.75], zoom: 4, controls: [] }}
          width="100%"
          height="100svh"
          options={{
            minZoom: 3,
            maxZoom: 18,
            avoidFractionalZoom: true,
            restrictMapArea: [
              [-179.99, -85.0],
              [179.99, 85.0],
            ],
          }}
          instanceRef={(m) => {
            mapRef.current = m;
            setMapReady(true);
          }}
          onClick={(e) => mapClickHandler(e)}
        >
          {/* INSERT ↓↓↓ ObjectManager для точек воздуха */}
          {pointsFC && (
            <ObjectManager
              instanceRef={omRef}
              features={pointsFC}
              options={{
                clusterize: true,
                gridSize: 64,
                clusterDisableClickZoom: false,
                clusterOpenBalloonOnClick: true,
              }}
              objects={{
                preset: 'islands#blueCircleDotIcon',
                openBalloonOnClick: true,
              }}
              clusters={{
                preset: 'islands#invertedBlueClusterIcons',
              }}
              modules={[
                'objectManager.addon.objectsHint',
                'objectManager.addon.objectsBalloon',
                'objectManager.addon.clustersHint',
                'objectManager.addon.clustersBalloon',
              ]}
            />
          )}
        </Map>
      </div>
      <MapSearchBar />
      <MapFilter />
      <AdminPanel />
      <SideBar />
      <NavigateButtons
        onZoomToUser={zoomToUserHandler}
        onZoomIn={zoomInHandler}
        onZoomOut={zoomOutHandler}
      />
      <MapCalendar onDateChange={dateChangeHandler} />
    </YMaps>
  );
}

export default MapComponent;
