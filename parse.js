// using togeojson in nodejs

if (process.argv.length !== 4) {
  console.err("Usage: node parse.js INFILE OUTFILE");
}


var tj = require('togeojson'),
    fs = require('fs'),
    config = require('./config'),
    https = require('https'),
    // node doesn't have xml parsing or a dom. use jsdom
    jsdom = require('jsdom').jsdom;

    var kml = jsdom(fs.readFileSync(process.argv[2], 'utf8'));

    var converted = tj.kml(kml);

    var ps = converted.features[0].geometry.coordinates;
    var ts = converted.features[0].properties.coordTimes;

    var locs = [];

    var currloc = { "locs": [[0,0,0,-1]] };
var d = 0;
//to unbundle distance must be more than 5 miles different
var MAX_DIST = 25;
// have to be at a spot a minimum of 3 hours
var MIN_TIME = 1000 * 60 * 60 * 3;
for (i = 0;i<ts.length;i++) {
  ts[i] = Date.parse(ts[i]);
}
ts.push(new Date());
for (i = 0; i<ps.length;i++) {
  d = distance(currloc.locs[0][1],currloc.locs[0][0],ps[i][1],ps[i][0]);
  if(d > MAX_DIST) {
    //set the end of the old location to be the current point
    var date = ts[i];
    currloc['end'] = date;
    //add the old location if it was long enough
    if (currloc['start'] !== undefined) {
      if (currloc['end']-currloc['start'] > MIN_TIME) {
        //calculate midpoint
        var lat = 0;
        var lon = 0;
        var time = 0;
        //TODO: fix that random NYC data point
        for(j=0;j<currloc.locs.length;j++) {
          l = currloc.locs[j];
          t = (ts[l[3]+1]-ts[l[3]]);
          lat += l[1] * t;
          lon += l[0] * t;
          time += t;
        }
        currloc['lat'] = lat/time;
        currloc['lon'] = lon/time;
        delete currloc.locs;
        locs.push(currloc);
      } else {
        date = currloc['start'];
      }
    }
    //TODO: add weight point average instead of using first point
    //right now it can split a city in to due to biases based on first point noticed
    //http://www.geomidpoint.com/calculation.html
    q = ps[i];
    q.push(i);
    currloc = {
      "locs": [q],
      "lat": 0,
      "lon": 0,
      "start": date,
      "end": 0,
      "loc": ""
    };
    //TODO: rate limit
    //var options = {
    //host: 'maps.googleapis.com',
    //path: '/maps/api/geocode/json?latlng='+ps[i][1]+','+ps[i][0]+'&key='+config.API_KEY
    //};

    //https.get(options, function(res) {
    //console.log("Got response: " + res.statusCode);
    //res.on('data', function(d) {
    //process.stdout.write(d);
    //});
    //}).on('error', function(e) {
    //console.log("Got error: " + e.message);
    //});
  } else {
    q = ps[i];
    q.push(i);
    currloc.locs.push(q);
  }
}
if (currloc['start'] !== undefined) {
  //calculate midpoint
  var lat = 0;
  var lon = 0;
  var time = 0;
  //TODO: fix that random NYC data point
  for(j=0;j<currloc.locs.length;j++) {
    l = currloc.locs[j];
    t = (ts[l[3]+1]-ts[l[3]]);
    lat += l[1] * t;
    lon += l[0] * t;
    time += t;
  }
  currloc['lat'] = lat/time;
  currloc['lon'] = lon/time;
  delete currloc.locs;
  locs.push(currloc);
} else {
  date = currloc['start'];
}

//TODO: merge points via cities now

//delete the random JFK point that appears
locs.splice(1,1)
//fix the times now
locs[0].end = locs[1].start

//http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points
function distance(lat1, lon1, lat2, lon2) {
  //earth radius 3959 miles
  var R = 3959;
  var a =
    0.5 - Math.cos((lat2 - lat1) * Math.PI / 180)/2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos((lon2 - lon1) * Math.PI / 180))/2;

  return R * 2 * Math.asin(Math.sqrt(a));
}

fs.writeFileSync(process.argv[3], JSON.stringify(locs,null,2));
