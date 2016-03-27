#!/usr/bin/env python

import tablib
import sys

def find(lst):
    for i, el in enumerate(lst):
        if el:
            yield i


tab = (tablib.Dataset()
       .load(open(sys.argv[1]).read())
       .subset(cols=['OBJECTID', 'TITLE', 'MAPS URL', 'Notes',
                     'CAT Record URL', 'Tag 1', 'Tag 2', 'Refined Position']))
tab.headers[2] = 'MAPS_URL'
tab.headers[5] = 'Tag_1'
tab.headers[6] = 'Tag_2'
tab = tab.subset(rows=find(tab['MAPS_URL']))

with open(sys.argv[2], 'w') as out:
    print >>out, tab.csv

