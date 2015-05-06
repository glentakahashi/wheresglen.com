#!/bin/sh

START=1427846400000
NOW=1500000000000

INFILE=data.kml
OUTFILE=data.json

if wget -O $INFILE -x --load-cookies cookie.txt "https://maps.google.com/locationhistory/b/0/kml?startTime=$START&endTime=$NOW"
then
  node parse.js $INFILE $OUTFILE
  cp index.html /var/www/wheresglen.com/
  cp style.css /var/www/wheresglen.com/
  cp data.json /var/www/wheresglen.com/
else
  echo "Couldn't get location history"
  return 1
fi
