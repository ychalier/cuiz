var QUIZ_TIME_INTERVAL = null;
var GLOBAL_QUIZ = null;

function loadQuizData(data) {
    let container = document.getElementById("main-container");
    GLOBAL_QUIZ = new Quiz(GLOBAL_CONFIG, data);
    GLOBAL_QUIZ.inflate(container);
    GLOBAL_QUIZ.start();
}

function loadQuizFromUrl(datasetUrl) {
    sendRequest(datasetUrl, (response) => {
        loadQuizData(JSON.parse(response))
    });
}

function questionStatsComparator (a, b) {
    // First results are worse performances
    if (a.success && !b.success) {
        return 1;
    } else if (!a.success && b.success) {
        return -1;
    } else {
        if (a.attempts == b.attempts) {
            return a.time - b.time;
        } else {
            return a.attempts - b.attempts;
        }
    }
}

class Quiz {

    constructor(config, data) {
        console.log("Constructing quiz", data.id);

        this.config = config;
        this.data = data;

        this.container = null;

        this.prompt = null;
        if (data.prompt == "image") {
            this.prompt = new QuizPromptImage(config, data);
        } else if (data.prompt == "text") {
            this.prompt = new QuizPromptText(config, data);
        } else if (data.prompt == "sentence") {
            this.prompt = new QuizPromptSentence(config, data);
        } else {
            throw new Error("Invalid quiz prompt: " + data.prompt);
        }

        this.input = null;
        if (data.input == "text") {
            this.input = new QuizInputText(config, data, this);
        } else if (data.input == "map") {
            this.input = new QuizInputMap(config, data, this);
        } else {
            throw new Error("Invalid quiz input:" + data.input);
        }

        this.index = -1;
        this.consecutiveAttempts = 0;

        this.monitoring = {
            success: 0,
            errors: 0,
            timeStart: null,
            validTest: this.config.isInTestMode(),
            details: [],
            timeQuestionStart: null
        }

        this.finished = false;

    }

    getQuestion(questionId) {
        /* Find a question with its ID. If nothing is found,
        then `null` is returned. */
        for (let i = 0; i < this.data.questions.length; i++) {
            if (this.data.questions[i].id == questionId) {
                return this.data.questions[i];
            }
        }
        return null;
    }

    inflate(container) {
        console.log("Inflating quiz", this.data.id, "within", container);
        this.container = container;
        container.innerHTML = "";
        let element = importTemplate("template-quiz");
        element.querySelector(".quiz-header .quiz-category").textContent = this.data.category;
        element.querySelector(".quiz-header .quiz-title").textContent = this.data.title;
        element.querySelector(".quiz-header .quiz-progress-bar").max = this.data.size;
        element.querySelector(".quiz-id").textContent = this.data.id;
        this.prompt.inflate(element.querySelector(".quiz-prompt"));
        let self = this;
        element.querySelector(".btn-signal").addEventListener("click", () => {
            let modal = document.getElementById("modal-signal");
            modal.querySelector("form").reset();
            modal.querySelector("input[name='quizId']").value = self.data.id;
            modal.querySelector("input[name='questionId']").value = self.data.questions[self.index].id;
            modal.querySelector("option[value='promptWrong']").selected = true;
            modal.classList.add("active");
        });
        element.querySelector(".btn-restart").addEventListener("click", () => {
            self.start();
        });
        element.querySelector(".btn-terminate").addEventListener("click", () => {
            self.terminate();
        });
        container.appendChild(element);
    }


    start() {
        this.input.inflate(this.container.querySelector(".quiz-input"));
        this.index = -1;
        this.monitoring.success = 0;
        this.monitoring.errors = 0;
        this.monitoring.timeStart = new Date();
        if (QUIZ_TIME_INTERVAL != null) {
            clearInterval(QUIZ_TIME_INTERVAL);
        }
        startChronometer(this.container.querySelector(".quiz-time"));
        this.monitoring.validTest = true;
        this.checkForTestMode();
        this.monitoring.timeQuestionStart = null;
        this.monitoring.details = [];
        this.validTest = this.config.isInTestMode();

        let seed = (new Date()).toString();
        let params = getUrlParameters();
        if (params.has("seed")) {
            seed = params.get("seed");
        }

        this.finished = false;
        
        this.shuffle(seed);
        this.next();
    }

