import { useCallback, memo } from 'react';

function FilterMenuOption({ filterId, label, isSelected, onToggle }) {
  // Мемоизируем локальный обработчик, чтобы не создавать новую функцию на каждый рендер
  const optionClickHandler = useCallback(() => {
    onToggle(filterId, label);
  }, [onToggle, filterId, label]);

  return (
    <li
      className={`filters-menu__item${isSelected ? ' selected' : ''}`}
      onClick={optionClickHandler}
    >
      {label}
    </li>
  );
}

export default memo(FilterMenuOption);
