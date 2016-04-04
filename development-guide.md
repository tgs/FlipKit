# FlipKit Development Guide

*Written by Thomas Smith*

Part of the goal of the Wymer's DC project is to make components that
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
$ git clone git+ssh://TODO FIXME
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

Now, the `dist` directory should contain the complete web site.  In
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
that file to `dbwrangle/current.csv`.  Change to the `dbwrangle`
directory and run `make`.  Two things should happen: the `identify`
program should collect information about all the images in
`collection/800`, and the spreadsheet should get converted into a file
called `locations.json`.  
