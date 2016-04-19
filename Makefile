gulp := node_modules/.bin/gulp

default: all

$(gulp): package.json
	npm install .

dist:
	mkdir dist
	cd dist && \
		ln -s ../img img && \
		ln -s ../collection collection && \
		ln -s ../css css && \
		ln -s ../fonts fonts

build:
	mkdir build
	cd build && \
		ln -s ../img img && \
		ln -s ../collection collection && \
		ln -s ../css css && \
		ln -s ../fonts fonts

build/index.html build/index.js: app/index.html app/index.js app/js/*.js fresh-dbwrangle build
	$(gulp)

fresh-dbwrangle:
	make -C dbwrangle

clean:
	rm -rf dist build

all: build build/index.html

.PHONY: clean fresh-dbwrangle
