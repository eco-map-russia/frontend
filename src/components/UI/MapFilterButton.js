import FilterButtonIcon from '../../assets/images/sidebarIcons/Filter-button-icon.svg';

function MapFilterButton(props) {
  return (
    <button className="map-filter-button" onClick={props.onClickFilterButton}>
      <img src={FilterButtonIcon} alt="Filter Icon" />
    </button>
  );
}

export default MapFilterButton;