    shuffle(seed) {
        console.log("Shuffling using seed", seed);
        let randomGenerator = new Math.seedrandom(seed);
        this.data.questions.sort((a, b) => {return a.id - b.id;});
        this.data.questions.sort(_ => randomGenerator() - 0.5);
    }

    next() {
        this.index++;
        this.input.clear();
        this.container.querySelector(".quiz-progress-bar").value = this.index;
        let score = this.monitoring.success + this.monitoring.errors > 0 ? this.monitoring.success / (this.monitoring.success + this.monitoring.errors) : 1;
        this.container.querySelector(".quiz-score").textContent = parseInt(100 * score) + "%";
        this.consecutiveAttempts = 0;
        if (this.index >= this.data.size) {
            this.finish();
        } else {
            console.log("Loading question at index", this.index, "id:", this.data.questions[this.index].id);
            this.prompt.load(this.index);
            this.container.querySelector(".question-id").textContent = this.data.questions[this.index].id;
            this.container.querySelector(".quiz-tries").textContent = this.config.maxAttempts > 1 ? this.config.maxAttempts + " essais restants" : this.config.maxAttempts + " essai restant";
            this.monitoring.details.push({
                id: this.data.questions[this.index].id,
                attempts: 0,
                time: null,
                success: false
            });
            this.monitoring.timeQuestionStart = new Date();
        }
    }

    success() {
        console.log("Question is a success!");
        this.monitoring.success++;
        this.monitoring.details[this.monitoring.details.length - 1].success = true;
        this.monitoring.details[this.monitoring.details.length - 1].time = (new Date()) - this.monitoring.timeQuestionStart;
        this.config.library.success.play();
        this.input.giveFeedback(true, false);
        this.next();
    }

    error() {
        console.log("Question is a failure…");
        let currentQuestion = this.data.questions[this.index];
        this.consecutiveAttempts++;
        this.monitoring.details[this.monitoring.details.length - 1].success = false;
        this.monitoring.details[this.monitoring.details.length - 1].time = (new Date()) - this.monitoring.timeQuestionStart;
        this.config.library.error.play();
        this.input.giveFeedback(false, this.consecutiveAttempts < this.config.maxAttempts || this.config.askAgain);
        if (this.consecutiveAttempts >= this.config.maxAttempts) {
            this.monitoring.errors++;
            if (this.config.askAgain) {
                this.data.questions.splice(this.index, 1);
                this.data.questions.push(currentQuestion);
                this.index--;
            }
            if (this.config.showCorrectAnswer) {
                if (this.config.askAgain) {
                    this.input.showCorrectAnswer(this.data.size - 1);
                } else {
                    this.input.showCorrectAnswer(this.index);
                }
            } else {
                this.next();
            }
        } else {
            this.input.clear();
        }
    }

    notifyConfigChange() {
        if (!this.finished) {
            this.start();
        }
    }

    checkForTestMode() {
        this.monitoring.validTest = this.monitoring.validTest && this.config.isInTestMode() && !getUrlParameters().has("seed") && QUIZ_IS_OFFICIAL;
        if (this.monitoring.validTest) {
            this.container.querySelector(".quiz-test-on").classList.remove("hidden");
            this.container.querySelector(".quiz-test-off").classList.add("hidden");
        } else {
            this.container.querySelector(".quiz-test-off").classList.remove("hidden");
            this.container.querySelector(".quiz-test-on").classList.add("hidden");
        }
        
    }

    submit() {
        /* This method should be called by the input. */
        this.checkForTestMode();
        console.log("Submitting answer for quiz", this.data.id, "- test mode is", this.monitoring.validTest);
        if (this.index < this.data.size) {
            this.monitoring.details[this.index].attempts++;
            if (this.input.evaluate(this.index)) {
                this.success();
            } else {
                let remainingAttempts = this.config.maxAttempts - this.consecutiveAttempts;
                this.container.querySelector(".quiz-tries").textContent = remainingAttempts > 1 ? remainingAttempts + " essais restants" : remainingAttempts + " essai restant";
                this.error();
            }
        }
    }

    terminate() {
        this.monitoring.validTest = false;
        while (this.index < this.data.size) {
            this.monitoring.errors++;
            this.index++;
        }
        this.finish();
    }

