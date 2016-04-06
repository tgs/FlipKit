locations.json: current.csv make-json-url-db.py pctry.py image-info fixes.json
	./make-json-url-db.py "$<" $@

image-info: Makefile ../collection/800/*.jpg
	echo "{" > image-info
	identify ../collection/800/*.jpg -format '"%f": { "width": %w, "height": %h },\n' >> image-info
	echo "}" >> image-info
