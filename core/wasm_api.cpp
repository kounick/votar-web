/*
    Points d'entrée WebAssembly du coeur VotAR.

    Le JavaScript copie les pixels RGBA de la photo dans la mémoire du module,
    appelle votar_analyze, puis lit les résultats par les deux accesseurs.

    Licence : GNU Affero General Public License v3 ou ultérieure.
*/
#include <emscripten.h>
#include <string.h>

#include "count-simple.hpp"

static int g_mark[MAX_MARK_COUNT][3];
static int g_markcount = 0;
static int g_prcount[4] = {0, 0, 0, 0};

extern "C" {

// pixels : width * height entiers 32 bits, octets R,G,B,A, de haut en bas.
// Le tableau est modifié (les marques y sont dessinées, comme dans la version Android).
// Retourne le nombre de marques détectées, ou -1 en cas d'échec.
EMSCRIPTEN_KEEPALIVE
int votar_analyze(unsigned int *pixels, unsigned int width, unsigned int height) {
    memset(g_mark, 0, sizeof(g_mark));
    g_markcount = 0;
    g_prcount[0] = g_prcount[1] = g_prcount[2] = g_prcount[3] = 0;
    if (!simple_analyze(pixels, width, height, g_mark, g_markcount, g_prcount))
        return -1;
    return g_markcount;
}

// 4 entiers : nombre de votes pour A, B, C, D.
EMSCRIPTEN_KEEPALIVE
const int *votar_prcount() { return g_prcount; }

// markcount triplets (x, y, rotation du motif).
EMSCRIPTEN_KEEPALIVE
const int *votar_marks() { return &g_mark[0][0]; }

}
