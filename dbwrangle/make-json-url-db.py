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

    for silly, nice in sillyname_nicename.items():
        row[nice] = parse.get(silly, '')


def locate_image(row):
    refined_raw = row['Refined Position'].strip()

    row['image_distance'] = 40
    row['pitch'] = row['pitch_from_down'] - 80

    if refined_raw:
        try:
            refined = json.loads(refined_raw)
        except ValueError as e:
            print "This is not JSON:", repr(row['Refined Position'])
            return

        if row['imageID'] != refined['imageID']:
            print 'BADDDDDDDDDDDDDDDD', row['imageID'] + ' != ' + refined['imageID']
            return

        row['heading'] = refined['fixedHeading']
        row['pitch'] = refined['fixedPitch']
        row['image_distance'] = refined['fixedDistance']
        #print "Refined", row['imageID']


import ast
image_dims = ast.literal_eval(open('../collection/image-info').read())
def add_image_dimensions(row):
    basename = os.path.basename(row['image_url'])
    row.update(image_dims[basename])
    d = image_dims[basename]
    if d['height'] > d['width']:
        print row['OBJECTID'], "looks like it's portrait"


rows = csv.DictReader(open(sys.argv[1]))
rows_out = []


for row in rows:
    try:
        row['imageID'] = row['OBJECTID'][0:2] + row['OBJECTID'][3:7]
        add_image_url(row)
        parse_maps_url_to_fields(row)
        locate_image(row)
        add_image_dimensions(row)

        del row['MAPS_URL']
        del row['Refined Position']
        del row['a']
        del row['y']
        del row['pitch_from_down']

        rows_out.append(row)
    except SkipRow as skip:
        print 'Problem with', row['OBJECTID'] + ":", str(skip)
        continue

json.dump(rows_out, open(sys.argv[2], 'w'), indent=2)
