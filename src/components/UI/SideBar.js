import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProfile } from '../../store/user-profile-slice';

import tBankLogo from '../../assets/images/T-bank-sidebar-logo.svg';
import analyticsIcon from '../../assets/images/sidebarIcons/Analytics_1.svg';
import inboxIcon from '../../assets/images/sidebarIcons/Inbox_2.svg';
import calendarIcon from '../../assets/images/sidebarIcons/Calendar_3.svg';
import reportsIcon from '../../assets/images/sidebarIcons/Reports_4.svg';
import helpCircleIcon from '../../assets/images/sidebarIcons/Help-Circle_5.svg';
import logOutIcon from '../../assets/images/sidebarIcons/Log-out_6.svg';

function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();
  const { user, status } = useSelector((s) => s.profile);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProfile());
    }
  }, [status, dispatch]);

  const fullName = user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : '';

  return (
    <div className={`sidebar-container ${expanded ? 'is-expanded' : ''}`}>
      <aside className={`sidebar ${expanded ? 'sidebar--expanded' : 'sidebar--collapsed'}`}>
        {/* Верхний блок: логотип и кнопка-стрелка */}
        <div className="sidebar__top">
          <div className="sidebar__logo">
            <img src={tBankLogo} alt="T Банк" />
          </div>
          {/* Имя пользователя (видно только в развернутом) */}
          <div className="sidebar__user">
            <div className="sidebar__user-name">
              <a href="/login">{status === 'loading' ? '' : fullName || '—'}</a>
            </div>
          </div>

          <button
            className="sidebar__toggle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Свернуть меню' : 'Развернуть меню'}
          >
            <div className="sidebar__toggle__arrow" />
          </button>
        </div>

        <div className="sidebar__divider" />

        {/* Основные кнопки-иконки */}
        <nav className="sidebar__menu">
          <button className="sidebar__btn">
            <img className="sidebar__icon" src={analyticsIcon} alt="T Банк" />
            <span className="sidebar__label">Личный кабинет</span>
          </button>
          <button className="sidebar__btn">
            <img className="sidebar__icon" src={inboxIcon} alt="T Банк" />
            <span className="sidebar__label">Избранные регионы</span>
            <span className="sidebar__caret" aria-hidden="true">
              ▾
            </span>
          </button>
          <button className="sidebar__btn">
            <img className="sidebar__icon" src={calendarIcon} alt="T Банк" />
            <span className="sidebar__label">О нас</span>
          </button>
          <button className="sidebar__btn">
            <img className="sidebar__icon" src={reportsIcon} alt="T Банк" />
            <span className="sidebar__label">Настройки</span>
          </button>
        </nav>

        {/* Пустое пространство для выравнивания нижних иконок */}
        <div className="sidebar__spacer" style={{ flexGrow: 1 }} />

        {/* Нижние иконки */}
        <div className="sidebar__bottom">
          <button className="sidebar__btn">
            <img className="sidebar__icon" src={helpCircleIcon} alt="T Банк" />
            <span className="sidebar__label">Помощь</span>
          </button>
          <button className="sidebar__btn sidebar__btn--exit">
            <img className="sidebar__icon" src={logOutIcon} alt="T Банк" />
            <span className="sidebar__label">Выйти</span>
          </button>
        </div>
      </aside>
    </div>
  );
}

export default Sidebar;
