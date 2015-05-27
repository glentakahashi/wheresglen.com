#!/bin/bash

START=1427875200000
END=1437411600000

INFILE=data.kml
OUTFILE=data.json
BUILD_DIR=build
INSTALL_FILES=(index.html map.js style.css images/)

if [ ! -f config.js ]; then
  echo "Warning! No config.js found, copying template to config.js"
  cp config.js.template config.js
fi

if wget -O $INFILE -x --load-cookies cookie.txt "https://maps.google.com/locationhistory/b/0/kml?startTime=$START&endTime=$END"
then
  mkdir -p $BUILD_DIR
  node parse.js $INFILE $BUILD_DIR/$OUTFILE
  for file in ${INSTALL_FILES[*]}
  do
    cp -r -v $file $BUILD_DIR/
  done
else
  echo "Couldn't get location history"
  exit 1
fi
