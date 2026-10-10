/*
    Banc d'essai en ligne de commande pour le coeur VotAR.

    Usage : analyze_cli photo.rgba largeur hauteur
    Sortie : un JSON sur stdout (prcount, nombre de marques, positions).
    Les logs du coeur vont sur stderr.

    Licence : GNU Affero General Public License v3 ou ultérieure.
*/
#include <stdio.h>
#include <stdlib.h>
#include <vector>

#include "count-simple.hpp"

int main(int argc, char **argv) {
    if (argc != 4) {
        fprintf(stderr, "usage: %s photo.rgba largeur hauteur\n", argv[0]);
        return 2;
    }
    unsigned int width = (unsigned int)atoi(argv[2]);
    unsigned int height = (unsigned int)atoi(argv[3]);

    std::vector<unsigned int> pixels((size_t)width * height);
    FILE *f = fopen(argv[1], "rb");
    if (!f) { perror("open"); return 1; }
    size_t got = fread(pixels.data(), sizeof(unsigned int), pixels.size(), f);
    fclose(f);
    if (got != pixels.size()) {
        fprintf(stderr, "fichier trop court : %zu pixels lus sur %zu\n", got, pixels.size());
        return 1;
    }

    static int mark[MAX_MARK_COUNT][3];
    int markcount = 0;
    int prcount[4] = {0, 0, 0, 0};

    if (!simple_analyze(pixels.data(), width, height, mark, markcount, prcount)) {
        fprintf(stderr, "simple_analyze a échoué\n");
        return 1;
    }

    printf("{\"width\":%u,\"height\":%u,\"prcount\":[%d,%d,%d,%d],\"markcount\":%d,\"marks\":[",
           width, height, prcount[0], prcount[1], prcount[2], prcount[3], markcount);
    for (int i = 0; i < markcount; i++)
        printf("%s[%d,%d,%d]", i ? "," : "", mark[i][0], mark[i][1], mark[i][2]);
    printf("]}\n");
    return 0;
}