    getCurrentRunSummary() {
        this.checkForTestMode();
        let data = {
            rating: this.monitoring.success / (this.monitoring.success + this.monitoring.errors),
            time: (new Date()) - this.monitoring.timeStart,
            totalAttempts: 0,
            validTest: this.monitoring.validTest,
            fastestAnswer: null,
            slowestAnswer: null
        }
        this.monitoring.details.forEach(detail => {
            data.totalAttempts += detail.attempts;
            if (data.fastestAnswer == null || detail.time < data.fastestAnswer.time) {
                data.fastestAnswer = detail;
            }
            if (data.slowestAnswer == null || detail.time > data.slowestAnswer.time) {
                data.slowestAnswer = detail;
            }
        });
        return data;
    }

    finish() {
        this.finished = true;

        console.log("Quiz just finished!");

        clearInterval(QUIZ_TIME_INTERVAL);

        let summary = this.getCurrentRunSummary();
        let history = GLOBAL_STORAGE.getHistory(this.data.id);
        let isPb = false;

        if (summary.validTest) {
            isPb = true;
            let previousPb = history.getBestRun();
            if (previousPb != null) {
                isPb = runComparator({rating: summary.rating, time: summary.time}, previousPb) > 0;
            }
            GLOBAL_STORAGE.saveRun(this.data.id, summary.rating, summary.time);
        } else {
            GLOBAL_STORAGE.countRun(this.data.id);
        }
        
        if (isPb) {
            this.config.library.pb.play();
            startConfettiAnimation(10000);
        } else {
            this.config.library.end.play();
        }

        this.inflateQuizEnd(history, summary, isPb);
    }

    inflateQuizEnd(history, summary, isPb) {
        let element = importTemplate("template-quiz-end");
        element.querySelector(".quiz-title").innerHTML = this.data.category + " &ndash; " + this.data.title;
        this.inflateAnswers(element);
        const animDuration = 1000;
        startCountingAnimation(element.querySelector(".quiz-rating"), parseInt(summary.rating * 100), (x) => parseInt(x), animDuration);
        startCountingAnimation(element.querySelector(".quiz-time"), summary.time, formatTimeRun, animDuration);        
        if (history.attempts > 1) {
            element.querySelector(".quiz-attempts").textContent = history.attempts + " tentatives";
        } else {
            element.querySelector(".quiz-attempts").textContent = history.attempts + " tentative";
        }
        if (isPb) {
            element.querySelector(".quiz-pb").appendChild(inflateBestRun(summary));
        } else {
            element.querySelector(".quiz-pb").appendChild(inflateBestRun(history.getBestRun()));
        }
        let self = this;
        element.querySelector(".button-restart").addEventListener("click", () => {
            self.inflate(self.container);
            self.start();
        });
        if (isPb) {
            element.querySelector(".quiz-new-record form").addEventListener("submit", (event) => {
                event.preventDefault();
                self.shareRecord(summary, (success) => {
                    if (success) {
                        let target = event.target;
                        let parent = target.parentNode;
                        parent.removeChild(target);
                        parent.querySelector("span").style.marginBottom = "0";
                        inflateLeaderboard(self.data.id, self.container.querySelector(".quiz-leaderboard"));
                    } else {
                        alert("Une erreur est survenue lors du partage du score. Veuillez réessayer ultérieurement.");
                    }
                });
            });
        } else {
            let target = element.querySelector(".quiz-new-record");
            target.parentNode.removeChild(target);
        }
        this.inflateHistory(element, history, summary, isPb)
        this.container.innerHTML = "";
        this.container.appendChild(element);
        inflateLeaderboard(this.data.id, this.container.querySelector(".quiz-leaderboard"));
    }

