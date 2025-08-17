import NavigateButton from './NavigateButton';

import ZoomToUserButton from '../../assets/images/sidebarIcons/Zoom-To-User-Button.svg';
import ZoomInButton from '../../assets/images/sidebarIcons/Zoom-in.svg';
import ZoomOutButton from '../../assets/images/sidebarIcons/Zoom-out.svg';

function NavigateButtons(props) {
  return (
    <nav className="navigate__buttons">
      <NavigateButton icon={ZoomToUserButton} onClick={props.onZoomToUser} />
      <NavigateButton icon={ZoomInButton} onClick={props.onZoomIn} />
      <NavigateButton icon={ZoomOutButton} onClick={props.onZoomOut} />
    </nav>
  );
}

export default NavigateButtons;
