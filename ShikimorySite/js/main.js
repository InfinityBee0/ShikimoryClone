import {renderPost, check_auth} from "./app.js";

check_auth(document.getElementsByClassName("account-container")[0])

const currentURL = window.location.href;
const urlParts = currentURL.split('/');
let id = urlParts[urlParts.length - 1].split('?')[0];

if (isNaN(id) || id === "") {
  id = "1"
}

const response = fetch("/api/v1/get-posts/" + id + "?step=6")
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
      previousPage.href = "/page/" + (parseInt(id) - 1);
      paginationDiv.appendChild(previousPage);

      let previousPageDiv = document.createElement("div");
      previousPageDiv.className = "previousPageDiv";
      previousPageDiv.innerText = "Previous Page";
      previousPage.appendChild(previousPageDiv);
    }

    if (!data.message.is_last) {
      let nextPage = document.createElement("a");
      nextPage.className = "nextPage";
      nextPage.href = "/page/" + (parseInt(id) + 1);
      paginationDiv.appendChild(nextPage);

      let nextPageDiv = document.createElement("div");
      nextPageDiv.className = "nextPageDiv";
      nextPageDiv.innerText = "Next Page";
      nextPage.appendChild(nextPageDiv);
    }
  })
