# VotAR web, portage iOS par navigateur

Version web de [VotAR](https://votar.libre-innovation.org/) (Stephane Poinsart,
**AGPL v3 ou ultérieure**), pour les téléphones iOS de l'équipe. Le coeur de
reconnaissance C++ est compilé en WebAssembly et tourne dans Safari, sans App Store.

Fork de `../votar-android/`, qui reste intact.

## Plan

| Étape | État |
|---|---|
| 1. Isoler le coeur de toute dépendance Android | fait |
| 2. Compiler en WebAssembly (Emscripten) et comparer au natif | fait |
| 3. Page web : photo, analyse WebAssembly, barres a/b/c/d (`docs/`) | fait, testé dans Chromium, pas encore sur iPhone |
| 4. Héberger (GitHub Pages) et tester sur un iPhone | à faire |

**Critère de réussite :** une même photo donne le même résultat en natif, en
WebAssembly et sur Android.

## Étape 1 : ce qui a changé dans le coeur

`core/count-simple.cpp` est la copie de `votar-android/app/src/main/cpp/count-simple.cpp`.
Seul le bloc d'`#include` et de logs change : les appels à `android/log.h`,
`android/bitmap.h`, `endian.h` et `include/android.hpp` sont remplacés par
`platform.hpp`. L'algorithme n'est pas touché.

| Fichier | Rôle |
|---|---|
| `core/count-simple.cpp`, `.hpp` | L'algorithme d'origine |
| `core/common.hpp` | Constantes et macros d'origine, plus un `#pragma once` |
| `core/platform.hpp`, `.cpp` | Logs (stderr), chronomètre et progression, sans effet par défaut |
| `tests/analyze_cli.cpp` | Banc d'essai : pixels RGBA bruts en entrée, JSON en sortie |
| `tools/to_rgba.py` | Photo (webp, jpg, png) vers pixels RGBA bruts (Pillow) |
| `tests/expected/amphi.json` | Résultat de référence sur la photo de test |

## Lancer les tests

```bash
make check        # natif : g++ et Python avec Pillow
make check-wasm   # WebAssembly : Emscripten (emcc dans le PATH) et Node
```

La photo de test montre des personnes reconnaissables : elle n'est pas dans le dépôt public.
Dans le dépôt privé elle est dans `context/import/`, c'est le `PHOTO` par défaut du `Makefile`.
Ailleurs, passer `PHOTO=chemin/vers/la/photo.webp`. Le résultat de référence ne vaut que pour cette photo.

Les deux analysent la photo de test et comparent au
résultat de référence : 44 marques, B=14 et C=30. Le module WebAssembly donne
exactement le même résultat que le natif, marque par marque.

## Étape 2 : le module WebAssembly

`core/wasm_api.cpp` expose trois fonctions au JavaScript : `votar_analyze(pixels, largeur, hauteur)`,
`votar_prcount()` et `votar_marks()`. Le JavaScript copie les pixels RGBA dans la mémoire du
module, appelle l'analyse, puis relit les résultats. Testé avec Emscripten 3.1.74.

## Étape 3 : la page web (`docs/`)

Site statique sans dépendance, publiable tel quel. `make site` recompile le module et le copie dans `docs/`. Le dossier s'appelle `docs/` parce que
GitHub Pages ne sait publier que la racine ou `docs/`.

| Fichier | Rôle |
|---|---|
| `docs/index.html`, `style.css` | Écran fidèle à l'app Android : photo, quatre barres, boutons Appareil photo et Galerie |
| `docs/app.js` | Charge la photo, la réduit si besoin, appelle le module, dessine les marques et les barres |
| `docs/votar.js`, `votar.wasm` | Module compilé (`make site`), commité pour que le site soit publiable |
| `docs/sw.js`, `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil et ouverture sans réseau |

La page remplace l'écran Java de l'app Android. L'ancien `index.html` d'Android est autre
chose : la page d'affichage à distance pour ordinateur et vidéoprojecteur, qui s'appuie sur un
serveur local qu'un iPhone ne peut pas lancer. Elle n'est pas reprise.

Test de bout en bout : `npm install` puis `make check-browser` ouvre la vraie page dans
Chromium, charge la photo de test et compare au résultat natif (44 marques, B=14, C=30).

## Décisions

- Hébergement : GitHub Pages, dépôt public séparé `votar-web`, soit `https://kounick.github.io/votar-web/`.
- Téléphone seul : pas d'affichage à distance pour le moment.
- Look fidèle à Android.
- Photos réduites au-delà de 13 millions de pixels (dimensions divisées par 2), comme Android.
  Un iPhone de 12 Mpx est analysé en pleine résolution.

## À savoir

- Non testé sur Safari iOS : la caméra, l'orientation EXIF et la mémoire sur un vieil iPhone
  restent à vérifier sur un vrai téléphone (étape 4).
- Les liens « Sources de cette version » pointent vers le dépôt public, à créer à l'étape 4.

## Différences avec Android

- Android décode la photo avec un sous-échantillonnage (`computeSampleSize`) qui
  dépend de la mémoire de l'appareil, jusqu'à 24 millions de pixels, puis applique
  l'orientation EXIF. Le web réduit la photo de la même façon (seuil de 13 Mpx), mais le
  navigateur lisse l'image réduite au lieu de l'échantillonner : au-delà du seuil, les
  résultats peuvent différer légèrement.
- Le coeur lit des pixels `R,G,B,A` octet par octet (`0xAABBGGRR` en mémoire
  little-endian). C'est le format du `canvas` d'un navigateur, aucune conversion.

## Licence

AGPL v3 ou ultérieure. Les en-têtes de copyright de Stephane Poinsart sont conservés.
