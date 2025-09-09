import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFilter, selectActiveFilter } from '../../store/filter-slice';
import FilterMenuOption from './FilterMenuOption';

const filters = [
  { filterId: 0, label: 'Загрязнение воздуха' },
  { filterId: 1, label: 'Уровень радиации' },
  { filterId: 2, label: 'Загрязнение воды' },
  { filterId: 3, label: 'Загрязнение почвы' },
  { filterId: 4, label: 'Экологические инициативы' },
];

function MapFilterMenu() {
  const dispatch = useDispatch();
  const active = useSelector(selectActiveFilter); // null или { id, label }

  const filterToggleHandler = useCallback(
    (id, label) => {
      const isSame = active?.id === id;
      dispatch(setFilter(isSame ? null : { id, label }));
      // при желании — тут же можно триггерить загрузку/перерисовку карты
    },
    [dispatch, active],
  );

  return (
    <div className="filters-menu">
      <ul className="filters-menu__list">
        {filters.map((el) => (
          <FilterMenuOption
            key={el.filterId}
            filterId={el.filterId}
            label={el.label}
            isSelected={active?.id === el.filterId}
            onToggle={filterToggleHandler}
          />
        ))}
      </ul>
    </div>
  );
}

export default MapFilterMenu;
