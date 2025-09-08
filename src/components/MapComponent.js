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

function adaptAirPoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => ({
    id: p.pointId,
    coords: [p.CoordinatesResponseDto.lon, p.CoordinatesResponseDto.lat], // [lon, lat]
    props: {
      hintContent: `${p.pointName} • AQI: ${p.europeanAqi}`,
      balloonContent: `
        <div style="font-size:13px;">
          <b>${p.pointName}</b><br/>
          PM2.5: ${p.pm25} • PM10: ${p.pm10}<br/>
          NO₂: ${p.nitrogenDioxide} • SO₂: ${p.sulphurDioxide}<br/>
          O₃: ${p.ozone} • CO₂: ${p.carbonDioxide}
        </div>
      `,
    },
  }));
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
  radiation: { mode: 'points', adapt: adaptors.points },
  water: { mode: 'heatmap', adapt: adaptors.heatmap },
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
  const [airFC, setAirFC] = useState(null);
  const dispatch = useDispatch();
  const { items: regions, status, error } = useSelector((s) => s.regions);
  const activeFilter = useSelector(selectActiveFilter);
  const { isLoggedIn } = useSelector((s) => s.auth); // чтобы не дергать до логина

  const mapRef = useRef(null);
  const polylabelerRef = useRef(null);
  // const didMountRef = useRef(false); // Чтобы не сработал useEffect при первом рендере
  const omRef = useRef(null); // ObjectManager для точек

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

  // + эффект: при выборе фильтра — тянем данные и логируем
  useEffect(() => {
    // если фильтра нет или не залогинены — очищаем слой
    if (!activeFilter || !isLoggedIn) {
      setAirFC(null);
      return;
    }

    const type = FILTER_TYPE_BY_ID[activeFilter.id];
    const meta = LAYER_META[type];

    // нет меты — очищаем слой
    if (!type || !meta) {
      console.warn('Нет сопоставления id→type или меты для фильтра:', activeFilter);
      setAirFC(null);
      return;
    }

    // рисуем сейчас только air; на других фильтрах очищаем точки
    if (type !== 'air') {
      setAirFC(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        console.log(`[layer] GET /api/v1/map/layer/${type} (mode=${meta.mode})`);
        const { data: raw } = await http.get(`/map/layer/${encodeURIComponent(type)}`, {
          signal: controller.signal,
        });

        const normalized = meta.adapt ? meta.adapt(raw) : raw;

        // Отладка — по желанию:
        console.log('[layer] RAW:', raw);
        console.log('[layer] NORMALIZED count:', Array.isArray(normalized) ? normalized.length : 0);

        // Кладём в стейт в формате для ObjectManager
        setAirFC(toFeatureCollection(normalized));
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        console.error('Ошибка загрузки слоя:', err?.response?.data || err.message);
        setAirFC(null);
      }
    })();

    return () => controller.abort();
  }, [activeFilter, isLoggedIn]);

  useEffect(() => {
    if (!omRef.current) return;

    const onObjectClick = (e) => {
      const objectId = e.get('objectId');
      const geoObj = omRef.current.objects.getById(objectId);
      console.log('Клик по точке:', geoObj?.properties);
      // здесь можно открыть сайдбар / показать карточку
    };

    omRef.current.objects.events.add('click', onObjectClick);
    return () => omRef.current?.objects.events.remove('click', onObjectClick);
  }, [omRef.current]);

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
          {airFC && (
            <ObjectManager
              instanceRef={omRef}
              features={airFC}
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
