import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

import { fetchRegions } from '../store/regions-slice'; // импорт thunk

import MapSearchBar from './UI/MapSearchBar';
import MapFilter from './UI/MapFilter';
import SideBar from './UI/SideBar';
import NavigateButtons from './UI/NavigateButtons';
import MapCalendar from './UI/MapCalendar';

function MapComponent() {
  const [mapReady, setMapReady] = useState(false);
  const dispatch = useDispatch();
  const { items: regions, status, error } = useSelector((s) => s.regions);
  const { isLoggedIn } = useSelector((s) => s.auth); // чтобы не дергать до логина

  const mapRef = useRef(null);
  const polylabelerRef = useRef(null);

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

  /* ========================= Обработчики событий ========================= */

  const mapClickHandler = (e) => {
    const coords = e.get('coords');
    console.log('Map clicked at coordinates:', coords);
  };

  const handleDateChange = (date) => {
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
          defaultState={{ center: [37.57, 55.75], zoom: 4, controls: [] }} // [lon, lat]
          width="100%"
          height="100svh"
          options={{
            minZoom: 3, // дальше отдалять нельзя
            maxZoom: 18, // дальше приближать нельзя
            avoidFractionalZoom: true, // (по умолчанию на десктопе) без дробных зумов
            restrictMapArea: [
              [-179.99, -85.0], // [lon, lat]
              [179.99, 85.0],
            ],
          }}
          instanceRef={(m) => {
            mapRef.current = m;
            setMapReady(true);
          }}
          onClick={(e) => mapClickHandler(e)}
        />
      </div>
      <MapSearchBar />
      <MapFilter />
      <SideBar />
      <NavigateButtons
        onZoomToUser={zoomToUserHandler}
        onZoomIn={zoomInHandler}
        onZoomOut={zoomOutHandler}
      />
      <MapCalendar onDateChange={handleDateChange} />
    </YMaps>
  );
}

export default MapComponent;
