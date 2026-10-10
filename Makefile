# Banc d'essai natif du coeur VotAR (étape 1 du portage web/iOS).
#   make check       compile le coeur en natif, analyse la photo de test, compare au résultat attendu
#   make check-wasm  compile en WebAssembly (Emscripten requis, voir EMSDK) et compare au même résultat
#   make check-browser  teste la vraie page dans Chromium (npm install d'abord)
#   make site        compile le module et le copie dans docs/ (le site à publier)
#   make clean
#
# Emscripten : source $$EMSDK/emsdk_env.sh avant make check-wasm (emcc dans le PATH).

CXX      ?= g++
CXXFLAGS ?= -std=gnu++17 -O2 -Wall -Icore
# La photo de test (visages) n'est pas dans le dépôt public : PHOTO=chemin/vers/photo.webp
PHOTO    ?= ../../context/import/votar-photo-test-amphi.webp
EXPECTED := tests/expected/amphi.json

build/analyze_native: core/count-simple.cpp core/platform.cpp tests/analyze_cli.cpp core/*.hpp
	@mkdir -p build
	$(CXX) $(CXXFLAGS) core/count-simple.cpp core/platform.cpp tests/analyze_cli.cpp -o $@

build/amphi.rgba: $(PHOTO) tools/to_rgba.py
	@mkdir -p build
	python3 -I tools/to_rgba.py $(PHOTO) $@ > build/amphi.size

check: build/analyze_native build/amphi.rgba
	build/analyze_native build/amphi.rgba $$(cat build/amphi.size) 2>/dev/null > build/amphi.json
	diff -u $(EXPECTED) build/amphi.json && echo "OK : résultat identique au résultat attendu"

build/votar.js: core/count-simple.cpp core/platform.cpp core/wasm_api.cpp core/*.hpp
	@mkdir -p build
	emcc -O2 -DVOTAR_QUIET -Icore core/count-simple.cpp core/platform.cpp core/wasm_api.cpp \
		-sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createVotar -sALLOW_MEMORY_GROWTH=1 -sENVIRONMENT=web,node \
		-sEXPORTED_FUNCTIONS=_malloc,_free,_votar_analyze,_votar_prcount,_votar_marks \
		-sEXPORTED_RUNTIME_METHODS=HEAPU8,HEAP32 -o $@

# Copie le module compilé dans le site (docs/), prêt à être publié.
site: build/votar.js
	cp build/votar.js build/votar.wasm docs/

build/amphi.png: $(PHOTO)
	@mkdir -p build
	python3 -I -c "from PIL import Image; Image.open('$(PHOTO)').convert('RGB').save('$@')"

# Test de bout en bout dans Chromium (npm install d'abord). La photo passe en PNG sans perte
# pour que le décodage du navigateur soit identique à celui de Pillow.
# "env node" : après `source emsdk_env.sh`, le dossier emsdk contient un sous-dossier "node"
# que make confond avec le programme node lorsqu'il le lance directement.
check-browser: site build/amphi.png
	env node tests/e2e_browser.mjs build/amphi.png $(EXPECTED)

check-wasm: build/votar.js build/amphi.rgba
	node tests/wasm_check.mjs build/votar.js build/amphi.rgba $$(cat build/amphi.size) $(EXPECTED)

clean:
	rm -rf build

.PHONY: check check-wasm check-browser site clean
