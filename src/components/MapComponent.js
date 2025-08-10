import { YMaps, Map } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

import MapSearchBar from './UI/MapSearchBar';
import MapFilter from './UI/MapFilter';
import SideBar from './UI/SideBar';
import NavigateButtons from './UI/NavigateButtons';

function MapComponent() {
  const mapClickHandler = (e) => {
    const coords = e.get('coords');
    console.log('Map clicked at coordinates:', coords);
  };
  return (
    <YMaps query={{ apikey: config.YANDEX_MAP_API_KEY }}>
      <div className="map-container">
        <Map
          defaultState={{ center: [55.75, 37.57], zoom: 9 }}
          width="100%"
          height="100svh"
          onClick={(e) => mapClickHandler(e)}
        />
        <div className="cover-div">
          <p>Новый блок.</p>
        </div>
      </div>
      <MapSearchBar />
      <MapFilter />
      <SideBar />
      <NavigateButtons />
    </YMaps>
  );
}

export default MapComponent;
