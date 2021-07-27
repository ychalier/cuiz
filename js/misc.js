function startChronometer(container) {
    container.innerHTML = "0:00";
    let timeStart = new Date();
    QUIZ_TIME_INTERVAL = setInterval(function () {
        let elapsed = ((new Date()) - timeStart) / 1000;
        let minutes = Math.floor(elapsed / 60);
        let seconds = parseInt(elapsed - 60 * minutes);
        container.textContent = minutes.toString() + ":" + seconds.toString().padStart(2, "0");
    }, 100);
}

function animateIcon(path, target, colorClass) {
    let animForward = document.getElementById(target);
    let animBackward = document.getElementById("animToTag");
    path.classList.add(colorClass);
    animForward.beginElement();
    setTimeout(() => {
        animBackward.beginElement();
        path.classList.remove(colorClass);
    }, 1000);
}

function sendRequest(url, callback) {
    let request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        if (request.readyState === 4 && request.status === 200) {
            console.log("Received response from", url);
            if (callback != null) {
                callback(request.responseText);
            }
        } else if (request.readyState === 4) {
            console.log("Fetching", url, "raised an error:", request.status);
        }
    }
    console.log("Sending request to", url);
    request.open("get", url, true);
    request.send(null);
}

function toggleCollapsible(element) {
    if (element.style.maxHeight) {
        element.style.maxHeight = null;
    } else {
        element.style.maxHeight = Math.max(154, element.scrollHeight) + "px";
    }
}

function formatTimeRun(ms) {
    let minutes = Math.floor(ms / 60000);
    let seconds = Math.floor(ms / 1000) - 60 * minutes;
    let tenths = Math.floor((ms - 60000 * minutes - 1000 * seconds) / 100);
    return minutes + "<small>:</small>" + seconds.toString().padStart(2, "0") + "<small>." + tenths + "</small>";
}

function formatTimePrecise(ms) {
    let seconds = Math.floor(ms / 1000);
    let remaining = Math.floor(ms - 1000 * seconds);
    return seconds + "." + remaining.toString().padStart(3, "0");
}


class Confetti {
    constructor(COLORS) {
      this.style = COLORS[~~range(0, 5)];
      this.rgb = `rgba(${this.style[0]},${this.style[1]},${this.style[2]}`;
      this.r = ~~range(2, 6);
      this.r2 = 2 * this.r;
      this.replace();
    }

    replace() {
      this.opacity = 0;
      this.dop = 0.03 * range(1, 4);
      this.x = range(-this.r2, w - this.r2);
      this.y = range(-20, h - this.r2);
      this.xmax = w - this.r;
      this.ymax = h - this.r;
      this.vx = range(0, 2) + 8 * 0.5 - 5;
      return this.vy = 0.7 * this.r + range(-1, 1);
    }

    draw(context) {
      var ref;
      this.x += this.vx;
      this.y += this.vy;
      this.opacity += this.dop;
      if (this.opacity > 1) {
        this.opacity = 1;
        this.dop *= -1;
      }
      if (this.opacity < 0 || this.y > this.ymax) {
        this.replace();
      }
      if (!((0 < (ref = this.x) && ref < this.xmax))) {
        this.x = (this.x + this.xmax) % this.xmax;
      }
      return drawCanvasCircle(context, ~~this.x, ~~this.y, this.r, `${this.rgb},${this.opacity})`);
    }

  };

function range(a, b) {
    return (b - a) * Math.random() + a;
};

function drawCanvasCircle(context, x, y, r, style) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = style;
    return context.fill();
};


function startConfettiAnimation(duration) {
    console.log("Starting confetti animation");
    let canvas = document.createElement("canvas");
    let container = document.getElementById("confetti-container")
    container.appendChild(canvas);
    container.style.opacity = 1;
    container.classList.add("active");

    let requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    let cancelAnimationFrame = window.cancelAnimationFrame || window.mozCancelAnimationFrame;
    let animationFrameRequestId;

    let confetti, i;
    
    let NUM_CONFETTI = 350;

    let COLORS = [
        [53, 53, 105],
        [32, 32, 64],
        [87, 85, 217],
        [121, 119, 221],
        [66, 64, 212]
    ];

    let context = canvas.getContext("2d");
    
    window.w = canvas.width = window.innerWidth;
    window.h = canvas.height = window.innerHeight;
        
    confetti = (function() {
        var j, ref, results;
        results = [];
        for (i = j = 1, ref = NUM_CONFETTI; (1 <= ref ? j <= ref : j >= ref); i = 1 <= ref ? ++j : --j) {
        results.push(new Confetti(COLORS));
        }
        return results;
    })();
    
    function step() {
        var c, j, len, results;
        animationFrameRequestId = requestAnimationFrame(step);
        context.clearRect(0, 0, w, h);
        results = [];
        for (j = 0, len = confetti.length; j < len; j++) {
        c = confetti[j];
        results.push(c.draw(context));
        }
        return results;
    };
    
    animationFrameRequestId = requestAnimationFrame(step);

    setTimeout(() => {
        container.style.opacity = 0;
        setTimeout(() => {
            cancelAnimationFrame(animationFrameRequestId);
            container.innerHTML = "";
            container.classList.remove("active");
            container.style.opacity = 1;
        }, 1000);
    }, duration);

}
