import PageWrapper from '../layout/PageWrapper';
import Footer from '../components/Footer';

import tBankLogo from '../assets/images/T-bank-logo.svg';

function RegisterPage() {
  return (
    <PageWrapper>
      <main className="login-main">
        <div className="login-form-block">
          <div className="bank-logo">
            <img src={tBankLogo} alt="T Банк" />
            <span className="bank-name">БАНК</span>
          </div>

          <form className="login-form">
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
            <div className="form-group checkbox-group">
              <input type="checkbox" id="accept" name="accept" />
              <label htmlFor="accept">
                Согласен с&nbsp;
                <a href="/rules" className="rules-link">
                  правилами пользования сервисом
                </a>
              </label>
            </div>
            <div className="register-link">
              <span>У вас уже есть аккаунт? </span>
              <a href="/login">Войти</a>
            </div>
            <button type="submit" className="login-btn">
              Зарегистрироваться
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </PageWrapper>
  );
}

export default RegisterPage;
