class AudioPlaylist {

    constructor(paths) {
        this.tracks = [];
        paths.forEach(path => {
            this.tracks.push(new Audio("assets/sounds/" + path));
        });
    }

    play() {
        let index = Math.floor(Math.random() * this.tracks.length);
        this.tracks[index].play();
    }

}

class AudioLibrary {

    constructor(pathsSuccess, pathsError, pathsEnd, pathsPb) {
        this.success = new AudioPlaylist(pathsSuccess);
        this.error = new AudioPlaylist(pathsError);
        this.end = new AudioPlaylist(pathsEnd);
        this.pb = new AudioPlaylist(pathsPb);
    }

}

const DEFAULT_AUDIO_LIBRARY = new AudioLibrary(
    ["success.mp3"],
    ["error.mp3"],
    ["end.mp3"],
    ["pb.mp3"]
);

class Config {

    constructor(storage) {
        this.storage = storage;
        let checkpoint = storage.getConfig();
        if (checkpoint == null) {
            this.maxAttempts = 3;
            this.displayAutocomplete = true;
            this.showCorrectAnswer = true;
            this.showBorders = true;
            this.askAgain = true;
            this.keepTrace = true;
        } else {
            this.maxAttempts = checkpoint.maxAttempts;
            this.displayAutocomplete = checkpoint.displayAutocomplete;
            this.showCorrectAnswer = checkpoint.showCorrectAnswer;
            this.showBorders = checkpoint.showBorders;
            this.askAgain = checkpoint.askAgain;
            this.keepTrace = checkpoint.keepTrace;
        }
        this.library = DEFAULT_AUDIO_LIBRARY;
    }

    fromDom() {
        this.maxAttempts = document.getElementById("input-config-maxAttempts").value;
        this.displayAutocomplete = document.getElementById("input-config-displayAutocomplete").checked;
        this.showCorrectAnswer = document.getElementById("input-config-showCorrectAnswer").checked;
        this.showBorders = document.getElementById("input-config-showBorders").checked;
        this.askAgain = document.getElementById("input-config-askAgain").checked;
        this.keepTrace = document.getElementById("input-config-keepTrace").checked;
        this.storage.saveConfig({
            maxAttempts: this.maxAttempts,
            displayAutocomplete: this.displayAutocomplete,
            showCorrectAnswer: this.showCorrectAnswer,
            showBorders: this.showBorders,
            askAgain: this.askAgain,
            keepTrace: this.keepTrace,
        });
        if (GLOBAL_QUIZ != null) {
            GLOBAL_QUIZ.notifyConfigChange();
        }
    }

    toDom() {
        console.log("Using GLOBAL_CONFIG to set input values");
        document.getElementById("input-config-maxAttempts").value = this.maxAttempts;
        document.getElementById("input-config-displayAutocomplete").checked = this.displayAutocomplete;
        document.getElementById("input-config-showCorrectAnswer").checked = this.showCorrectAnswer;
        document.getElementById("input-config-showBorders").checked = this.showBorders;
        document.getElementById("input-config-askAgain").checked = this.askAgain;
        document.getElementById("input-config-keepTrace").checked = this.keepTrace;
        this.checkCurrentSettings();
    }

    loadModeEasy() {
        this.maxAttempts = 3;
        this.displayAutocomplete = true;
        this.showCorrectAnswer = true;
        this.showBorders = true;
        this.askAgain = true;
        this.keepTrace = true;
        this.toDom();
    }

    loadModeMedium() {
        this.maxAttempts = 1;
        this.displayAutocomplete = true;
        this.showCorrectAnswer = true;
        this.showBorders = true;
        this.askAgain = true;
        this.keepTrace = false;
        this.toDom();
    }

    loadModeTest() {
        this.maxAttempts = 1;
        this.displayAutocomplete = false;
        this.showCorrectAnswer = false;
        this.showBorders = false;
        this.askAgain = false;
        this.keepTrace = false;
        this.toDom();
    }

    isInTestMode() {
        return this.maxAttempts == 1
            && !this.displayAutocomplete
            && !this.showCorrectAnswer
            && !this.showBorders
            && !this.askAgain
            && !this.keepTrace;
    }

    isInMediumMode() {
        return this.maxAttempts == 1
            && this.displayAutocomplete
            && this.showCorrectAnswer
            && this.showBorders
            && this.askAgain
            && !this.keepTrace;
    }

    isInEasyMode() {
        return this.maxAttempts == 3
            && this.displayAutocomplete
            && this.showCorrectAnswer
            && this.showBorders
            && this.askAgain
            && this.keepTrace;
    }

    checkCurrentSettings() {
        this.fromDom();
        if (this.isInTestMode()) {
            console.log("Checked current settings: we're in TEST mode");
            document.getElementById("btn-load-config-easy").classList.remove("btn-primary");
            document.getElementById("btn-load-config-medium").classList.remove("btn-primary");
            document.getElementById("btn-load-config-test").classList.add("btn-primary");
        } else if (this.isInMediumMode()) {
            console.log("Checked current settings: we're in MEDIUM mode");
            document.getElementById("btn-load-config-easy").classList.remove("btn-primary");
            document.getElementById("btn-load-config-medium").classList.add("btn-primary");
            document.getElementById("btn-load-config-test").classList.remove("btn-primary");
        } else if (this.isInEasyMode()) {
            console.log("Checked current settings: we're in EASY mode");
            document.getElementById("btn-load-config-easy").classList.add("btn-primary");
            document.getElementById("btn-load-config-medium").classList.remove("btn-primary");
            document.getElementById("btn-load-config-test").classList.remove("btn-primary");
        } else {
            console.log("Checked current settings: we're in NONE mode");
            document.getElementById("btn-load-config-easy").classList.remove("btn-primary");
            document.getElementById("btn-load-config-medium").classList.remove("btn-primary");
            document.getElementById("btn-load-config-test").classList.remove("btn-primary");
        }
    }

    bindOnChangeEvents() {
        let self = this;
        [
            "input-config-maxAttempts",
            "input-config-displayAutocomplete",
            "input-config-showCorrectAnswer",
            "input-config-showBorders",
            "input-config-askAgain",
            "input-config-keepTrace"
        ].forEach(query => {
            document.getElementById(query).addEventListener("input", () => {
                self.checkCurrentSettings();
            });
        });


    }

}

const GLOBAL_CONFIG = new Config(GLOBAL_STORAGE);