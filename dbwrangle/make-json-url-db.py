#!/usr/bin/env python
"""
Convert a CSV of raw data into imageList.json

* Extract the interesting columns of the CSV file
* Process some of them
* Generate some others based on them
"""

import csv
import json
import sys
import os
import glob
from pctry import whole_url


# We take this subset of the input columns before moving on.
INTERESTING_COLUMNS = [
    'OBJECTID',
    'TITLE',
    'MAPS URL',  # Rows missing this column will be skipped.
    'Notes',
    'CAT Record URL',
    'Tag 1',
    'Tag 2',
    'Refined Position'
]


class SkipRow(Exception):
    "Raised when a problem with a row means it should be omitted from output"
    pass


def subset_columns(row):
    for key in list(row):
        if key not in INTERESTING_COLUMNS:
            del row[key]


def add_image_url(row):
    """
    Look in the image dir for matches to this row.

    Some images don't have a scan there, some have more than one!  Skip the
    ones with no scan, try to choose the best one if there's more.
    """
    # This is a detail of the Wymer's DC image naming - stuff after the . can
    # be skipped
    accession = row['OBJECTID']
    if '.' in accession:
        accession = accession.rsplit('.')[0]

    # Look in the image directory for this image
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
    if not row['MAPS URL']:
        raise SkipRow("No maps_url")
    if 'historydc' in row['MAPS URL']:
        raise SkipRow("MAPS URL looks wrong")

    parse = whole_url.parse_string(row['MAPS URL'])

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
        subset_columns(row)
        row['imageID'] = row['OBJECTID'][0:2] + row['OBJECTID'][3:7]
        add_image_url(row)
        parse_maps_url_to_fields(row)
        locate_image(row)
        add_image_dimensions(row)

        del row['MAPS URL']
        del row['Refined Position']
        del row['a']
        del row['y']
        del row['pitch_from_down']

        rows_out.append(row)
    except SkipRow as skip:
        print 'Problem with', row['OBJECTID'] + ":", str(skip)
        continue

lengths = [
    (len(row['TITLE']), row['TITLE'])
    for row in rows_out
]
print "LONGEST CAPTION:"
print max(lengths)

json.dump(rows_out, open(sys.argv[2], 'w'), indent=2, sort_keys=True)
