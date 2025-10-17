import {check_auth} from "./app.js";

let mail = ""
check_auth(document.getElementsByClassName("account-container")[0])

function register(container) {
  let tab = document.createElement("form");
  tab.className = "tab";
  tab.id = "register"
  container.appendChild(tab);
  tab.innerHTML = `
  <div class="form-row">
    <label for="nickname">Имя: </label>
    <div class="error-message name">Поле не может быть пустым</div>
    <input name="nickname" maxlength="27">
  </div>

  <div class="form-row">
    <label for="email">Почта: </label>
    <div class="error-message email">Поле не может быть пустым</div>
    <input type="email" name="email" maxlength="300">
  </div>

  <div class="form-row spacer">
    <label for="image">Аватар: </label>
    <div class="error-message">Поле не может быть пустым</div>
    <input type="url" name="image">
  </div>

  <div class="form-row spacer">
    <label for="password">Пароль: </label>
    <div class="error-message password">Поле не может быть пустым</div>
    <input type="password" name="password" minlength="6" maxlength="30">
  </div>
  <div class="form-row">
    <label for="password-repeat">Повторите\nпароль: </label>
    <div class="error-message password-repeat">Поле не может быть пустым</div>
    <input type="password" name="password-repeat" minlength="6" maxlength="30">
  </div>
  <button type="submit" class="submit">Зарегистрироваться</button>
  `
  tab.addEventListener('submit', function(e) {
    e.preventDefault();
    let isValid = true;

    const nickname = document.getElementsByName('nickname')[0].value;
    const nicknameError = tab.getElementsByClassName('error-message name')[0];
    if (nickname.trim() === ''){
      isValid = false;
      nicknameError.innerText = "Поле не может быть пустым"
      nicknameError.style.display = "block";
    }
    else if (nickname.trim().length < 2 || nickname.trim().length > 27) {
      isValid = false;
      nicknameError.innerText = "Имя должно содержать от 2 до 27 символов"
      nicknameError.style.display = "block";
    }
    else {
      nicknameError.style.display = "none";
    }

    const email = document.getElementsByName('email')[1].value;
    const emailError = tab.getElementsByClassName('error-message email')[0];
    if (email.trim() === ''){
      isValid = false;
      emailError.innerText = "Поле не может быть пустым"
      emailError.style.display = "block";
    }
    else {
      emailError.style.display = "none";
    }

    const password = document.getElementsByName('password')[1].value;
    const passwordError = tab.getElementsByClassName('error-message password')[0];
    if (password.trim() === ''){
      isValid = false;
      passwordError.innerText = "Поле не может быть пустым"
      passwordError.style.display = "block";
    }
    else if (password.trim().length < 6 || password.trim().length > 30) {
      isValid = false;
      passwordError.innerText = "Пароль должен содержать от 6 до 30 символов"
      passwordError.style.display = "block";
    }
    else {
      passwordError.style.display = "none";
    }

    const passwordRepeat = document.getElementsByName('password-repeat')[0].value;
    const passwordRepeatError = tab.getElementsByClassName('error-message password-repeat')[0];
    if (passwordRepeat.trim() === ''){
      isValid = false;
      passwordRepeatError.innerText = "Поле не может быть пустым"
      passwordRepeatError.style.display = "block";
    }
    else if (passwordRepeat.trim() !== password.trim()) {
      isValid = false;
      passwordRepeatError.innerText = "Пароли не совпадают"
      passwordRepeatError.style.display = "block";
    }
    else {
      passwordRepeatError.style.display = "none";
    }

    const image = document.getElementsByName('image')[0].value;
    if (isValid){
      getEmailCode(container, nickname.trim(), email.trim(), image.trim(), password.trim()).then(response => {
        if (response.status === 409) {
          emailError.innerText = "Аккаунт с такой почтой уже зарегистрирован"
          emailError.style.display = "block";
        }
        else if (response.status === 400) {
          emailError.innerText = "Неверный формат почты"
          emailError.style.display = "block";
        }
        else {
          tab.className = "tab"
          document.getElementById("email-tab").className = "tab active"
        }
      })
    }
  })
}
async function getEmailCode(container, nickname, email, image, password) {
  mail = email
  return await fetch("/api/v1/registration/", {  // registration/
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nickname: nickname,
      email: email,
      password: password,
      image: image
    })
  })
}
function email(container) {
  let tab = document.createElement("form");
  tab.className = "tab";
  tab.id = "email-tab"
  container.appendChild(tab);

  tab.innerHTML = `
    <div class="form-row">
      <label>Введите код из письма: </label>
      <div class="error-message email-code">Поле не может быть пустым</div>
      <input name="email-code" type="number" minlength="6" maxlength="6">
    </div>
    <button type="submit" class="submit">Подтвердить</button>
  `
  tab.addEventListener("submit", (event) => {
    event.preventDefault();
    let isValid = true

    const errorLabel = tab.getElementsByClassName("error-message email-code")[0]
    const code = document.getElementsByName("email-code")[0].value
    console.log(code)
    if (code.trim() === ""){
      isValid = false
      errorLabel.innerText = "Поле не может быть пустым"
      errorLabel.style.display = "block";
    }
    else if (code.trim().length !== 6) {
      isValid = false
      errorLabel.innerText = "Длина кода должна быть 6 символов"
      errorLabel.style.display = "block";
    }
    if (!isValid){
      return
    }
    fetch("/api/v1/verify-email-user/?code=" + code.trim(), {
      method: "POST"
    }).then(
      response => {
        if (!response.ok) {
          if (response.status === 404) {
            errorLabel.innerText = "Срок кода истёк"
          }
          else if (response.status === 400){
            errorLabel.innerText = "Неверный код"
          }
          errorLabel.style.display = "block";
          return false
        }
        return response.json()
      }
    ).then(data => {
      if (data) {
        document.getElementById("email-tab").className = "tab"
        document.getElementById("login").className = "tab active";
        document.getElementById("register").className = "tab";
        document.getElementsByClassName("tab-button right")[0].className = "tab-button right";
        login_button.className = "tab-button left active";
      }
    })
  })
}



