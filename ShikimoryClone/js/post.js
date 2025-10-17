import {renderPost, formatDate, markdownToHtml, createTempComment, getLogin, check_auth} from "./app.js";

check_auth(document.getElementsByClassName("account-container")[0])

const currentURL = window.location.href;
const urlParts = currentURL.split('/');
let id = urlParts[urlParts.length - 1].split('?')[0];


function loadComments(comments, page) {
  fetch("/api/v1/get-post-comments/" + id + "?step=4&page=" + page)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json()
    })
    .then(data => {
      renderComments(data, comments, page);
    })
}
function renderComments(data, comments, page) {
  let temp;
  if (comments.firstChild !== null) {
    temp = comments.firstChild;
  }
  else {
    temp = document.createElement("div");
    comments.appendChild(temp);
  }

  data.message.temp_comments.forEach(comment => {
    comments.insertBefore(renderOneComment(comment), temp);
  })
  temp.remove()
  // Button
  if (!data.message.is_last){
    let button = document.createElement("button");
    button.className = "load-more-button";
    button.innerText = "Загрузить больше";
    button.onclick = function () {
      loadComments(comments, page + 1);
    }
    comments.insertBefore(button, comments.firstChild);
  }
}
function renderOneComment(comment) {
  let div = document.createElement("div");
  div.className = "container";

  // User
  let userDiv = document.createElement("header");
  userDiv.className = "user-container";
  div.appendChild(userDiv);

  let avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = "img/Anonym.png";
  const image = new Image();
  image.onload = function () {
    avatar.src = image.src;
  }
  image.src = comment.photo
  userDiv.appendChild(avatar);

  let column = document.createElement("div");
  column.className = "column";
  userDiv.appendChild(column);

  let nickname = document.createElement("p");
  nickname.className = "nickname";
  nickname.innerText = comment.nickname;
  nickname.onclick = () => {
    const textField = document.getElementsByClassName("textField")[0]
    let start=textField.selectionStart
    let end=textField.selectionEnd
    let val=textField.value

    textField.focus()
    textField.setSelectionRange(0 , val.length)
    document.execCommand('insertText', false,val.slice(0, start) + "[@" + comment.nickname + "](/temp-comments/" + comment.id + "), " + val.slice(end, val.length))
    textField.focus()
    textField.setSelectionRange(start, start);
    preview.innerHTML = markdownToHtml(textField.value);
  }
  column.appendChild(nickname);

  let time = document.createElement("time")
  time.dateTime = comment.pubDate;
  let data = new Date(Date.parse(comment.pubDate))
  time.innerText = formatDate(data)
  column.appendChild(time);

  if (comment.user_type === 0){
    let fromShik = document.createElement("p");
    fromShik.className = "fromShik";
    fromShik.innerText = "Loaded from Shikimory site";
    userDiv.appendChild(fromShik);
  }

  // Content
  let description = document.createElement("p");
  description.className = "commentContent";
  let content = comment.content
  description.innerHTML = markdownToHtml(content);
  div.appendChild(description);

  return div
}


