import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import { ObjectManager } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

import { http } from '../api/http';
import { fetchRegions } from '../store/regions-slice'; // импорт thunk
import { selectActiveFilter } from '../store/filter-slice';

import MapSearchBar from './UI/MapSearchBar';
import MapFilter from './UI/MapFilter';
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

function adaptWaterChoropleth(raw) {
  if (!Array.isArray(raw)) return { type: 'FeatureCollection', features: [] };

  // хелпер: приводим coord к числам
  const numifyRing = (ring) => ring.map((pt) => [Number(pt[0]), Number(pt[1])]);
  const numifyPoly = (poly) => poly.map(numifyRing); // Array<Ring>

  const features = [];

  for (const r of raw) {
    let geom;
    try {
      geom = JSON.parse(r.geoJson); // { type: 'Polygon'|'MultiPolygon', coordinates: ... }
    } catch {
      continue;
    }
    if (!geom || !geom.coordinates) continue;

    const props = {
      regionName: r.regionName,
      percent: r.dirtySurfaceWaterPercent,
    };

    if (geom.type === 'Polygon') {
      features.push({
        type: 'Feature',
        id: `${r.regionId}`,
        geometry: { type: 'Polygon', coordinates: numifyPoly(geom.coordinates) },
        properties: props,
      });
    } else if (geom.type === 'MultiPolygon') {
      // разворачиваем каждый полигон в отдельный Feature
      geom.coordinates.forEach((polyCoords, idx) => {
        features.push({
          type: 'Feature',
          id: `${r.regionId}-${idx}`,
          geometry: { type: 'Polygon', coordinates: numifyPoly(polyCoords) },
          properties: props,
        });
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

function percentToColor(p) {
  const clamped = Math.max(0, Math.min(100, Number(p) || 0));
  const t = clamped / 100; // 0..1
  const r = Math.round(255 * t);
  const g = Math.round(200 * (1 - t));
  const b = 60;
  const a = 0.6; // прозрачность заливки
  return `rgba(${r},${g},${b},${a})`;
}

// Плейсхолдеры для будущих типов (если будешь использовать позже)
const adaptors = {
  points: (raw) =>
    (Array.isArray(raw) ? raw : []).map((p) => ({
      id: p.id ?? `${p.lon},${p.lat}`,
      coords: [p.lon, p.lat],
      props: { name: p.name ?? '', description: p.description ?? '' },
    })),
  heatmap: (raw) => (Array.isArray(raw) ? raw : []).map((p) => [p.lon, p.lat, p.weight ?? 1]),
};

// ✅ Подкорректированный meta: для air используем adaptAirPoints
const LAYER_META = {
  air: { mode: 'points', adapt: adaptAirPoints }, // <— ВАЖНО
  radiation: { mode: 'points', adapt: adaptRadiationPoints },
  water: { mode: 'choropleth', adapt: adaptWaterChoropleth },
  soil: { mode: 'heatmap', adapt: adaptors.heatmap },
  'cleanup-events': { mode: 'points', adapt: adaptors.points },
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
  const waterLayerRef = useRef(null); // хранит geoQuery результата для воды

  /* Функция очистки водного слоя */
  const clearWaterLayer = () => {
    const layer = waterLayerRef.current;
    if (!layer) return;

    try {
      // новый формат: { result, map }
      if (layer.result && typeof layer.result.removeFromMap === 'function') {
        // safer: передаём карту, если есть
        if (layer.map) {
          layer.result.removeFromMap(layer.map);
        } else {
          layer.result.removeFromMap();
        }
      }
      // старый формат (на всякий случай): GeoQueryResult напрямую
      else if (typeof layer.removeFromMap === 'function') {
        const map = mapRef.current || undefined;
        try {
          // пробуем с картой; если вдруг упрёмся в WeakMap — повторим без карты
          layer.removeFromMap(map);
        } catch (e) {
          layer.removeFromMap();
        }
      }
      // аварийный план: вручную удалить объекты
      else if (layer.each && mapRef.current?.geoObjects) {
        layer.each((obj) => {
          try {
            mapRef.current.geoObjects.remove(obj);
          } catch {}
        });
      }
    } catch (e) {
      console.warn('clearWaterLayer error:', e);
    } finally {
      waterLayerRef.current = null;
    }
  };

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
      clearWaterLayer();
      return;
    }

    const type = FILTER_TYPE_BY_ID[activeFilter.id];
    const meta = LAYER_META[type];
    if (!type || !meta) {
      setPointsFC(null);
      clearWaterLayer();
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
          clearWaterLayer();
          return;
        }

        // CHOROPLETH — строим FC и рисуем полигоны
        if (meta.mode === 'choropleth') {
          const fc = meta.adapt(raw); // FeatureCollection с Polygon/MultiPolygon
          console.log('WATER FC stats:', {
            features: fc.features.length,
            samples: fc.features.slice(0, 1),
          });

          // 🛡️ гард от пустых/кривых данных
          if (!fc || !Array.isArray(fc.features) || fc.features.length === 0) {
            clearWaterLayer();
            setPointsFC(null);
            return;
          }

          const ymaps = window.ymaps;
          if (!ymaps || !mapRef.current) return;

          // снести прежний слой, если был
          clearWaterLayer();

          const qAll = ymaps.geoQuery(fc);
          const polygons = qAll.search('geometry.type="Polygon"').addToMap(mapRef.current);

          polygons.each((obj) => {
            const p = obj.properties.get('percent');
            obj.options.set({
              fillColor: percentToColor(p),
              strokeColor: '#ffffff',
              strokeOpacity: 0.9,
              strokeWidth: 1,
            });
            obj.properties.set(
              'hintContent',
              `${obj.properties.get('regionName')} • Загрязнение: ${p}%`,
            );
          });

          // вместо waterLayerRef.current = polygons;
          waterLayerRef.current = { result: polygons, map: mapRef.current };

          // точки скрываем
          setPointsFC(null);
          return;
        }

        // другие режимы (heatmap для soil — оставим на потом)
        setPointsFC(null);
        clearWaterLayer();
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          console.error('Ошибка загрузки слоя:', err?.response?.data || err.message);
        }
        setPointsFC(null);
        clearWaterLayer();
      }
    })();

    return () => controller.abort();
  }, [activeFilter, isLoggedIn]);

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
