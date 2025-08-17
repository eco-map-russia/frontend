import { useRef } from 'react';
import { YMaps, Map } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

import MapSearchBar from './UI/MapSearchBar';
import MapFilter from './UI/MapFilter';
import SideBar from './UI/SideBar';
import NavigateButtons from './UI/NavigateButtons';
import MapCalendar from './UI/MapCalendar';

function MapComponent() {
  const mapRef = useRef(null);

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
    if (!map) return;
    // Здесь можно использовать Geolocation API для получения текущих координат пользователя
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = [position.coords.latitude, position.coords.longitude];
      map.setCenter(coords, 15, { duration: 300 }); // центрируем карту на текущем местоположении
    });
  };

  return (
    <YMaps query={{ apikey: config.YANDEX_MAP_API_KEY }}>
      <div className="map-container">
        <Map
          defaultState={{ center: [55.75, 37.57], zoom: 9 }}
          width="100%"
          height="100svh"
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
