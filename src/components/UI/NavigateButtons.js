import NavigateButton from './NavigateButton';

import ZoomToUserButton from '../../assets/images/sidebarIcons/Zoom-To-User-Button.svg';
import ZoomInButton from '../../assets/images/sidebarIcons/Zoom-in.svg';
import ZoomOutButton from '../../assets/images/sidebarIcons/Zoom-out.svg';

function NavigateButtons() {
  return (
    <nav className="navigate__buttons">
      <NavigateButton icon={ZoomToUserButton} />
      <NavigateButton icon={ZoomInButton} />
      <NavigateButton icon={ZoomOutButton} />
    </nav>
  );
}

export default NavigateButtons;
