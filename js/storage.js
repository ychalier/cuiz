function storageAvailable(type) {
    console.log("Checking for storage", type);
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
    var storage;
    try {
        storage = window[type];
        var x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch (e) {
        return e instanceof DOMException && (
            e.code === 22 ||
            e.code === 1014 ||
            e.name === "QuotaExceededError" ||
            e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            (storage && storage.length !== 0);
    }
}

class Storage {

    constructor() {
        this.available = storageAvailable("localStorage");
        if (this.available) {
            console.log("Storage is available");
        } else {
            console.error("Storage is unavailable");
        }
    }

    getConfig() {
        if (!this.available) return null;
        return JSON.parse(localStorage.getItem("config"));
    }

    saveConfig(config) {
        if (this.available) {
            localStorage.setItem("config", JSON.stringify(config));
        }
    }

    getHistory(quizId) {
        if (!this.available) return null;
        return (new QuizHistory()).fromString(localStorage.getItem("quiz-" + quizId));
    }

    saveRun(quizId, rating, time) {
        console.log("Saving run for quiz id", quizId, "with rating", rating, "and time", time);
        if (this.available) {
            let history = this.getHistory(quizId);
            history.addRun(new Date(), rating, time);
            localStorage.setItem("quiz-" + quizId, history.toString());
        }
    }

    countRun(quizId) {
        if (this.available) {
            let history = this.getHistory(quizId);
            history.attempts++;
            localStorage.setItem("quiz-" + quizId, history.toString());
        }
    }

    clearAllHistories() {
        if (this.available) {
            let aux = localStorage.getItem("config");
            localStorage.clear();
            localStorage.setItem("config", aux);
        }
    }

    clearHistory(quizId) {
        if (this.available) {
            localStorage.removeItem("quiz-" + quizId);
        }
    }

}

const GLOBAL_STORAGE = new Storage();