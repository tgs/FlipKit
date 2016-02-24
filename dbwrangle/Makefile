all: locations.json


locations.json: urls.csv make-json-url-db.py
	./make-json-url-db.py "$<" $@


urls-tmp.csv: url-db-current.csv
	csvcut -C 'MAPS URL' "$<" > $@


urls.csv: urls-tmp.csv make-url-csv.py
	./make-url-csv.py "$<" $@

