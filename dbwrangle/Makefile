all: locations.json


locations.json: locations.json.tmp
	#json_pp < "$<" > $@
	cp "$<" "$@"

locations.json.tmp: urls.csv make-json-url-db.py pctry.py ../collection/image-info
	./make-json-url-db.py "$<" $@


urls-tmp.csv: current.csv
	csvcut -C 'MAPS URL' "$<" > $@


urls.csv: urls-tmp.csv make-url-csv.py
	./make-url-csv.py "$<" $@