    inflateHistory(element, history, summary, isPb) {
        let points = [];
        history.runs.forEach(run => {
            points.push({
                y: 100 * run.rating,
                x: run.time / 1000
            })
        })
        let ctx = element.getElementById("quiz-history-chart").getContext("2d");
        let chart = new Chart(ctx, {
            type: "scatter",
            data: {
                datasets: [{
                    label: "Actuel",
                    data: [{
                        x: summary.time / 1000,
                        y: summary.rating * 100
                    }],
                    borderColor: "#CCAB00",
                    backgroundColor: "gold"
                }, {
                    label: "Évaluations",
                    data: points,
                    borderColor: "#3F3CCC",
                    backgroundColor: "#4F4CFF"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 1,
                legend: {
                    display: false
                },
                scales: {
                    yAxes: [{
                        position: 'left',
                        ticks: {
                            userCallback: function(value) {
                                return value + "%";
                            },
                            beginAtZero: true,
                            max: 100
                        }
                    }],
                    xAxes: [{
                        position: 'bottom',
                        scaleLabel: {
                            display: true,
                            labelString: "Temps (s)"
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            let point = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                            let temp = document.createElement("div");
                            if (tooltipItem.datasetIndex == 1) {
                                temp.innerHTML = (new Date(history.runs[tooltipItem.index].date)).toLocaleDateString() + " &middot; ";
                            }
                            temp.innerHTML += Math.floor(point.y) + "% &middot; " + formatTimeRun(point.x * 1000);
                            return temp.textContent;
                        }
                    }
                }
            }
        });
        let self = this;
        element.querySelector(".btn-erase-quiz-history").addEventListener("click", () => {
            if (confirm("Voulez-vous effacer l'historique local du quiz " + self.data.id + " ?")) {
                GLOBAL_STORAGE.clearHistory(self.data.id);
                alert("L'historique local du quiz " + self.data.id + " a bien été supprimé.");
            }
        });
    }

    inflateAnswers(container) {
        
        let slowest;
        this.monitoring.details.forEach(detail => {
            if (slowest == null || detail.time > slowest) {
                slowest = detail.time;
            }
        });

        let table = container.querySelector("table");
        this.monitoring.details.forEach(detail => {
            let tr = document.createElement("tr");

            let tdScore = document.createElement("td");
            if (detail.success) {
                tdScore.innerHTML = '<i class="icon icon-check text-success"></i>';
            } else {
                tdScore.innerHTML = '<i class="icon icon-cross text-error"></i>';
            }
            tr.appendChild(tdScore);

            let tdLabel = document.createElement("td");
            tdLabel.textContent = this.getQuestion(detail.id).label;
            tr.appendChild(tdLabel);

            let tdTime = document.createElement("td");
            let answerTime = importTemplate("template-answer-time");
            answerTime.querySelector(".answer-time-value").innerHTML = formatTimePrecise(detail.time);
            answerTime.querySelector(".answer-time-bar-filled").style.width = Math.floor(100 * detail.time / slowest) + "%";
            tdTime.appendChild(answerTime);

            tr.appendChild(tdTime);

            table.appendChild(tr);
        });
    }

    shareRecord(summary, callback) {
        let name = event.target.querySelector("input").value.trim();
        if (name != null && name.length > 0) {
            let request = new XMLHttpRequest();
            request.onreadystatechange = function () {
                if (request.readyState === 4) {
                    callback(request.status == 200);
                }
            }
            request.open("post", "https://cuiz.chalier.fr/api.php");
            request.send(JSON.stringify({
                name: name,
                quiz: this.data.id,
                rating: summary.rating,
                time: summary.time,
                date: this.monitoring.timeStart,
                type: "record"
            }));
        } else {
            alert("Veuillez entrer un nom valide");
        }
    }
    
}


function inflateLeaderboard(quizId, container) {    
    container.innerHTML = "";
    container.appendChild(importTemplate("template-leaderboard"));
    sendRequest("https://cuiz.chalier.fr/api.php?id=" + quizId, (response) => {
        let table = container.querySelector("table");
        let rows = table.querySelectorAll("tr");
        for (let i = 1; i < rows.length; i++) {
            table.removeChild(rows[i]);
        }
        let data = JSON.parse(response);
        if (data.length) {
            data.sort(runComparator).reverse();
            let names = {};
            let index = -1;
            data.forEach(row => {
                if (!(row.name in names) && index < 20) {
                    names[row.name] = null;
                    index++;
                    let tr = document.createElement("tr");
                    if (index == 0) {
                        tr.innerHTML = "<td><i class='icon icon-trophy'></i> " + (index + 1) + "</td>";
                    } else {
                        tr.innerHTML = "<td>" + (index + 1) + "</td>";
                    }
                    tr.innerHTML += "<td class='text-uppercase'>" + row.name + "</td>";
                    tr.innerHTML += "<td>" + Math.floor(100 * row.rating) + "<small>%</small></td>";
                    tr.innerHTML += "<td>" + formatTimeRun(parseInt(row.time)) + "</td>";
                    tr.innerHTML += "<td><small>" + (new Date(row.date)).toLocaleDateString(); + "</small></td>";
                    if (index == 0) {
                        tr.classList.add("rating-gold");
                    } else if (index == 1) {
                        tr.classList.add("rating-silver");
                    } else if (index == 2) {
                        tr.classList.add("rating-bronze");
                    }
                    table.appendChild(tr);
                }
            });
        } else {
            container.innerHTML = "Aucun score n'a été partagé.";
        }
    });
}



