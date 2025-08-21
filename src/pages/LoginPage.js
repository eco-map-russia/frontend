import { useDispatch } from 'react-redux';
import { userAuthActions } from '../store/user-auth-slice';

import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';

import ecoIllustration from '../assets/images/eco-illustration.png';
import tBankLogo from '../assets/images/T-bank-logo.svg';

function LoginPage() {
  const dispatch = useDispatch();

  const formSubmitHandler = (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    console.log(data); // { email: "...", password: "..." }

    dispatch(userAuthActions.submitLogin(data));

    // очистить форму
    event.currentTarget.reset();
  };
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
            <button type="submit" className="login-btn">
              Войти
            </button>
            <div className="register-link">
              <span>У вас ещё нет аккаунта? </span>
              <a href="/register">Создать аккаунт</a>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}

export default LoginPage;
