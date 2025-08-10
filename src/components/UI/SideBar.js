import tBankLogo from '../../assets/images/T-bank-sidebar-logo.svg';
import analyticsIcon from '../../assets/images/sidebarIcons/Analytics_1.svg';
import inboxIcon from '../../assets/images/sidebarIcons/Inbox_2.svg';
import calendarIcon from '../../assets/images/sidebarIcons/Calendar_3.svg';
import reportsIcon from '../../assets/images/sidebarIcons/Reports_4.svg';
import helpCircleIcon from '../../assets/images/sidebarIcons/Help-Circle_5.svg';
import logOutIcon from '../../assets/images/sidebarIcons/Log-out_6.svg';

function Sidebar() {
  return (
    <div className="sidebar sidebar--open">
      {/* Верхний блок: логотип и кнопка-стрелка */}
      <div className="sidebar__top">
        <div className="sidebar__logo">
          <img src={tBankLogo} alt="T Банк" />
        </div>
        <button className="sidebar__toggle">
          <div className="sidebar__toggle__arrow" />
        </button>
      </div>

      {/* Основные кнопки-иконки */}
      <nav className="sidebar__menu">
        <button className="sidebar__btn">
          <img src={analyticsIcon} alt="T Банк" />
        </button>
        <button className="sidebar__btn">
          <img src={inboxIcon} alt="T Банк" />
        </button>
        <button className="sidebar__btn">
          <img src={calendarIcon} alt="T Банк" />
        </button>
        <button className="sidebar__btn">
          <img src={reportsIcon} alt="T Банк" />
        </button>
      </nav>

      {/* Пустое пространство для выравнивания нижних иконок */}
      <div className="sidebar__spacer" style={{ flexGrow: 1 }} />

      {/* Нижние иконки */}
      <div className="sidebar__bottom">
        <button className="sidebar__btn">
          <img src={helpCircleIcon} alt="T Банк" />
        </button>
        <button className="sidebar__btn sidebar__btn--exit">
          <img src={logOutIcon} alt="T Банк" />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
