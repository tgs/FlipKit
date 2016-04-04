// Talk about how important it is to work in iterations //

* Someone needs to consolidate the data into the required fields (I need
  to make the required fields better: get rid of tag 1/2, get rid of
  some assumptions about the object IDs, give fields better names).
* maybe I should rewrite the url parser in parsimmon (or regex :( )
* Talk about zoom levels vs distance??


TODO FOR ME:
* Make the site behave gracefully if some data's missing!  E.g. tags,
  labels.  Maybe concat tags 1 & 2 in python.
* Include an API key that's just OK for localhost
* Make a good place to keep the API key?  Config.js?
* Remove dependencies on 'WY 1234' format from JS files, only deal in
  imageID strings


Initial Together Tasks:
* Do they have this many images? Lots more?  This may not be suitable!
* Study the list of data that we have, and come up with a plan to
  collect corresponding data.
* Talk about the fact that images can be downloaded

Image Tasks:
* Resize all the images to a good size.
* Get exact dims for the images, and make them available in table form
  (possibly using my scripts).
* Initially, geolocate a few to a few dozen images.

Initial Dev Tasks:
* Come up with a plan for web hosting.
* Install node and the requirements.
* Set up a dev web server with Python or Caddy or Node
* Run gulp and make sure it works.
* Get a maps API key
* Take a few to a few dozen images, and do a pilot to make sure things
  work:
    * Convert the data collector's data into the right format, and
      replace imageList.json.
    * Look at the styling and decide what will change
    * Identify remaining Wymer's DC assumptions in the code and work on
      removing them.
* Make sure that deployment works!

Intermediate Dev Tasks
* Establish a routine for incorporating new geolocation data.
* Establish a routine for deploying the web site
* Set up an "adjustment mode" copy of the web site so that the fine
  adjustments can happen.

Intermediate Image Tasks:
* Adjust some images and see if that changes your perspective on
  geolocation.
* Geolocate hundreds of images, deliver them and then adjust them.
