#!/usr/bin/env python

import csv
from urllib import quote_plus

rdr = csv.DictReader(open('geocode-db-in.csv'))
print ', '.join(rdr.fieldnames)
wtr = csv.DictWriter(open('geocode-db-out.csv', 'w'),
                     fieldnames=rdr.fieldnames + ['Search URL'])

BASE = 'https://www.google.com/maps/search/'
for row in rdr:
    row['Search URL'] = BASE + quote_plus(
        "{} and {} {}, Washington, DC"
        .format(row['Street'], row['Cross Street'], row['Quadrant']))
    wtr.writerow(row)
