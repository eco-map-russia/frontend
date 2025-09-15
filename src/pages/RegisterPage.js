import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
import { register, reset } from '../store/user-register-slice';

import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';

import tBankLogo from '../assets/images/T-bank-logo.svg';

function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((s) => s.register); // <- имя слайса в store
  const redirectTimerRef = useRef(null);

  // Чистим старое состояние при маунте и анмаунте
  useEffect(() => {
    dispatch(reset());
    return () => dispatch(reset());
  }, [dispatch]);

  // На успешную регистрацию — показываем сообщение и через 2с уходим на /login
  useEffect(() => {
    if (status === 'succeeded') {
      redirectTimerRef.current = setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [status, navigate]);

  const formSubmitHandler = (event) => {
    event.preventDefault();

    // на новую попытку уберём старые ошибки/сообщения
    dispatch(reset());

    const fd = new FormData(event.currentTarget);
    const data = {
      firstName: fd.get('firstName'),
      lastName: fd.get('lastName'),
      phone: fd.get('phone'),
      email: fd.get('email'),
      password: fd.get('password'),
    };

    dispatch(register(data));
    // ВАЖНО: форму не чистим сразу, чтобы пользователь видел, что отправил
    // При успешной регистрации нас всё равно перебросит на /login
  };

  const isLoading = status === 'loading';
  const isSuccess = status === 'succeeded';
  const isError = status === 'failed';

  return (
    <PageWrapper>
      <main className="login-main">
        <div className="login-form-block">
          <div className="bank-logo">
            <img src={tBankLogo} alt="T Банк" />
            <span className="bank-name">БАНК</span>
          </div>

          <form className="login-form" onSubmit={formSubmitHandler}>
            <div className="form-group">
              <label htmlFor="firstName">Имя</label>
              <input
                className="form-group__input"
                type="text"
                id="firstName"
                name="firstName"
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
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Номер телефона</label>
              <input className="form-group__input" type="tel" id="phone" name="phone" required />
            </div>
            <div className="form-group">
              <label htmlFor="email">Электронная почта</label>
              <input className="form-group__input" type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="password">Придумайте пароль</label>
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
                {`Ошибка регистрации: ${error}` || 'Ошибка регистрации'}
              </p>
            )}

            {isSuccess && (
              <p className="form-message form-message--success" role="status">
                Регистрация успешна!
              </p>
            )}
            {/*
            <div className="form-group checkbox-group">
              <input type="checkbox" id="accept" name="accept" />
              <label htmlFor="accept">
                Согласен с&nbsp;
                <a href="/rules" className="rules-link">
                  правилами пользования сервисом
                </a>
              </label>
            </div>
            */}
            <div className="register-link">
              <span>У вас уже есть аккаунт? </span>
              <Link to="/login">Войти</Link>
            </div>
            <button type="submit" className="login-btn" disabled={isLoading}>
              {isLoading ? 'Отправляем…' : 'Зарегистрироваться'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}

export default RegisterPage;
