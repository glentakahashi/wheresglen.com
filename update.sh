#!/bin/sh

START=1427875200000
END=1437411600000

INFILE=data.kml
OUTFILE=data.json

#TODO: copy/warn if config.js is not yet defined

if wget -O $INFILE -x --load-cookies cookie.txt "https://maps.google.com/locationhistory/b/0/kml?startTime=$START&endTime=$END"
then
  node parse.js $INFILE $OUTFILE
  cp index.html /var/www/wheresglen.com/
  cp style.css /var/www/wheresglen.com/
  cp data.json /var/www/wheresglen.com/
else
  echo "Couldn't get location history"
  return 1
fi
