import simplejson
import argparse
import glob
import os
import slugify
import subprocess
import wikipedia


def create_index(path_quizzes, path_index):
    index = list()
    
    for path in glob.glob(os.path.join(path_quizzes, "*.json")):
        with open(path, "r", encoding="utf8") as file:
            quiz = simplejson.load(file)
        index.append({
            "id": quiz["id"],
            "title": quiz["title"],
            "dataset": path,
            "size": quiz["size"],
            "category": quiz["category"],
            "thumbnail": quiz["thumbnail"]
        })
    assert len({quiz["id"] for quiz in index}) == len(index), "Quiz ids must be unique!"
    index.sort(key=lambda quiz: quiz["id"])
    categories = list()
    for quiz in index:
        if quiz["category"] not in categories:
            categories.append(quiz["category"])
    with open(path_index, "w", encoding="utf8") as file:
        simplejson.dump(
            {
                "quizzes": index,
                "categories": categories
            },
            file,
            indent=4,
            sort_keys=True
        )


def create_thumbnail(background, foreground, fname):
    process = subprocess.Popen([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        background,
        "-i",
        foreground,
        "-filter_complex",
        "overlay,scale=300x100",
        fname,
        "-y"
    ])
    process.wait()


def generate_quizzes(base_path, id_offset, path_quizzes):
    with open(base_path, "r", encoding="utf8") as file:
        base = simplejson.load(file)
    quizzes = list()
    category_index = {
        category["key"]: []
        for category in base["categories"]
    }
    for entity in base["entities"]:
        category_index["[all]"].append(entity)
        if entity["category"] is not None:
            category_index[entity["category"]].append(entity)
    for ppty in base["properties"]:
        for category in base["categories"]:
            thumbnail = "data/thumbnails/%d.jpg" % (len(quizzes) + id_offset)
            create_thumbnail(category["img"], ppty["img"], thumbnail)
            quiz = {
                "id": len(quizzes) + id_offset,
                "category": base["title"] + " – " + category["key"].replace("[all]", "Totalité"),
                "input": ppty["input"],
                "prompt": ppty["prompt"],
                "thumbnail": thumbnail,
                "size": 0,
                "title": ppty["key"],
                "questions": [],
                "settings": ppty["settings"]
            }
            for entity in category_index[category["key"]]:
                for ppty_value in entity["properties"][ppty["key"]]:
                    question_label = entity["label"]
                    if ppty["input"] == "text" and ppty["prompt"] == "text":
                        question_label = "%s (%s)" % (ppty_value["value"], entity["label"])
                    assert entity["wikipedia"] is not None, "Missing Wikipédia link for " + entity["label"]
                    generic_tips = 'Pour en apprendre plus&nbsp;: <a href="%s">%s (Wikipédia)</a>' % (
                        entity["wikipedia"],
                        entity["label"]
                    )
                    if ppty_value["tips"] is None:
                        question_tips = generic_tips
                    else:
                        question_tips = "%s. %s." % (
                            ppty_value["tips"],
                            generic_tips
                        )
                    if ppty["input"] == "text":
                        question = {
                            "id": len(quiz["questions"]),
                            "answer": entity["label"],
                            "prompt": ppty_value["value"],
                            "label": question_label,
                            "tips": question_tips
                        }
                    elif ppty["input"] == "map":
                        question = {
                            "id": len(quiz["questions"]),
                            "prompt": entity["label"],
                            "answer": ppty_value["value"],
                            "label": question_label,
                            "tips": question_tips
                        }
                    quiz["questions"].append(question)
                    quiz["size"] += 1
            quizzes.append(quiz)
    print("Generated %d quizzes" % len(quizzes))
    for quiz in quizzes:
        fname = str(quiz["id"]) + ".json"
        with open(os.path.join(path_quizzes, fname), "w", encoding="utf8") as file:
            simplejson.dump(quiz, file, indent=4, sort_keys=True)


def wikipedia_lookup(base_path):
    with open(base_path, "r", encoding="utf8") as file:
        base = simplejson.load(file)
    wikipedia.set_lang("fr")
    for entity in base["entities"]:
        if entity["wikipedia"] is not None:
            continue
        results = wikipedia.search(entity["label"])
        if len(results) == 0:
            entity["wikipedia"] = input("No result found. Please give the URL for '%s'\n> " % entity["label"]).strip()
            continue
        try:
            page = wikipedia.page(results[0])
            entity["wikipedia"] = page.url
        except wikipedia.exceptions.DisambiguationError:
            entity["wikipedia"] = input("Please disambiguate '%s'\n> " % entity["label"]).strip()
        except wikipedia.exceptions.PageError:
            entity["wikipedia"] = input("There was an issue. Please give the URL for '%s'\n> " % entity["label"]).strip()
    with open(base_path, "w", encoding="utf8") as file:
        simplejson.dump(base, file, indent=4, sort_keys=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path-quizzes", type=str, default="data/quizzes")
    parser.add_argument("--path-index", type=str, default="data/index.json")
    action_parser = parser.add_subparsers(dest="action", required=True)
    action_parser.add_parser("index")
    generate_parser = action_parser.add_parser("generate")
    generate_parser.add_argument("base_path", type=str)
    generate_parser.add_argument("id_offset", type=int)
    wikipedia_parser = action_parser.add_parser("wikipedia")
    wikipedia_parser.add_argument("base_path", type=str)
    args = parser.parse_args()
    if args.action == "index":
        create_index(args.path_quizzes, args.path_index)
    elif args.action == "generate":
        generate_quizzes(args.base_path, args.id_offset, args.path_quizzes)
    elif args.action == "wikipedia":
        wikipedia_lookup(args.base_path)


if __name__ == "__main__":
    main()
