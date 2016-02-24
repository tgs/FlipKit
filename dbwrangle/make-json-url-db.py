#!/usr/bin/env python
import sys
import tablib
from pctry import whole_url

def find(lst):
    for i, el in enumerate(lst):
        if el:
            yield i


tab = (tablib.Dataset()
       .load(open(sys.argv[1]).read().strip()))

parsed_urls = []
for rnum, row in enumerate(tab.dict):  # py2 not lazy
    try:
        if 'historydc' in row['MAPS_URL']:
            print "Skipping", row['OBJECTID'], "since it has historydc in google maps url"
            del tab[rnum]
        else:
            parsed_urls.append(whole_url.parse_string(row['MAPS_URL']))
    except:
        print "Couldn't parse", row['MAPS_URL'], "on", row['OBJECTID']
        raise

sillyname_nicename = {
    '1s': 'pano',
    'lat': 'lat',
    'lng': 'lng',
    'h': 'heading',
    't': 'pitch_from_down',
    'a': 'a', # ??
    'y': 'y', # ??
}

for silly, nice in sillyname_nicename.items():
    tab.append_col([parse.get(silly, '') if parse else ''
                    for parse in parsed_urls], header=nice)


with open(sys.argv[2], 'w') as out:
    print >>out, tab.json
