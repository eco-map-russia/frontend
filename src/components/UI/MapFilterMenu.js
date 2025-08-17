import { useState, useCallback } from 'react';
import FilterMenuOption from './FilterMenuOption';

const filters = [
  { filterId: 0, label: 'Загрязнение воздуха' },
  { filterId: 1, label: 'Уровень радиации' },
  { filterId: 2, label: 'Вредные выбросы' },
  { filterId: 3, label: 'Заповедники' },
  { filterId: 4, label: 'Экологические инициативы' },
];

function MapFilterMenu() {
  const [selectedId, setSelectedId] = useState(null);

  const filterToggleHandler = useCallback((id, label) => {
    console.log(`Выбран фильтр "${label}" с ID: ${id}`);
    setSelectedId((prev) => (prev === id ? null : id));
    // тут можно диспатчить Redux, менять локальный state и т.п.
  }, []); // если внутри будет использоваться state/props — добавь их в зависимости

  return (
    <div className="filters-menu">
      <ul className="filters-menu__list">
        {filters.map((el) => (
          <FilterMenuOption
            key={el.filterId}
            filterId={el.filterId}
            label={el.label}
            isSelected={selectedId === el.filterId}
            onToggle={filterToggleHandler}
          />
        ))}
      </ul>
    </div>
  );
}

export default MapFilterMenu;
