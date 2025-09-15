import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { login, reset as resetAuth } from '../store/user-auth-slice';

import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';

import ecoIllustration from '../assets/images/eco-illustration.png';
import tBankLogo from '../assets/images/T-bank-logo.svg';

function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, isLoggedIn } = useSelector((s) => s.auth); // <- ключ в store = "auth"
  const redirectTimerRef = useRef(null);

  // Очистим старые ошибки/статус при открытии и при уходе со страницы
  useEffect(() => {
    dispatch(resetAuth());
    return () => dispatch(resetAuth());
  }, [dispatch]);

  // Если уже залогинен (например, пришли на /login вручную) — сразу на карту
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/map', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  // На успешный логин — показать сообщение и через 2с перейти на /map
  useEffect(() => {
    if (status === 'succeeded') {
      redirectTimerRef.current = setTimeout(() => navigate('/map'), 2000);
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [status, navigate]);

  const formSubmitHandler = (event) => {
    event.preventDefault();

    // На новую попытку — уберём старые ошибки/сообщения
    dispatch(resetAuth());

    const formData = new FormData(event.currentTarget);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    dispatch(login(data)); // ← уходит POST /api/v1/auth/login
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'succeeded';
  const isError = status === 'failed';

  return (
    <PageWrapper>
      <main className="login-main">
        <div className="loginPage-img">
          <img src={ecoIllustration} alt="Экологическая иллюстрация" />
        </div>
        <div className="login-form-block">
          <div className="bank-logo">
            <img src={tBankLogo} alt="T Банк" />
            <span className="bank-name">БАНК</span>
          </div>

          <form className="login-form" onSubmit={formSubmitHandler}>
            <h2 className="form-title">Вход в ваш аккаунт</h2>
            <div className="form-group">
              <label htmlFor="email">Введите свой Email</label>
              <input className="form-group__input" type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Введите свой пароль</label>
              <input
                className="form-group__input"
                type="password"
                id="password"
                name="password"
                required
              />
            </div>

            {/* Сообщения состояния */}
            {isError && (
              <p className="form-message form-message--error" role="alert">
                {error || 'Ошибка авторизации'}
              </p>
            )}

            {isSuccess && (
              <p className="form-message form-message--success" role="status">
                Успешный вход! Сейчас перенаправим на карту…
              </p>
            )}
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'Отправляем…' : 'Войти'}
            </button>
            <div className="register-link">
              <span>У вас ещё нет аккаунта? </span>
              <Link to="/register">Создать аккаунт</Link>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}

export default LoginPage;
