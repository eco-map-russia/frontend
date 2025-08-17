import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';

import ecoIllustration from '../assets/images/eco-illustration.png';
import tBankLogo from '../assets/images/T-bank-logo.svg';

function LoginPage() {
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

          <form className="login-form">
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
            <div className="form-group checkbox-group">
              <input className="form-group__input" type="checkbox" id="remember" name="remember" />
              <label htmlFor="remember">Запомнить меня</label>
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
