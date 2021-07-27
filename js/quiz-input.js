
const MAP_TILE_PROVIDER = "https://a.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}@2x.png";


class QuizInput {

    constructor(config, data, quiz) {
        this.config = config;
        this.data = data;
        this.quiz = quiz;
        this.container = null;
    }

    inflate(container) { throw new Error("Not implemented!"); }

    clear() { throw new Error("Not implemented!"); }

    giveFeedback(polarity) { throw new Error("Not implemented!"); }

    showCorrectAnswer(index) { throw new Error("Not implemented!"); }

    evaluate(index) { throw new Error("Not implemented!"); }

}


class QuizInputText extends QuizInput {

    constructor(config, data, quiz) {
        super(config, data, quiz);
        this.dom = {
            input: null,
            autocomplete: null,
            icon: null,
            form: null
        }
        this.candidates = [];
        data.questions.forEach(question => {
            if (!this.candidates.includes(question.answer)) {
                this.candidates.push(question.answer);
            }
        });
        this.candidates.sort();
        this.disabled = false;
    }

    gatherSuggestions(prefix) {
        let suggestions = [];
        this.candidates.forEach(candidate => {
            if (normalize(candidate).startsWith(prefix)) {
                suggestions.push(candidate);
            }
        });
        return suggestions;
    }

    inflateAutoComplete(suggestions) {
        let self = this;
        this.dom.autocomplete.innerHTML = "";
        suggestions.forEach(suggestion => {
            let span = document.createElement("span");
            span.className = "label label-rounded text-small";
            span.textContent = suggestion;
            span.addEventListener("click", (event) => {
                self.dom.input.value = suggestion;
                self.quiz.submit();
            });
            this.dom.autocomplete.appendChild(span);
        });
    }

    inflate(container) {
        this.disabled = false;
        this.container = container;
        container.innerHTML = "";
        let element = importTemplate("template-input-" + this.data.input);
        let self = this;
        element.querySelector("form").addEventListener("submit", (event) => {
            event.preventDefault();
            if (!self.disabled) {
                self.quiz.submit();
            }
        });
        this.dom.input = element.querySelector("input.form-input");
        this.dom.icon = element.querySelector("svg path");
        this.dom.form = element.querySelector("form");
        this.dom.autocomplete = element.querySelector(".autocomplete");

        this.dom.input.addEventListener("input", () => {
            let prefix = normalize(self.dom.input.value);
            let suggestions = [];
            if (prefix.length > 0) {
                suggestions = self.gatherSuggestions(prefix);
            }
            if (self.config.displayAutocomplete) {
                self.inflateAutoComplete(suggestions);
            }
            if (suggestions.length == 1 && prefix == normalize(suggestions[0])) {
                self.quiz.submit();
            }
        });

        this.dom.input.addEventListener("keydown", (event) => {
            if (event.keyCode == 9) { // TAB
                event.preventDefault();
                let prefix = normalize(self.dom.input.value);
                let suggestions = self.gatherSuggestions(prefix);
                if (suggestions.length == 1) {
                    self.dom.input.value = suggestions[0];
                    self.quiz.submit();
                }
                self.dom.input.focus();
            }
        });

        element.querySelector(".answer-close").addEventListener("click", () => {
            toggleCollapsible(self.container.querySelector(".answer"));
            self.disabled = false;
            this.container.querySelector("fieldset").disabled = false;
            self.quiz.next();
        });

        container.appendChild(element);
    }

    evaluate(index) {
        console.log("Evaluating text input: value is \"" + this.dom.input.value + "\" while answer is \"" + this.data.questions[index].answer + "\"");
        let proposition = normalize(this.dom.input.value);
        if (normalize(this.data.questions[index].answer) == proposition) {
            return true;
        }
        for (let i = index + 1; i < this.data.size; i++) {
            if (this.data.questions[i].prompt == this.data.questions[index].prompt && normalize(this.data.questions[i].answer) == proposition) {
                let aux = this.data.questions[i];
                this.data.questions[i] = this.data.questions[index];
                this.data.questions[index] = aux;
                return true;
            }
        }
        return false;
    }

    clear() {
        this.dom.form.reset();
        this.dom.input.focus();
        this.dom.autocomplete.innerHTML = "";
    }

    giveFeedback(polarity) {
        if (polarity) {
            animateIcon(this.dom.icon, "animToCheck", "path-success");
        } else {
            animateIcon(this.dom.icon, "animToCross", "path-error");
        }
    }

    showCorrectAnswer(index) {
        this.clear();
        this.container.querySelector("fieldset").disabled = true;
        this.disabled = true;
        let container = this.container.querySelector(".answer");
        toggleCollapsible(container);
        container.querySelector(".answer-value").textContent = this.data.questions[index].answer;
        if (this.data.questions[index].tips != null) {
            container.querySelector(".answer-tips").innerHTML = this.data.questions[index].tips;
        } else {
            container.querySelector(".answer-tips").textContent = "Aucune indication renseignée pour cette question.";
        }
        container.querySelector("button").focus();
    }

}

