
IMAGES = img/*.png
JS_SOURCES = js/*.js
JS_MAIN = app.js
JS = $(JS_SOURCES) $(JS_MAIN)
JS_INSTALLED = dist/$(JS_MAIN) dist/js/require.js

dist/index.html: index.html $(JS_INSTALLED)
	mkdir -p dist
	cp index.html dist/

dist/$(JS_MAIN): $(JS)
	node_modules/.bin/r.js -o mainConfigFile=app.js name=fancy out=dist/$(JS_MAIN)

dist/js/require.js: js/require.js
	mkdir -p dist/js
	cp js/require.js dist/js/

js/imageList.js: dbwrangle/locations.json fresh-dbwrangle
	(echo -n 'define({ imageList: '; cat dbwrangle/locations.json; echo '});') > js/imageList.js

fresh-dbwrangle:
	make -C dbwrangle

clean:
	rm -rf dist

.PHONY: clean fresh-dbwrangle
