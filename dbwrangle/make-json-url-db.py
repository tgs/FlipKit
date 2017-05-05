#!/usr/bin/env python
"""
Convert a CSV of raw data into imageList.json

* Extract the interesting columns of the CSV file
* Process some of them
* Generate some others based on them
"""

from __future__ import print_function
import ast
import csv
import json
import sys
import os
import glob
from pctry import parse_streetview_url


# We take this subset of the input columns before moving on.
INTERESTING_COLUMNS = [
    'OBJECTID',
    'imageID',
    'TITLE',
    # TODO: DATE - '10/10/1948' ----> '10/10/1948', 'october', '10/1948', '1948'
    'STERMS',
    'MAPS URL',  # Rows missing this column will be skipped.
    'Notes',
    'CAT Record URL',
    'Tag 1',
    'Tag 2',
    'Refined Position',
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
    if row.get('image_url'):
        # Already done!
        return

    if 'OBJECTID' in row:
        # Wymer's DC has image names that are weird.  If you name yours
        # exactly the imageID.jpg, this will be simpler!
        accession = row['OBJECTID']
        if '.' in accession:
            accession = accession.rsplit('.')[0]
    else:
        accession = row.get('imageID')
        if not accession:
            raise SkipRow("Row is missing both imageID and OBJECTID")

    # Look in the image directory for this image
    try_path = os.path.join(os.getcwd(), '..', 'collection', '800',
                            accession + '*.jpg')
    matches = glob.glob(try_path)

    if matches:
        matches = sorted(matches, key=len)
        if len(matches) > 1:
            print("Several matches, choosing last:", matches)
        row['image_url'] = os.path.relpath(matches[-1], start='..')
    else:
        raise SkipRow("Couldn't find image")


def parse_maps_url_to_fields(row):
    if not row['MAPS URL']:
        raise SkipRow("No MAPS URL")
    if 'google' not in row['MAPS URL']:
        raise SkipRow("MAPS URL looks wrong")

    row.update(parse_streetview_url(row['MAPS URL']))


def refine_image_orientation(row):
    """
    Use the JSON data copy/pasted into the spreadsheet to update image orientation.

    The FlipKit front-end makes this
    """
    refined_raw = row['Refined Position'].strip()

    row['image_distance'] = 40
    row['pitch'] = row['pitch_from_down'] - 80

    if refined_raw:
        try:
            refined = json.loads(refined_raw)
        except ValueError as e:
            raise SkipRow("This is not JSON: " + repr(row['Refined Position']))

        if row['imageID'] != refined['imageID']:
            raise SkipRow('Refined Position pasted into wrong row! ' +
                          row['imageID'] + ' != ' + refined['imageID'])

        row['heading'] = refined['fixedHeading']
        row['pitch'] = refined['fixedPitch']
        row['image_distance'] = refined['fixedDistance']


# The 'image-info' file is made by the Makefile using Image/GraphicsMagick
image_dims = ast.literal_eval(open('image-info').read())
def add_image_dimensions(row):
    "Add image height and width to make the front-end's life easier"
    basename = os.path.basename(row['image_url'])
    row.update(image_dims[basename])
    d = image_dims[basename]


FIXES = {}

if os.path.exists('fixes.json'):
    with open('fixes.json') as fixes_fh:
        fixes_list = json.load(fixes_fh)
        FIXES = dict((fix['imageID'], fix) for fix in fixes_list)

def fix_image_location(row):
    fix = FIXES.get(row['imageID'], None)
    if fix:
        if fix['found']:
            if fix['pano'] != row['pano']:
                print("I AM CONFUSED about", row['imageID'])
                return
            row.update(fix['latLng'])  # Set lat and lng
            if fix['distance'] > 5:
                print('Updated position of', row['imageID'], 'by', fix['distance'])
        else:
            print(row['imageID'], "has obsolete panorama ID? :(")


EXTRA_SEARCH_TERMS = {}

if os.path.exists('extra-search-terms.csv'):
    with open('extra-search-terms.csv') as terms_fh:
        for row in csv.DictReader(terms_fh):
            EXTRA_SEARCH_TERMS[row['OBJECTID'][0:2] + row['OBJECTID'][3:7]] = {
                'area': 'area' + row['OBJECTID'][8:],
                'CLASSES': row['CLASSES'],
            }

def add_extra_search_terms(row):
    extra = EXTRA_SEARCH_TERMS.get(row['imageID'], None)
    if extra:
        row.update(extra)


rows = csv.DictReader(open(sys.argv[1]))
rows_out = []


for row in rows:
    row = {col: cell.strip() for col, cell in row.items()}
    try:
        subset_columns(row)
        # For Wymer's DC the image ID is a subset of the OBJECTID column
        if 'imageID' not in row:
            row['imageID'] = row['OBJECTID'][0:2] + row['OBJECTID'][3:7]
        parse_maps_url_to_fields(row)
        add_image_url(row)
        refine_image_orientation(row)
        fix_image_location(row)
        add_image_dimensions(row)
        add_extra_search_terms(row)

        del row['MAPS URL']
        del row['Refined Position']
        del row['pitch_from_down']

        rows_out.append(row)
    except SkipRow as skip:
        print('Problem with', row['OBJECTID'] + ":", str(skip))
        continue

lengths = [
    (len(row['TITLE']), row['TITLE'])
    for row in rows_out
]
print("LONGEST CAPTION:")
print(max(lengths))

json.dump(rows_out, open(sys.argv[2], 'w'), indent=2, sort_keys=True)
