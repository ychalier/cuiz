function runComparator(a, b) {
    if (a.rating == b.rating) {
        return b.time - a.time;
    } else {
        return a.rating - b.rating;
    }
}

class QuizHistory {

    constructor(quizId) {
        this.id = quizId;
        this.runs = [];
        this.attempts = 0;
    }

    fromString(string) {
        if (string != null) {
            let parsed = JSON.parse(string);
            this.id = parsed.id;
            this.runs = parsed.runs;
            this.attempts = parsed.attempts;
        }
        return this;
    }

    toString() {
        return JSON.stringify({
            id: this.id,
            runs: this.runs,
            attempts: this.attempts
        });
    }

    addRun(runDate, runRating, runTime) {
        this.runs.push({
            date: runDate,
            rating: runRating,
            time: runTime
        });
        this.attempts++;
    }

    getBestRun() {
        /* Returns null if no run were ever recorded for this quiz */
        return getArrayMax(this.runs, runComparator);
    }

}


function inflateBestRun(run) {
    let element = importTemplate("template-best-run");
    if (run) {
        element.querySelector(".run-rating").innerHTML = Math.floor(100 * run.rating) + "<small>%</small>";
        element.querySelector(".run-time").innerHTML = formatTimeRun(run.time);
        element.querySelector(".run").classList.add("rating-rated");
    } else {
        element.querySelector(".run").classList.add("rating-none");
    }
    return element;
}