#!/usr/bin/env python

# I got really excited about parser combinators after reading the readme of
# Parsimmon, a JavaScript library.  ParCon is a Python version.  You could do
# these same things with regular expressions, but it wouldn't be as... fun?
#
# http://www.opengroove.org/parcon/parcon.html
import parcon as p

example_url = (
    'https://www.google.com/maps/@'
    '38.9088156,-77.0650941'  # latitude and longitude
    ','
    '3a,75y,357.88h,84.4t'  # 357.88 heading, 84.4 pitch-up
                            # (so almost horizontal)
    '/data='
    '!3m7!1e1!3m5!1sn8X1rxDB54gDaI2gvLh_4Q'  # part after 1s is the pano-id
    '!2e0!5s20090701T000000!7i13312!8i6656'
)

def cat_dicts(lst):
    d = {}
    for x in lst:
        d.update(x)
    return d

# Up through maps/@
dontcare_prefix = p.ZeroOrMore(p.CharNotIn('@')) + '@'

# '38.9,-77.1' -> {'lat': 38.9, 'lng': -77.1}
# (subscript notation is heavily overloaded - [f] means "apply this function",
# ['string'] means make a Tag object, a namedtuple of ('string', value)).
latlng = (p.number[float]['lat'] + ',' + p.number[float]['lng'])[dict]

# '1234.5x' -> ('x', 1234.5)
number_tag = (p.number[float] + p.Alpha())[reversed][tuple]

# '1a,2b,3c' -> {'a': 1, 'b': 2, 'c': 3}
mini_datas = p.delimited(number_tag, ',')[dict]

# '38.9,-77.1,1a,2b' -> {'lat': 38.9, 'lng': -77.1, 'a': 1, 'b': 2}
location_part = (latlng + ',' + mini_datas)[cat_dicts]

# The panorama ID is the string between '!1s' and the next '!'.  Presumably
# the other parts mean something too, but I didn't study them.
# '!3m7!1e1' -> {'3m': '7', '1e': '1'}
bang_tag_data = p.OneOrMore(
    ('!' + p.Digit() + p.Alpha())[p.concat]
    + p.OneOrMore(p.CharIn(p.alphanum_chars + '-_'))[p.concat])[dict]

whole_url = (~dontcare_prefix + location_part + '/data=' + bang_tag_data
             + ~p.AnyChar()[...])[cat_dicts]


def parse_streetview_url(url):
    result = whole_url.parse_string(url)
    return {
        'pano': result['1s'],
        'lat': result['lat'],
        'lng': result['lng'],
        'heading': result['h'],
        'pitch_from_down': result['t'],
    }
