/*
    Implémentations par défaut (sans effet) des points d'accroche du coeur.
    benchmarkStart / benchmarkElapsed sont déclarés dans common.hpp,
    publish_progress dans platform.hpp.

    Licence : GNU Affero General Public License v3 ou ultérieure.
*/
#include "platform.hpp"

extern "C" {

void benchmarkStart() {}
void benchmarkElapsed(const char *text) { (void)text; }
void publish_progress(int step) { (void)step; }

}
