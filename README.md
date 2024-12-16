# Cuiz

Quizs en ligne, outils de mémorisation et classement en contre-la-montre.

:arrow_right: <https://chalier.fr/cuiz/>

## Quiz personnalisé

Chaque quiz est défini dans un fichier JSON particulier. Pour jouer à un quiz personnalisé, il suffit de téléverser ou donner une URL vers un fichier JSON de son choix. Ce fichier doit respecter le format suivant (où il faut remplacer les `...`):

```json
{
    "category": "Personnalisé",
    "id": -1,
    "input": ...,
    "prompt": ...,
    "questions": [
        ...
    ],
    "settings": {
        ...
    },
    "size": ...,
    "thumbnail": null,
    "title": ...
}
```

Le champ `questions` est un tableau contenant toutes les questions du quiz. Ces questions doivent respecter le format suivant :

```json
{
    "answer": ...,
    "id": ...,
    "label": ...,
    "prompt": ...,
    "tips": ...
}
```

Le champ `input` détermine l'interface de saisie des réponses. Deux valeurs sont possibles :

- `text` : une simple saisie textuelle ; le champ `answer` d'une question contient le texte à taper pour valider la question,
- `map` : une carte sur laquelle il faut cliquer sur le bon endroit ; le champ `answer` d'une question contient l'identifiant d'une *Feature GeoJSON* sur laquelle il faut cliquer pour valider la question ; le champ `settings` doit alors contenir un champ `source` dont la valeur est une URL vers le jeu données contenant toutes les *Feature GeoJSON* ([en voici un exemple](https://github.com/ychalier/pifekit/tree/main/datasets)).

Le champ `prompt` détermine l'interface d'affichage des questions. Trois valeurs sont possibles :

- `text` : du simple texte ; le champ `prompt` d'une question contient l'intitulé de la question,
- `image` : une image (par exemple un drapeau à identifier) ; le champ `prompt` d'une question contient une URL vers l'image à afficher,
- `sentence` : une phrase aléatoire dans un langue donnée ; le champ `prompt` d'une question contient l'idenfiant de cette langue ; le champ `settings` doit alors contenir un champ `source` dont la valeur est une URL vers le jeu données contenant toutes les phrases de chaque langue ([en voici un exemple](https://github.com/ychalier/pifekit/tree/main/datasets)).

Le champ `size` contient le nombre total de questions.

Chaque question doit posséder un `id` différent. Le `label` est une petite chaîne de caractères représentant la question. Le `tips` est un texte d'aide s'affichant lors d'un échec à la question.
