import { useState } from 'react';

import MapFilterButton from './MapFilterButton';
import MapFilterMenu from './MapFilterMenu';

function MapFilter() {
  const [openMenu, setOpenMenu] = useState(false);
  return (
    <div className={`map-filter ${openMenu ? 'open' : ''}`}>
      <MapFilterButton onClickFilterButton={() => setOpenMenu(!openMenu)} />
      <MapFilterMenu />
    </div>
  );
}

export default MapFilter;
