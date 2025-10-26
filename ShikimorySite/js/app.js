
export function renderPost(post, all_images=false) {
  let div = document.createElement("div");
  div.className = "container";

  if (all_images === false){
    // Image
    let imageDiv = document.createElement("div");
    imageDiv.className = "imageDiv";
    div.appendChild(imageDiv);

    let imageHref = document.createElement("a");
    imageHref.href = post.link;
    imageDiv.appendChild(imageHref);

    let img = document.createElement("img");
    img.className = "postImg";
    img.src = "img/youtube_ne_rabotaet_01.webp"
    const image = new Image();
    image.onload = function () {
      img.src = image.src;
    }
    image.src = "img/posts/" + post.id + "/title.jpg";
    imageHref.appendChild(img);
  }

  // Text
  let textDiv = document.createElement("div");
  textDiv.className = "textDiv";
  div.appendChild(textDiv);

  let title = document.createElement("a");
  title.className = "postTitle";
  title.innerText = post.title;
  title.href = "/post/" + post.id;
  textDiv.appendChild(title);
  let description = document.createElement("p");
  description.className = "postDescription";
  if (all_images){
    description.innerHTML = post.description_full.replace(/\n/g, '<br>');
  }else {
    description.innerText = post.description.replace(/\[(.*?)\]\((.*?)\)/g, '$1');
  }

  textDiv.appendChild(description);

  let bottom_container = document.createElement("div");
  bottom_container.className = "bottomContainer";

  post.tags.forEach(tag => {
    let postTag = document.createElement("p");
    postTag.className = "tag";
    postTag.innerText = tag.name;
    bottom_container.appendChild(postTag);
  })

  let pubDate = document.createElement("p");
  pubDate.className = "pubDate";
  // console.log(post.title)
  pubDate.innerText = formatDate(new Date(Date.parse(post.pubDate)));
  bottom_container.appendChild(pubDate);

  // Images
  if (all_images) {
    let imageDiv = document.createElement("div");
    // imageDiv.className = "imageDiv";
    div.appendChild(imageDiv);

    post.images.forEach(picture => {
      let imageHref = document.createElement("a");
      imageHref.href = post.link;
      imageDiv.appendChild(imageHref);

      let img = document.createElement("img");
      img.className = "postImg-all";
      img.src = "img/youtube_ne_rabotaet_01.webp"
      const image = new Image();
      image.onload = function () {
        img.src = image.src;
      }
      image.src = "img/posts/" + post.id + "/" + picture;
      imageHref.appendChild(img);
    })

    div.appendChild(bottom_container);
  }else {
    textDiv.appendChild(bottom_container);
  }

  return div;
}

export function createTempComment(postId, data) {
  console.log(data.get("content"))
  fetch("/api/v1/post/" + postId + "/create-temp-comment/", {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: data.get("content"),
      nickname: data.get("nickname"),
      email: data.get("email")
    })
  }).then(
    response => {
      console.log(response)
    }
  )
}

export function formatDate(date) {
  function getNoun(number, one, two, five) {
    let n = Math.abs(number) % 100;
    if (n >= 5 && n <= 20) return five;
    n = n % 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime(); // Разница в миллисекундах
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHours = Math.round(diffMin / 60);
  // console.log(diffSec)
  // console.log(diffMin)
  if (diffMs < 3600000) { // Менее 1 часа
    if (diffMin < 1) return "только что";
    return `${diffMin} ${getNoun(diffMin, 'минуту', 'минуты', 'минут')} назад`;
  }
  if (diffMs < 86400000) { // Менее 24 часов
    return `${diffHours} ${getNoun(diffHours, 'час', 'часа', 'часов')} назад`;
  }

  if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleString('ru-RU', {
      month: 'long',
      day: 'numeric',

      hour: 'numeric',
      minute: 'numeric',
    });
  } else {
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',

      hour: 'numeric',
      minute: 'numeric',
    }) //.replace(/(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3'); // Убираем лишние пробелы
  }
}