function commentForm(postId){
  let textField_container = document.createElement("div");
  textField_container.action = "/api/v1/post/" + postId + "/create-temp-comment/";
  textField_container.className = "commentForm";

  let tools = document.createElement("div");
  tools.className = "row";
  textField_container.appendChild(tools);

  function onPressTool(event, left, right) {
    let start=textField.selectionStart
    let end=textField.selectionEnd
    let val=textField.value

    textField.focus()
    textField.setSelectionRange(0 , val.length)
    document.execCommand('insertText', false,val.slice(0, start) + left + val.slice(start, end) + right + val.slice(end, val.length))
    textField.focus()
    textField.setSelectionRange(start + left.length, end + right.length);
    preview.innerHTML = markdownToHtml(textField.value);
  }
  function lineChange(event, pref) {
    let start=textField.selectionStart
    let end=textField.selectionEnd
    let val=textField.value
    const lineStart = val.lastIndexOf("\n", start - 1) + 1
    const lineEnd = val.indexOf("\n", end)

    textField.focus()
    textField.setSelectionRange(0 , val.length)
    document.execCommand('insertText', false, val.slice(0, lineStart) + pref + val.slice(lineStart, lineEnd).split("\n").join("\n" + pref) + val.slice(lineEnd, val.length))
    textField.focus()
    textField.setSelectionRange(lineStart, lineEnd);

    preview.innerHTML = markdownToHtml(textField.value);
  }

  // Decorate
  let bold_button = document.createElement("button");
  bold_button.type="button"
  bold_button.id = "bold"
  bold_button.onclick = (event => {onPressTool(event, "__", "__")});
  bold_button.blur()
  tools.appendChild(bold_button);

  let italic_button = document.createElement("button");
  italic_button.type="button"
  italic_button.id = "italic"
  italic_button.onclick = (event => {onPressTool(event, "_", "_")});
  italic_button.blur()
  tools.appendChild(italic_button);

  let spacer = document.createElement("div")
  spacer.className = "spacer";
  tools.appendChild(spacer);

  // Hrefs
  let img_button = document.createElement("button");
  img_button.type="button"
  img_button.id = "img"
  img_button.onclick = (event => {onPressTool(event, "![Изображение не загружено](", ")")});
  img_button.blur()
  tools.appendChild(img_button);

  let href_button = document.createElement("button");
  href_button.type="button"
  href_button.id = "href"
  href_button.onclick = (event => {onPressTool(event, "[Текст](", ")")});
  href_button.blur()
  tools.appendChild(href_button);

  spacer = document.createElement("div")
  spacer.className = "spacer";
  tools.appendChild(spacer);

  // Delimiters
  let header_button = document.createElement("button");
  header_button.type="button"
  header_button.id = "header"
  header_button.onclick = (event => {lineChange(event, "# ")});
  header_button.blur()
  tools.appendChild(header_button);

  let line_button = document.createElement("button");
  line_button.type="button"
  line_button.id = "line"
  line_button.onclick = (event => {lineChange(event, "-*_")});
  line_button.blur()
  tools.appendChild(line_button);

  let quote_button = document.createElement("button");
  quote_button.type="button"
  quote_button.id = "quote"
  quote_button.onclick = (event => {lineChange(event, ">")});
  quote_button.blur()
  tools.appendChild(quote_button);

  spacer = document.createElement("div")
  spacer.className = "spacer";
  tools.appendChild(spacer);

  let list_button = document.createElement("button");
  list_button.type="button"
  list_button.id = "list"
  list_button.onclick = (event => {lineChange(event, "-* ")});
  list_button.blur()
  tools.appendChild(list_button);

  let num_list_button = document.createElement("button");
  num_list_button.type="button"
  num_list_button.id = "num-list"
  num_list_button.onclick = (event => {lineChange(event, "1. ")});
  num_list_button.blur()
  tools.appendChild(num_list_button);

  spacer = document.createElement("div")
  spacer.className = "spacer";
  tools.appendChild(spacer);


  let textField = document.createElement("textarea");
  textField.className = "textField";
  textField.maxLength = 300
  textField.minLength = 1
  textField.name = "content"
  textField.oninput = function (event) {
    preview.innerHTML = markdownToHtml(textField.value)
  }
  textField_container.appendChild(textField);

  let preview = document.createElement("div");
  preview.className = "commentContent";
  textField_container.appendChild(preview);

  // Текстовое поле
  let data_form = document.createElement("form");
  data_form.className = "tab active";

  if (!getLogin()){
    data_form.innerHTML = `
    <div class="error-message content">Поле не может быть пустым</div>
    <div class="form-row">
      <label for="email">Имя: </label>
      <div class="error-message name">Поле не может быть пустым</div>
      <input name="nickname" maxlength="30">
    </div>
    <button type="submit" class="submit">Отправить</button>
    `
    data_form.addEventListener("submit", (event) => {
      event.preventDefault();
      let isValid = true;
      const content = document.getElementsByName("content")[0].value;
      const contentError = data_form.getElementsByClassName("error-message content")[0];
      if (content.trim() === "") {
        isValid = false;
        contentError.innerText = "Поле не может быть пустым"
        contentError.style.display = "block";
      }
      else {
        contentError.style.display = "none";
      }

      const nickname = document.getElementsByName("nickname")[0].value;
      const nicknameError = document.getElementsByClassName("error-message name")[0];
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

      // const email = document.getElementsByName('email')[0].value;
      // const emailError = data_form.getElementsByClassName('error-message email')[0];
      if (!isValid){return;}
      fetch("/api/v1/post/" + postId + "/create-temp-comment/", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content.trim(),
          nickname: nickname.trim()
          // email: email
        })
      })
        .then(response => {
          if (!response.ok){
            if (response.status === 429){
              nicknameError.innerText = "Превышен лимит отправки в час"
              nicknameError.style.display = "block"
            }
            else{
              nicknameError.innerText = "Ошибка"
              nicknameError.style.display = "block"
            }
            return false;
          }
          return response.json()
        })
        .then(data => {
          if (data){
            const comments_container = document.getElementsByClassName('comments-container')[0];
            comments_container.appendChild(renderOneComment(data.message));
          }
        })
    })
  }
  else {
    data_form.innerHTML = `
      <div class="error-message content">Поле не может быть пустым</div>
      <button>Send</button>
    `
    data_form.addEventListener("submit", (event) => {
      event.preventDefault();
      let isValid = true;
      const content = textField.value;
      const contentError = data_form.getElementsByClassName("error-message content")[0];
      if (content.trim() === "") {
        isValid = false;
        contentError.innerText = "Поле не может быть пустым"
        contentError.style.display = "block";
      }
      else {
        contentError.style.display = "none";
      }
      if (!isValid){return}
      fetch("/api/v1/post/" + postId + "/create-temp-comment-user/", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          user_id: getLogin()
        })
      })
        .then(response => {
          if (!response.ok){
            if (response.status === 404){
              contentError.innerText = "Ошибка. Возможно, истёк срок токена"
              contentError.style.display = "block";
            }
            else {
              contentError.innerText = "Ошибка"
              contentError.style.display = "block";
            }
            return false
          }
          else {
            return response.json()
          }
        })
        .then(data => {
          if (data){
            const comments_container = document.getElementsByClassName('comments-container')[0];
            comments_container.appendChild(renderOneComment(data.message));
          }
        })
    })
  }
  textField_container.appendChild(data_form);
  return textField_container;
}

