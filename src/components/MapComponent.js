import { YMaps, Map } from '@pbe/react-yandex-maps';

function MapComponent(props) {
  return (
    <YMaps>
      <div>
        My awesome application with maps!
        <Map defaultState={{ center: [55.75, 37.57], zoom: 9 }} width="100%" height="400px" />
      </div>
    </YMaps>
  );
}

export default MapComponent;
