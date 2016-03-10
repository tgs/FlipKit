#!/usr/bin/env python

import tablib
import sys

def find(lst):
    for i, el in enumerate(lst):
        if el:
            yield i


tab = (tablib.Dataset()
       .load(open(sys.argv[1]).read())
       .subset(cols=['OBJECTID', 'TITLE', 'MAPS URL', 'Notes', 'CAT Record URL']))
tab.headers[2] = 'MAPS_URL'
tab = tab.subset(rows=find(tab['MAPS_URL']))

with open(sys.argv[2], 'w') as out:
    print >>out, tab.csv

