#!/usr/bin/env python

import csv
import json
import sys
import os
import glob
from pctry import whole_url


class SkipRow(Exception):
    pass


def add_image_url(row):
    accession = row['OBJECTID']
    if '.' in accession:
        accession = accession.rsplit('.')[0]

    try_path = os.path.join(os.getcwd(), '..', 'collection', '800',
                            accession + '*.jpg')
    matches = glob.glob(try_path)
    if matches:
        matches = sorted(matches, key=len)
        if len(matches) > 1:
            print "Several matches, choosing last:", matches
        row['image_url'] = os.path.relpath(matches[-1], start='..')
    else:
        raise SkipRow("Couldn't find image")


sillyname_nicename = {
    '1s': 'pano',
    'lat': 'lat',
    'lng': 'lng',
    'h': 'heading',
    't': 'pitch_from_down',
    'a': 'a', # ??
    'y': 'y', # ??
}

def parse_maps_url_to_fields(row):
    if not row['MAPS_URL']:
        raise SkipRow("No maps_url")
    if 'historydc' in row['MAPS_URL']:
        raise SkipRow("MAPS_URL looks wrong")

    parse = whole_url.parse_string(row['MAPS_URL'])

    #if not parse:
        #raise SkipRow("Couldn't parse MAPS_URL")

    for silly, nice in sillyname_nicename.items():
        row[nice] = parse.get(silly, '')


rows = csv.DictReader(open(sys.argv[1]))
fieldnames_out = [
    'lat',
    'Tag_2',
    'y',
    'OBJECTID',
    'heading',
    'Notes',
    'Tag_1',
    'pitch_from_down',
    'CAT Record URL',
    'a',
    'image_url',
    'TITLE',
    'lng',
    'pano',
]

rows_out = []


for row in rows:
    try:
        add_image_url(row)
        parse_maps_url_to_fields(row)

        del row['MAPS_URL']

        rows_out.append(row)
    except SkipRow as skip:
        print 'Problem with', row['OBJECTID'] + ":", str(skip)
        continue

json.dump(rows_out, open(sys.argv[2], 'w'), indent=2)
