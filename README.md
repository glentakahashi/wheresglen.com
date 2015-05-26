How to install
===

Get your cookies for google maps:
  open a chrome incognito
  navigate to URL FOR GOOGLE LOCATION HISTORY
  log in
  use "save cookie to .txt" and download your cookie as cookie.txt in this folder
copy config.js.template to config.js and edit to your liking
run "node parse.js"

optional: crontab
cd here
./build.sh
cp -r build/\* /var/www/whereever

requirements
===
node.js
google account with location history

TODO
===
better config.js handling (warning on missing params, etc.)
  maybe don't use a template?

add support for DST (really annoying to get right and I don't want to remake it by hand)
  There are libraries that do it, but why include a whole huge library and just slow down the page loading?

add controls to browse through my history

Support for multiple different multiple trips?

Change color of lines based on estimated trip type (i.e. car, bike, plane, walk, train)
