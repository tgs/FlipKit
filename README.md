The code behind [map.wymersdc.com](http://map.wymersdc.com/).  You can learn about the
data set and the project over [here](http://www.wymersdc.com/).

# FlipKit Development Guide

*by Thomas Smith*

Part of the goal of the [Wymer's DC](http://www.wymersdc.com/) project is
to make components that
can be re-used by other groups to make similar web sites.  This document
will help to guide such an effort.

Before technical work can begin, there are some very important
limitations to consider:

First of all, this software package works by keeping data about every
image in a single file that's downloaded by the user's web browser.
This approach is not feasible for more than a few thousand images!  If
you want to display more than that, some elements of this project will
still be applicable, but you will need to do significant development
yourself.

Second, the code in this project makes it difficult for nontechnical
users to save the images that they view.  However, to view an image in a
web browser *is to download it*.  Because of this property of the World
Wide Web, it's likely that any experienced web developer would be able
to systematically download all of the images from a web site like this.
All of the stakeholders should know this, and agree that the substantial
accessibility and visibility advantages that can be gained for the
collection are worth it.  There are some actions you can take to make
the images less useful to someone who tries to steal them: limit the
image resolution, and add a watermark.

With that out of the way, we can move on to the technical work!

## Initial Data Collection

For each image, the FlipKit system needs to know four high-level items.

### An identity or accession number

This will become part of the URL of the view of the image, and is used
internally for various tracking purposes.

### A label or description

This will be shown when viewing the image, and is also used to allow
users to search for images.

### One or more 'tags'

These tags are used to let users filter the images.

### A Google Street View URL showing approximately the same scene

For each image, someone will need to use Google Maps and Street View to
approximate the location of the camera when the image was taken.  It's
most important to get the location correct in this step because the
precise orientation (the *direction* of the camera) can be fine-tuned
later in the process.

It's a good idea to put together the data for a small number of images,
maybe a dozen, and then begin work on the web development tasks (or hand
the data off to the person who will do so).  The earlier your team
touches each distinct part of the project, the earlier any problems or
opportunities can be identified.

## Initial Web Development

You should start by thinking about your web hosting situation.  There
are two parts to the Wymer's DC web site.  One, `www.wymersdc.com`,
contains the introduction and project information, which was created
using Squarespace, a flexible and easy-to-use web host with attractive
templates.  The other part is the map interface, which we placed on a
subdomain, `map.wymersdc.com`, hosted on Amazon S3.  This was
accomplished by using the Squarespace console to set up a CNAME record
for `map.wymersdc.com` pointing to the S3 bucket's static website
hosting URL (`map.wymersdc.com.s3-website-us-east-1.amazonaws.com`).
More details can be found in the many tutorials about hosting your web
site on S3.

The FlipKit map interface should be easy to host in most situations,
because it is purely a client-side application.  It should be possible
to host it from any web server that your organization may run.
Alternatively, Amazon S3 may require less coordination in your
organization, and it is incredibly inexpensive.

There are two parts to the code.  First, we have the front-end, which is
a single-page JavaScript application.  It's assembled out of several
purpose-written modules and a few libraries, using Browserify.  The
second part is the data collection machinery, which is written in Python
with some Makefiles.  The front-end shouldn't require many modifications
to use in a new project, but the data-collection assumptions are more
likely to need revision.

There are some UNIXisms in the code, such as the use of symbolic links,
so the experience will be most seamless on a Mac or Linux computer.
However, it should be perfectly possible to develop FlipKit web sites on
Windows, too.

### Getting started developing the FlipKit front-end

Start by making sure you have Node.js and Git installed on your system.
Relatively old versions should be OK.  Use git to download the project's
source code, and then use NPM to install the development tools and some
required libraries:

```bash
$ git clone git@github.com:tgs/FlipKit.git
....
$ cd flipkit
$ npm install .
```

Now, you should be able to use Gulp to build the web site:

```bash
$ node_modules/.bin/gulp
[19:48:04] Using gulpfile ~/src/flipkit/gulpfile.js
[19:48:04] Starting 'browserify'...
[19:48:04] Starting 'htmlReplace'...
[19:48:04] Finished 'htmlReplace' after 25 ms
[19:48:08] Finished 'browserify' after 3.95 s
[19:48:08] Starting 'default'...
[19:48:08] Finished 'default' after 7.5 μs
```

Now, the `build` directory should contain the complete web site.  In
order to use the Google Maps API, you will need to run a web server
here.  If you have Python installed, you can use `python2 -m
SimpleHTTPServer` or `python3 -m http.server`.  Otherwise, Node
certainly has web servers, for example the `gulp-webserver` package.
At this point, you should be able to visit `http://localhost:8080/` (or
whatever address you've had the dev server listen on) and see a demo
version of the web site.

Once that works, you can begin replacing the demo image data with your
own.

### Getting started adding your own image data

Start with a few images.  Make sure they are reasonably-sized JPEG
files, and put them in `collection/800`.  The filenames should be be the
*identity or accession number* discussed earlier, with a lower-case
`.jpg` extension.

Make a spreadsheet with exactly these column names: `imageID`, `TITLE`,
`MAPS URL`, `Tag 1`, `Tag 2`, `Refined Position`, and `CAT Record URL`.
You can change the names, but it's probably best to start with these and
get it working first - you'll need to change various parts of the code
too.  At first, it's fine if all of the columns except `imageID` and
`MAPS URL` are empty.  Save the spreadsheet as a CSV file, and copy
that file to `dbwrangle/current.csv`.

Change to the `dbwrangle` directory and run these commands:

```
virtualenv ./env
source ./env/bin/activate
pip install -r requirements.txt
make
```

Two things should happen: the `identify` program should collect
information about all the images in `collection/800`, and the
spreadsheet should get converted into a file called `locations.json`.
If you copy this file to `js/imageList.json` and run the `gulp` command
again, the web site should get built with your images!

Run `gulp dist` to minify the javascript and place `index.*` in the dist/
directory.

It is very likely that you will need to edit
`dbwrangle/make-json-url-db.py` at some point - it is the most direct
interface with the spreadsheet/database.  Your data format will probably
be different from the one we used for Wymer's DC in some way or another.

### Putting your version of the web site online for the first time

Google Maps requires an API key before it can be used in many
situations.  FlipKit is distributed with an API key that allows use on
'localhost', but not anywhere else.  So you will need to change line
four of `app.js` to read `GoogleMapsLoader.KEY = 'your key here!'`.

After rebuilding the site with Gulp, you should be able to put
everything in the `dist` directory onto a web server and have it work
correctly!  This completes the first "iteration" - you have touched
almost all of the major components of the project, and you have
something to show off.

## Fine-tuning the positioning of the images

FlipKit thinks of images as being anchored by the Street View point that
produces a similar view.  FlipKit includes an "adjustment mode" that
allows you to fine-tune the orientation of each image in Street View.
You can activate it by setting the variable `useAdjustmentMode` to
`true` in `js/fancy.js` and re-building the web site with `gulp`.  When
adjustment mode is active, you can use the following keys to control the
view:

* `a`: make the image bigger
* `s`: make the image smaller
* up-arrow: move the image up
* down-arrow: move the image down
* left-arrow: move the image left
* right-arrow: move the image right
* space: flip the historical image on and off
* `n`: change to the next image by `imageID`
* `p`: change to the previous image

When you press one of the keys that manipulates the image's position,
some JSON text appears in the white box on the left side of the screen.
If you copy and paste this text into the `Refined Position` column of
the spreadsheet, then rebuild the `imageList.json` file and the web
site, then the image will appear at its adjusted position from then on.

## Conclusion

This has been an overview of all of the technical tasks that you will
need to do to put together a web site similar to Wymer's DC.  If
something doesn't work and you can't figure out why, feel free to open
an issue ticket on the FlipKit GitHub project,
<https://github.com/tgs/flipkit/>.  The newest version of this
development guide will always be available at
<https://github.com/tgs/flipkit/blob/master/development-guide.md>.
Contributions to increase the generality of the data processing, or add
interesting features, would always be welcome.  Thanks and happy
hacking!
