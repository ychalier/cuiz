let THUMBNAILS_TO_LOAD = 0;
let MASONRIES = [];


function createMenu() {
    console.log("Creating menu");
    sendRequest(URL_INDEX, (response) => {
        THUMBNAILS_TO_LOAD = 0;
        let data = JSON.parse(response);

        if (getUrlParameters().has("quiz")) {
            let quizId = parseInt(getUrlParameters().get("quiz"));
            for (let i = 0; i < data.quizzes.length; i++) {
                if (data.quizzes[i].id == quizId) {
                    onMenuItemClick(data.quizzes[i]);
                    return;
                }
            }
        }

        data.quizzes.sort((a, b) => {
            if (a.category != b.category) {
                let i = data.categories.indexOf(a.category);
                let j = data.categories.indexOf(b.category);
                return i - j;
            } else {
                return a.id - b.id;
            }
        });

        let container = document.getElementById("main-container");
        container.innerHTML = "";
        let menu = importTemplate("template-menu");

        data.quizzes.forEach(quiz => {
            menu.querySelector(".quiz-menu").appendChild(createMenuItem(quiz));
        });
        container.appendChild(menu);

    });
}

function createMenuItem(quiz) {
    let element = importTemplate("template-menu-item");
    element.querySelector(".quiz-title").textContent = quiz.title;
    element.querySelector(".quiz-category").textContent = quiz.category;
    element.querySelector("div").setAttribute("filter", normalizeTurbo(quiz.category) + ";" + normalizeTurbo(quiz.title) + ";" + quiz.id);
    let thumbnail = element.querySelector(".quiz-thumbnail");
    if (quiz.thumbnail != null) {
        THUMBNAILS_TO_LOAD++;
        thumbnail.addEventListener("load", onThumbnailLoadCallback);
        thumbnail.src = quiz.thumbnail;
    } else {
        thumbnail.parentNode.parentNode.removeChild(thumbnail.parentNode);
    }
    let history = GLOBAL_STORAGE.getHistory(quiz.id);
    element.querySelector(".quiz-pb").appendChild(inflateBestRun(history.getBestRun()));
    element.querySelector("div").addEventListener("click", () => {
        onMenuItemClick(quiz);
    });
    return element;
}

function onThumbnailLoadCallback() {
    THUMBNAILS_TO_LOAD--;
    if (THUMBNAILS_TO_LOAD == 0) {
        console.log("All thumbnails are loaded, initializing Masonry");
        MASONRIES = [];
        document.querySelectorAll(".grid").forEach(grid => {
            MASONRIES.push(new Masonry(grid, {
                gutter: ".gutter-sizer",
                columnWidth: ".grid-sizer",
                itemSelector: ".grid-item",
                percentPosition: true
            }));
        });
    }
}