function login(container) {
  let tab = document.createElement("form");
  tab.className = "tab active";
  tab.id = "login"
  container.appendChild(tab);
  tab.innerHTML = `
  <div class="form-row">
    <label for="email">Почта: </label>
    <div class="error-message email">Поле не может быть пустым</div>
    <input type="email" name="email" maxlength="300">
  </div>

  <div class="form-row">
    <label for="password">Пароль: </label>
    <div class="error-message password">Поле не может быть пустым</div>
    <input type="password" name="password" maxlength="30">
  </div>
  <button type="submit" class="submit">Войти</button>
  `
  tab.addEventListener("submit", (event) => {
    event.preventDefault();
    let isValid = true

    const email = document.getElementsByName('email')[0].value;
    const emailError = tab.getElementsByClassName('error-message email')[0];
    if (email.trim() === ''){
      isValid = false;
      emailError.innerText = "Поле не может быть пустым"
      emailError.style.display = "block";
    }
    else {
      emailError.style.display = "none";
    }

    const password = document.getElementsByName('password')[0].value;
    const passwordError = tab.getElementsByClassName('error-message password')[0];
    if (password.trim() === ''){
      isValid = false;
      passwordError.innerText = "Поле не может быть пустым"
      passwordError.style.display = "block";
    }
    else if (password.trim().length < 6 || password.trim().length > 30) {
      isValid = false;
      passwordError.innerText = "Пароль должен содержать от 6 до 30 символов"
      passwordError.style.display = "block";
    }
    else {
      passwordError.style.display = "none";
    }

    if (!isValid){return}
    fetch("/api/v1/login/", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password
      })
    }
    ).then(response => {
        if (!response.ok) {
          if (response.status === 404){
            emailError.innerText = "Неверная почта или пароль"
            emailError.style.display = "block";
          }
          else if (response.status === 400) {
            emailError.innerText = "Неверный формат почты"
            emailError.style.display = "block";
          }
          return false
        }
        return response.json()
      }
    ).then(data => {
      if (data) {
        document.cookie = "token=" + data.message + ";"
        document.location = "/"
      }
    })
  })
}


let div = document.createElement("div");
div.className = "center";
document.body.appendChild(div);

let container = document.createElement("div");
container.className = "auth-form";

// Login
let login_button = document.createElement("button");
login_button.type = "button"
login_button.className = "tab-button left active";
login_button.innerText = "Вход";
login_button.onclick = function (){
  document.getElementById("email-tab").className = "tab"
  document.getElementById("login").className = "tab active";
  document.getElementById("register").className = "tab";
  document.getElementsByClassName("tab-button right")[0].className = "tab-button right";
  login_button.className = "tab-button left active";
};
container.appendChild(login_button)

// Register
let reg_button = document.createElement("button");
reg_button.type = "button"
reg_button.className = "tab-button right";
reg_button.innerText = "Регистрация";
reg_button.onclick = function (){
  document.getElementById("email-tab").className = "tab"
  document.getElementById("register").className = "tab active";
  document.getElementById("login").className = "tab";
  document.getElementsByClassName("tab-button left")[0].className = "tab-button left";
  reg_button.className = "tab-button right active";
};
container.appendChild(reg_button)

login(container);
register(container)
email(container)
div.appendChild(container);
