import AdminPanelIcon from '../../assets/images/sidebarIcons/Admin-panel-icon.svg';

function MapFilterButton(props) {
  return (
    <button className="map-filter-button" onClick={props.onClickAdminPanelButton}>
      <img src={AdminPanelIcon} alt="Admin Icon" />
    </button>
  );
}

export default MapFilterButton;