export function markdownToHtml(markdown) {
  // Обработка блоков кода (многострочные)
  markdown = markdown.replace(/```([\s\S]*?)```/g, (match, code) =>
    `<pre><code>${escapeHtml(code)}</code></pre>`
  );

  // Разделение на строки для обработки блочных элементов
  const lines = markdown.split('\n');
  let htmlOutput = [];
  let inBlockquote = false;
  let inList = false;
  let list_type = 0

  lines.forEach(line => {

    // Заголовки
    if (/^#{1,2}\s/.test(line)) {
      const level = line.match(/^#+/)[0].length;
      const text = line.substring(level + 1);
      htmlOutput.push(`<h${4 - level}>${parseInline(text)}</h${4 - level}>`);
      return;
    }

    // Горизонтальные линии
    if (/^[-*_]{3,}$/.test(line.trim())) {
      htmlOutput.push('<hr>');
      return;
    }

    // Блоки кода (с отступом)
    if (/^ {4}/.test(line)) {
      htmlOutput.push(`<pre><code>${escapeHtml(line.trim())}</code></pre>`);
      return;
    }

    // Списки
    if (/^-\*\s/.test(line)) {
      if (!inList) {
        htmlOutput.push('<ul>');
        inList = true;
        list_type = 0
      }
      const text = line.replace(/^-\*\s/, '');
      htmlOutput.push(`<li>${parseInline(text)}</li>`);
      return;
    }

    // Нумерованные списки
    if (/^\d+\.\s/.test(line)) {
      if (!inList) {
        htmlOutput.push('<ol>');
        inList = true;
        list_type = 1
      }
      const text = line.replace(/^\d+\.\s/, '');
      htmlOutput.push(`<li>${parseInline(text)}</li>`);
      return;
    }

    // Завершение списка
    if (inList && line.trim() === '') {
      htmlOutput.push(list_type === 0 ? `</ul>` : `</ol>`);
      inList = false;
    }

    // Цитаты
    line = line.replace(/.*>.*/g, (match) => {
      // console.log(match)
      if (/href/g.test(htmlOutput.at(htmlOutput.length - 1)) && !inBlockquote) {
        htmlOutput.splice(htmlOutput.length - 1, 1,
          `<div class="blockquote"><blockquote>${htmlOutput.at(htmlOutput.length - 1)}`);
        inBlockquote = true;
      }
      if (!inBlockquote){
        htmlOutput.push('<div class="blockquote"><blockquote>');
      }
      htmlOutput.push(`<p>${parseInline(match.substring(1))}</p>`);

      inBlockquote = true;
      return '';
    });
    if (inBlockquote && line.length > 1){
      htmlOutput.push(`</blockquote></div>`);
      inBlockquote = false
    }

    // Параграфы
    htmlOutput.push(`<p>${parseInline(line)}</p>`);
  })

  // Закрытие последнего списка
  // if (inList) {
  //   htmlOutput.push(inList.startsWith('<u') ? '</ul>' : '</ol>');
  // }

  return htmlOutput.join('\n');
}
function parseInline(text) {
  text = text.replace(/\/images\/smileys\/(.*?)\s".*?"/g, "https://shikimori.one/images/smileys/$1")

  // Экранирование HTML
  text = escapeHtml(text);

  // Жирный текст
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Курсив
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');

  // Изображения
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');

  // Ссылки
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Inline-код
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');

  return text;
}
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/~/g, "")
    .replace(/\\-/g, '-')
    .replace(/\\+/g, "+");
}


export function check_auth(button){
  const token = getLogin();
  if (token){
    fetch("/api/v1/get-user-data/" + token)
      .then(response => {
      if (!response.ok) {return false}
      return response.json();
    })
      .then(result => {
        if (result){
          // Обработка фото
          let image
          if (result.message.user.photo !== null){
            image = result.message.user.photo
          }
          else {
            image = "img/Anonym.png"
          }

          button.className = "card"
          button.innerHTML = `
          <img src="${image}">
          <span>${result.message.user.nickname}</span>
          <div class="log-out"></div>
           `
          button.getElementsByClassName("log-out")[0].onclick = function () {
            document.cookie = "token=;Max-Age=-1;"
            location.reload()
          }
        }
      })
  }
  else {
    button.getElementsByTagName("a")[0].href = "/authentication";
  }
}
export function getLogin() {
  const token = document.cookie.split(";")[0].split('=')[1]
  if (token === null || token === ""){
    return false;
  }
  return token
}
