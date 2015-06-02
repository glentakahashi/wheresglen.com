#!/bin/bash

START=1427875200000
END=1437411600000

INFILE=data.kml
OUTFILE=data.json
BUILD_DIR=_build
INSTALL_FILES=(index.html js/ css/ img/)
INSTALL_DIR=$1

if [ $# -eq 0 ]; then
  echo "Please enter install dir."
  exit 1
fi

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
    cp -r -v $BUILD_DIR/* $INSTALL_DIR
else
  echo "Couldn't get location history"
  exit 1
fi
