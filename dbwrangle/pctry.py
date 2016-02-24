#!/usr/bin/env python

import parcon as p

url = (
    'https://www.google.com/maps/@38.9088156,-77.0650941,3a,75y,'
    '357.88h,84.4t/data=!3m7!1e1!3m5!1sn8X1rxDB54gDaI2gvLh_4Q!2e'
    '0!5s20090701T000000!7i13312!8i6656'
)

def cat_dicts(lst):
    d = {}
    for x in lst:
        d.update(x)
    return d

dontcare_prefix = p.ZeroOrMore(p.CharNotIn('@')) + '@'
latlng = (p.number[float]['lat'] + ',' + p.number[float]['lng'])[dict]
number_tag = (p.number[float] + p.Alpha())[reversed][tuple]
mini_datas = p.delimited(number_tag, ',')[dict]
location_part = (latlng + ',' + mini_datas)[cat_dicts]

bang_silly = p.OneOrMore(
    ('!' + p.Digit() + p.Alpha())[p.concat]
    + p.OneOrMore(p.CharIn(p.alphanum_chars + '_'))[p.concat])[dict]


whole_url = (~dontcare_prefix + location_part + '/data=' + bang_silly
             + ~p.AnyChar()[...])[cat_dicts]
