import { YMaps, Map } from '@pbe/react-yandex-maps';
import config from '../config/config.json';

function MapComponent(props) {
  const mapClickHandler = (e) => {
    const coords = e.get('coords');
    console.log('Map clicked at coordinates:', coords);
  };
  return (
    <YMaps query={{ apikey: config.YANDEX_MAP_API_KEY }}>
      <div className="map-container">
        My awesome application with maps!
        <Map
          defaultState={{ center: [55.75, 37.57], zoom: 9 }}
          width="100%"
          height="400px"
          onClick={(e) => mapClickHandler(e)}
        />
        <div className="cover-div">
          <p>Новый блок.</p>
        </div>
      </div>
    </YMaps>
  );
}

export default MapComponent;
