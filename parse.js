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
var MAX_DIST = config.maxDistance;
// have to be at a spot a minimum of 3 hours
var MIN_TIME = config.minTime;
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
      "loc": null,
      "daytrip": false
    };
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

//delete the random JFK point that appears
locs.splice(1,1)
//fix the times now
locs[0].end = locs[1].start

var finish = function() {
  for(i = 0;i<locs.length;i++) {
    for(j = i+1;j<locs.length;j++) {
      if(locs[i].loc == locs[j].loc) {
        for(k = i+1; k < j;k++) {
          locs[k].daytrip = true;
        }
        locs[i].end = locs[j].end;
        locs.splice(j,1);
        j--;
      }
    }
  }
  fs.writeFileSync(process.argv[3], JSON.stringify(locs,null,2));
}

var count = locs.length;
for(i = 0;i<locs.length;i++) {
  //TODO: rate limit
  var getInfo = function(z) {
    var options = {
      host: 'maps.googleapis.com',
      path: '/maps/api/geocode/json?latlng='+locs[z].lat+','+locs[z].lon+'&result_type=locality&key='+config.API_KEY
    };

    https.get(options, function(res) {
      //console.log("Got response: " + res.statusCode);
      var data = "";
      res.on('data', function(d) {
        data += d;
      });
      res.on('end', function() {
        d = JSON.parse(data);
        if(d['status'] !== undefined && d['status'] == 'OVER_QUERY_LIMIT') {
          setTimeout(function() {getInfo(z)}, 2000);
        } else {
          if(d.results.length > 0) {
            locs[z].loc = d.results[d.results.length-1].formatted_address;
          }
          count--;
          if(count == 0) {
            finish();
          }
        }
      });
      }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
  }
  getInfo(i);
}


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

