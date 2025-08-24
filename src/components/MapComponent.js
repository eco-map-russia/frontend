import { useEffect, useRef } from 'react';
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
  const dispatch = useDispatch();
  const { items: regions, status, error } = useSelector((s) => s.regions);
  const { isLoggedIn } = useSelector((s) => s.auth); // чтобы не дергать до логина

  const mapRef = useRef(null);

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
      const target = [lat, lon];
      // Мягкое перемещение, затем — зум
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
    <YMaps query={{ apikey: config.YANDEX_MAP_API_KEY }}>
      <div className="map-container">
        <Map
          defaultState={{ center: [55.75, 37.57], zoom: 9 }}
          width="100%"
          height="100svh"
          options={{
            minZoom: 3, // дальше отдалять нельзя
            maxZoom: 18, // дальше приближать нельзя
            avoidFractionalZoom: true, // (по умолчанию на десктопе) без дробных зумов
            restrictMapArea: [
              [-85.0, -179.99],
              [85.0, 179.99],
            ],
          }}
          instanceRef={mapRef}
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
