import glob
import jsmin
import rcssmin
import re


def main():
    raw_js = ""
    for path in glob.glob("js/*.js"):
        with open(path, "r", encoding="utf8") as file:
            raw_js += file.read()
    minified_js = jsmin.jsmin(raw_js)
    with open("cuiz.js", "w", encoding="utf8") as file:
        file.write(minified_js)
    with open("master.css", "r", encoding="utf8") as file:
        raw_css = file.read()
    minified_css = rcssmin.cssmin(raw_css)
    with open("cuiz.css", "w", encoding="utf8") as file:
        file.write(minified_css)

    with open("index.html", "r", encoding="utf8") as file:
        html = file.read()
    
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/master\.js\"></script> *", "    <script type=\"text/javascript\" src=\"js/cuiz.js\"></script>", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/misc\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/history\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/storage\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/config\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/quiz\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/quiz\-input\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/quiz\-prompt\.js\"></script> *\n", "", html)
    html = re.sub(" *<script type=\"text/javascript\" src=\"js/menu\.js\"></script> *\n", "", html)
    html = re.sub("href=\"master.css\"", "href=\"cuiz.css\"", html)

    with open("index.html", "w", encoding="utf8") as file:
        file.write(html)

if __name__ == "__main__":
    main()