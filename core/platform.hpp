/*
    Couche "plateforme" du coeur VotAR, ajoutée pour le portage web/iOS.

    Le code d'origine (count-simple.cpp) dépendait d'Android uniquement pour
    trois choses : les logs, le chronomètre et le suivi de progression.
    Elles sont regroupées ici pour que le coeur compile partout.

    Copyright (C) 2013 Stephane Poinsart <s@poinsart.com> (code d'origine)
    Licence : GNU Affero General Public License v3 ou ultérieure.
*/
#pragma once

#include <stdio.h>
#include "common.hpp"

// Les logs partent sur stderr. Définir VOTAR_QUIET pour les couper.
#ifdef VOTAR_QUIET
#define Log_i(...)  ((void)0)
#define Log_w(...)  ((void)0)
#define Log_e(...)  ((void)0)
#else
#define Log_i(...)  do { fprintf(stderr, "[i] "); fprintf(stderr, __VA_ARGS__); fputc('\n', stderr); } while (0)
#define Log_w(...)  do { fprintf(stderr, "[w] "); fprintf(stderr, __VA_ARGS__); fputc('\n', stderr); } while (0)
#define Log_e(...)  do { fprintf(stderr, "[e] "); fprintf(stderr, __VA_ARGS__); fputc('\n', stderr); } while (0)
#endif

extern "C" {

// Appelé par le coeur à 3 étapes de l'analyse (1, 2, 3). Sans effet par défaut.
void publish_progress(int step);

}