const FEATURE_STATE_OFF = 0;
const FEATURE_STATE_SUCCESS = 1;
const FEATURE_STATE_ERROR = 2;
const FEATURE_STATE_HIGHLIGHT = 3;

class QuizInputMap extends QuizInput {

    constructor(config, data, quiz) {
        super(config, data, quiz);
        this.map = null;
        this.bounds = null;
        this.features = {};
        this.states = {};
        this.selection = null;
        this.disabled = false;
        let request = new XMLHttpRequest();
        request.open("get", this.data.settings.source, false);
        request.send();
        this.polygons = JSON.parse(request.responseText);
    }

    inflate(container) {
        container.innerHTML = "";
        container.appendChild(importTemplate("template-input-map"));
        this.map = L.map(container.querySelector(".input-map"), {
            center: [0, 0],
            zoom: 2,
            maxBounds: this.polygons.maxBounds
        });

        L.tileLayer(MAP_TILE_PROVIDER, {
            noWrap: true,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(this.map);

        let stroke = null;
        if (this.config.showBorders) {
            stroke = "#4240d4";
        }

        let self = this;

        let featureIdSelection = [];
        this.data.questions.forEach(question => {
            featureIdSelection.push(question.answer);
        });

        for (let featureId in this.polygons.polys) {
            let feature = L.geoJson(
                this.polygons.polys[featureId],
                {
                    style: {
                        weight: 1,
                        stroke: stroke,
                        fillOpacity: 0,
                        color: "#4240d4",
                    },
                    onEachFeature: (_, layer) => {
                        layer.on({
                            click: _ => { self.handleClick(featureId); },
                        });
                    },
                }
            )
            feature.addTo(this.map);
            if (featureIdSelection.includes(featureId)) {
                if (this.bounds == null) {
                    this.bounds = feature.getBounds();
                } else {
                    this.bounds.extend(feature.getBounds());
                }
            }
            this.features[featureId] = feature;
            this.states[featureId] = FEATURE_STATE_OFF;
        }

        console.log("Map boundaries:", this.bounds);

        setTimeout(() => {
            this.map.invalidateSize();
            this.map.fitBounds(this.bounds);
        }, 10);

    }

    clear() {
        this.selection = null;
    }

    handleClick(featureId) {
        if (!this.disabled) {
            this.selection = featureId;
            this.quiz.submit();
        }
    }

    evaluate(index) {
        console.log("Selected feature is", this.selection);
        return this.data.questions[index].answer == this.selection;
    }

    setFeatureStyle(featureId, state=null) {
        if (state == null) {
            state = this.states[featureId];
        }
        if (state == FEATURE_STATE_OFF) {
            this.features[featureId].setStyle({
                color: "#4240d4",
                fillOpacity: 0,
            });
        } else if (state == FEATURE_STATE_SUCCESS) {
            this.features[featureId].setStyle({
                color: "#32b643",
                fillOpacity: 0.5,
            });
        } else if (state == FEATURE_STATE_ERROR) {
            this.features[featureId].setStyle({
                color: "crimson",
                fillOpacity: 0.5,
            });
        } else if (state == FEATURE_STATE_HIGHLIGHT) {
            this.features[featureId].setStyle({
                color: "#b65a32",
                fillOpacity: 0.5
            });
        }
    }

    giveFeedback(polarity, willReoccur) {
        let polarityState = polarity ? FEATURE_STATE_SUCCESS : FEATURE_STATE_ERROR;
        if (this.config.keepTrace && !willReoccur) {
            if (polarity) {
                this.states[this.selection] = FEATURE_STATE_SUCCESS;
            }
        }
        let featureId = this.selection;
        this.setFeatureStyle(featureId, polarityState);
        setTimeout(() => {
            this.setFeatureStyle(featureId);
        }, 500);
    }

    showCorrectAnswer(index) {
        let featureId = this.data.questions[index].answer;
        this.setFeatureStyle(featureId, FEATURE_STATE_HIGHLIGHT);
        if (!this.config.askAgain && this.config.keepTrace) {
            this.states[featureId] = FEATURE_STATE_ERROR;
        }
        let marker = L
            .marker(this.features[featureId].getBounds().getCenter())
            .addTo(this.map)
            .bindTooltip(this.data.questions[index].label + " &times;")
            .openTooltip();
        let self = this;
        this.disabled = true;
        marker.on("click", () => {
            this.setFeatureStyle(featureId);
            self.map.removeLayer(marker);
            self.disabled = false;
            self.quiz.next();
        });
    }

}
