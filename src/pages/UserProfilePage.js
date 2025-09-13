import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom'; // переход на карту

import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';
import tBankLogo from '../assets/images/T-bank-logo.svg';

import { fetchProfile, selectProfile, updateProfile } from '../store/user-profile-slice';

function UserProfilePage() {
  const dispatch = useDispatch();
  const { user, status, error, updateStatus, updateError } = useSelector(selectProfile); // <-- берём user из среза

  const [isEdit, setIsEdit] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [justUpdated, setJustUpdated] = useState(false);

  // Подгружаем профиль при первом заходе
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProfile());
    }
  }, [status, dispatch]);

  // Когда профиль загрузился — заполняем локальные поля
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateProfile({ firstName, lastName, phone })).unwrap();
      setIsEdit(false);
      setJustUpdated(true);
      setTimeout(() => setJustUpdated(false), 3500);
    } catch (_) {
      // ошибка уже есть в updateError, можем дополнительно подсветить кнопку и т.п.
    }
  };

  return (
    <PageWrapper>
      <Link to="/map" className="login-btn back-btn-fixed" aria-label="Вернуться на карту">
        На карту
      </Link>

      <main className="login-main">
        <div className="login-form-block">
          <div className="bank-logo">
            <img src={tBankLogo} alt="T Банк" />
            <span className="bank-name">БАНК</span>
          </div>

          {status === 'loading' && <div className="user-info-block">Загрузка профиля…</div>}
          {status === 'failed' && (
            <div className="user-info-block" role="alert">
              Не удалось загрузить профиль{error ? `: ${String(error)}` : ''}.
            </div>
          )}

          {/* Просмотр */}
          {status === 'succeeded' && !isEdit && (
            <>
              <div className="user-info-block">
                <div className="user-fullname">
                  {user?.firstName || 'Имя'} {user?.lastName || 'Фамилия'}
                </div>
                <div className="user-phone">{user?.phone || '—'}</div>
              </div>

              {justUpdated && <div className="profile-success">Данные успешно обновлены!</div>}

              <button type="button" className="login-btn" onClick={() => setIsEdit(true)}>
                Обновить данные
              </button>
            </>
          )}

          {/* Редактирование */}
          {status === 'succeeded' && isEdit && (
            <form className="login-form" onSubmit={submitHandler}>
              <div className="form-group">
                <label htmlFor="firstName">Имя</label>
                <input
                  className="form-group__input"
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Фамилия</label>
                <input
                  className="form-group__input"
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Номер телефона</label>
                <input
                  className="form-group__input"
                  type="tel"
                  id="phone"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              {updateStatus === 'failed' && (
                <div className="profile-error" role="alert">
                  {typeof updateError === 'string' ? updateError : 'Ошибка обновления профиля'}
                </div>
              )}

              <button
                type="submit"
                className="login-btn"
                disabled={updateStatus === 'loading'}
                aria-busy={updateStatus === 'loading'}
              >
                {updateStatus === 'loading' ? 'Сохраняем…' : 'Отправить'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}

export default UserProfilePage;
