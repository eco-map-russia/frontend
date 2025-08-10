import MapSearchBarIcon from '../../assets/images/sidebarIcons/map-search-bar-icon.svg';

function MapSearchBar() {
  return (
    <div className="map-search-bar">
      <input className="map-search-bar__input" type="text" placeholder="Поиск" />
      <button className="map-search-bar__button" type="submit">
        <img src={MapSearchBarIcon} alt="Поиск" />
      </button>
    </div>
  );
}

export default MapSearchBar;
