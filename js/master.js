const URL_INDEX = "/data/index.json";


function onBtnClearHistory() {
    if (window.confirm("Voulez-vous supprimer l'historique de tous les quizs ?")) {
        GLOBAL_STORAGE.clearAllHistories();
        document.location.reload();
    }
}

var QUIZ_IS_OFFICIAL = false;


function onWindowLoad() {
    console.log("DOM is loaded");

    createMenu();

    document.getElementById("btn-open-config").addEventListener("click", () => {
        GLOBAL_CONFIG.toDom();
        showModal("modal-config");
    });

    document.getElementById("form-signal").addEventListener("submit", (event) => {
        event.preventDefault();

        let data = {
            type: "report",
            quiz: event.target.querySelector("input[name='quizId']").value,
            question: event.target.querySelector("input[name='questionId']").value,
            reason: event.target.querySelector("select[name='reason']").value,
            comment: event.target.querySelector("textarea[name='comment']").value
        }

        let request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === 4) {
                if (request.status == 200) {
                    alert("Merci pour votre retour !");
                } else {
                    alert("Une erreur s'est produite. Veuillez réessayer ultérieurement.");
                }
            }
        }
        request.open("post", "https://cuiz.chalier.fr/api.php");
        request.send(JSON.stringify(data));
        
        closeModal("modal-signal");
        event.target.reset();
 
    });

    document.getElementById("btn-clear-history").addEventListener("click", onBtnClearHistory);

    document.getElementById("form-upload-json").addEventListener("submit", (event) => {
        event.preventDefault();
        QUIZ_IS_OFFICIAL = false;
        let url = event.target.querySelector("input[name='upload-json-url']").value;
        if (url) {
            loadQuizFromUrl(url);
        } else {
            let file = event.target.querySelector("input[name='upload-json-file']").files[0];
            if (file) {
                let reader = new FileReader();
                reader.onload = function(event) {
                    let data = JSON.parse(event.target.result);
                    loadQuizData(data);
                }
                reader.readAsText(file, "UTF-8");
            }
        }
        closeModal("modal-upload-json");
        event.target.reset();
    });

    document.getElementById("btn-make-suggestion").addEventListener("click", () => {
        let modal = document.getElementById("modal-signal");
        modal.querySelector("form").reset();
        modal.querySelector("option[value='suggestion']").selected = true;
        modal.classList.add("active");
    });

    GLOBAL_CONFIG.bindOnChangeEvents();

    document.getElementById("input-search-quiz").addEventListener("input", (event) => {
        let query = normalizeTurbo(event.target.value);
        if (query) {
            document.querySelectorAll(".grid-item").forEach(item => {
                let filters = item.getAttribute("filter").split(";");
                let matches = false;
                for (let i = 0; i < filters.length; i++) {
                    if (query.includes(filters[i]) || filters[i].includes(query)) {
                        matches = true;
                        hasAny = true;
                        break;
                    }
                }
                if (matches) {
                    item.classList.remove("hidden");
                } else {
                    item.classList.add("hidden");
                }
            });
        } else {
            document.querySelectorAll(".grid-item").forEach(item => {
                item.classList.remove("hidden");
            });
        }
        MASONRIES.forEach(m => { m.layout(); });
    });

}

function onMenuItemClick(quiz) {
    console.log("Clicked on menu item", quiz.id, "entitled \"" + quiz.title + "\"");
    loadQuizFromUrl(quiz.dataset);
    QUIZ_IS_OFFICIAL = true;
}