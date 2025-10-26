import {check_auth, renderPost} from "./app.js";

check_auth(document.getElementsByClassName("account-container")[0])

const currentURL = window.location.href;
const urlParts = currentURL.split('/');
const params = new URLSearchParams(window.location.search);
const q = params.get('q');
let id = params.get('page');

if (isNaN(id) || id === "" || id === null) {
  id = "1"
}

document.getElementsByName("q")[0].value = q

const response = fetch("/api/v1/search/?step=6&q=" + q + "&page=" + id)
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json()
  })
  .then(data => {
    let posts_container = document.createElement("div");
    posts_container.className = "posts-container";
    data.message.posts.forEach((post) => {
      if (post !== null) {
        posts_container.appendChild(renderPost(post));
      }
    })
    document.body.appendChild(posts_container);

    // let test_div = document.createElement("div");
    // test_div.className = "test-div";
    // document.body.appendChild(test_div);


    // Pagination
    let paginationDiv = document.createElement("div");
    paginationDiv.className = "paginationDiv";
    document.body.appendChild(paginationDiv);

    if (!(parseInt(id) === 1)){
      let previousPage = document.createElement("a");
      previousPage.className = "previousPage";
      previousPage.href = "/search?q=" + q + "&page=" + (parseInt(id) - 1);
      paginationDiv.appendChild(previousPage);

      let previousPageDiv = document.createElement("div");
      previousPageDiv.className = "previousPageDiv";
      previousPageDiv.innerText = "Previous Page";
      previousPage.appendChild(previousPageDiv);
    }

    if (!data.message.is_last) {
      let nextPage = document.createElement("a");
      nextPage.className = "nextPage";
      nextPage.href = "/search?q=" + q + "&page=" + (parseInt(id) + 1);
      paginationDiv.appendChild(nextPage);

      let nextPageDiv = document.createElement("div");
      nextPageDiv.className = "nextPageDiv";
      nextPageDiv.innerText = "Next Page";
      nextPage.appendChild(nextPageDiv);
    }
  })
