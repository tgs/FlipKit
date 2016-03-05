all: locations.json


locations.json: locations.json.tmp
	json_pp < "$<" > $@

locations.json.tmp: urls.csv make-json-url-db.py pctry.py
	./make-json-url-db.py "$<" $@


urls-tmp.csv: url-db-current.csv
	csvcut -C 'MAPS URL' "$<" > $@


urls.csv: urls-tmp.csv make-url-csv.py
	./make-url-csv.py "$<" $@