function verify(code) {
  fetch("/api/v1/verify_email/?code=" + code.getElementsByTagName("input")[0].value, {
    method: "POST",
    headers: {}
  })
    .then(response => {
      console.log(response.status)
    if (response.status === 400) {
      code.getElementsByTagName("label").innerText = "Неверный код."
      return response.json()
    }else if (response.ok) {
      code.remove()
      return response.json()
    }else if (!response.ok) {
      code.getElementsByTagName("label").innerText = "Ошибка"
      return response.json()
    }
  })
}


const response = fetch("/api/v1/get-post/" + id)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json()
  })
  .then(data => {
    const post = data.message.post;
    if (post !== null) {
      let posts_container = document.createElement("div");
      posts_container.className = "posts-container";
      posts_container.appendChild(renderPost(post, true))

      document.body.appendChild(posts_container);

      // Comments
      let comments = document.createElement("div")
      comments.className = "comments-container";

      loadComments(comments, 1);
      document.body.appendChild(comments);
      document.body.appendChild(commentForm(id))
    }
  })





//data_form.getElementsByTagName("button")[0].onclick = (event => {
//       const data = new FormData(textField_container);
//       if (data.get("email") !== null && data.get("email") !== ""){
//         let code_form = document.createElement("form");
//         code_form.className = "data_form";
//         code_form.id = "code_form";
//         code_form.innerHTML = `
//       <label for="code">Введите код, пришедший вам на почту:
//       <br><em>Код действителен в течение 15 минут</em></label>
//       <input id="code" name="code" type="number">
//       <button type="button">Отправить</button>
//       `
//         code_form.getElementsByTagName("button")[0].blur()
//         code_form.getElementsByTagName("button")[0].onclick = (event => {
//           if (code_form.getElementsByTagName("input")[0].value !== "") {
//             verify(code_form)
//           }
//         })
//         document.body.appendChild(code_form)
//       }
//       createTempComment(postId, data)
//       const comments = document.body.getElementsByClassName("comments-container")[0]
//       comments.innerHTML = ``
//       loadComments(comments, 1)
//     })
