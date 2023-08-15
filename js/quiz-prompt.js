const FONTS = ["Arial", "Verdana", "Helvetica", "Tahoma", "Trebuchet MS", "Times New Roman", "Georgia", "Garamond", "Courier New", "Brush Script MT"];


class QuizPrompt {
    constructor(config, data) {
        this.config = config;
        this.data = data;
        this.container = null;
    }

    inflate(container) {
        this.container = container;
        container.innerHTML = "";
    }

    load(index) { throw new Error("Not implemented!"); }

    searchForPreviousAnswers(index) {
        let previousAnswers = [];
        for (let i = 0; i < index; i++) {
            if (this.data.questions[index].prompt == this.data.questions[i].prompt) {
                previousAnswers.push(this.data.questions[i].answer);
            }
        }
        return previousAnswers;
    }

    displayPreviousAnswers(index) {
        let previousAnswers = this.searchForPreviousAnswers(index);
        let wrapper = this.container.querySelector(".prompt-previous-answers");
        wrapper.classList.add("hidden");
        let container = this.container.querySelector(".prompt-previous-answers-list");
        container.innerHTML = "";
        if (previousAnswers.length > 0) {
            wrapper.classList.remove("hidden");
            previousAnswers.forEach(answer => {
                let span = document.createElement("span");
                span.className = "label";
                span.textContent = answer;
                container.appendChild(span);
            });
        }
    }

}

class QuizPromptImage extends QuizPrompt {

    inflate(container) {
        QuizPrompt.prototype.inflate.call(this, container);
        this.container.appendChild(importTemplate("template-prompt-image"));
    }

    load(index) {
        this.container.querySelector(".prompt-image").src = this.data.questions[index].prompt;
        if (index < this.data.size - 1) {  // Preload the next image
            let image = new Image();
            image.src = this.data.questions[index + 1].prompt;
        }
        this.displayPreviousAnswers(index);
    }

}

class QuizPromptText extends QuizPrompt {

    inflate(container) {
        QuizPrompt.prototype.inflate.call(this, container);
        this.container.appendChild(importTemplate("template-prompt-text"));
    }

    load(index) {
        this.container.querySelector(".prompt-text").textContent = this.data.questions[index].prompt;
        this.displayPreviousAnswers(index);
    }

}

class QuizPromptSentence extends QuizPrompt {

    constructor(config, data) {
        super(config, data);
        let request = new XMLHttpRequest();
        request.open("get", data.settings.source, false);
        request.send();
        this.sentences = JSON.parse(request.responseText)
        this.currentIndex = null;
    }

    inflate(container) {
        QuizPrompt.prototype.inflate.call(this, container);
        let element = importTemplate("template-prompt-sentence");
        let self = this;
        element.querySelector("button.another-sentence").addEventListener("click", () => {
            if (self.currentIndex != null) {
                self.load(self.currentIndex);
            }
            let possibleInput = self.container.nextElementSibling.querySelector("input");
            if (possibleInput != null) {
                possibleInput.focus();
            }

        });
        this.container.appendChild(element);
    }

    load(index) {
        this.currentIndex = index;
        let self = this;
        if (this.sentences == null) {
            console.log("Sentences are not loaded, retrying in a bit…");
            setTimeout(() => {
                self.load(index);
            }, 100);
        } else {
            let element = this.container.querySelector(".prompt-sentence");
            element.textContent = choose(this.sentences[this.data.questions[index].prompt]);
            element.style.fontFamily = choose(FONTS);
        }
    }

}

class QuizPromptChessPosition extends QuizPrompt {

    inflate(container) {
        QuizPrompt.prototype.inflate.call(this, container);
        let board = document.createElement("div");
        board.classList.add("chess-board");
        for (let rank = 0; rank < 8; rank++) {
            let rank_element = document.createElement("div");
            rank_element.classList.add("chess-rank");
            for (let file = 0; file < 8; file++) {
                let cell = document.createElement("div");
                cell.classList.add("chess-cell");
                rank_element.appendChild(cell);
            }
            board.appendChild(rank_element);
        }
        this.container.appendChild(board);
    }

    parse_fen(fen) {
        let fen_split = fen.trim().split(" ");
        let placement_split = fen_split[0].split("/");
        let pieces = {};
        for (let i = 0; i < placement_split.length; i++) {
            let rank = i;
            let file = 0;
            for (let j = 0; j < placement_split[i].length; j++) {
                if (isNumeric(placement_split[i][j])) {
                    file += parseInt(placement_split[i][j]);
                } else if (isUppercase(placement_split[i][j])) {
                    pieces[`${rank},${file}`] = "w" + placement_split[i][j].toLowerCase();
                    file++;
                } else {
                    pieces[`${rank},${file}`] = "b" + placement_split[i][j].toLowerCase();
                    file++;
                }
            }
        }
        return pieces;
    }

    load(index) {
        let fen = this.data.questions[index].prompt;
        let pieces = this.parse_fen(fen);
        this.container.querySelectorAll(".chess-rank").forEach((rank_element, rank) => {
            rank_element.querySelectorAll(".chess-cell").forEach((cell, file) => {
                cell.innerHTML = "";
                let key = `${rank},${file}`;
                if (key in pieces) {
                    let piece_image = document.createElement("img");
                    piece_image.classList.add("chess-piece");
                    piece_image.src = formatChessPieceImage(pieces[key]);
                    cell.appendChild(piece_image);
                }
            });
        });
    }

}