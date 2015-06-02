if (process.argv.length !== 4) {
  console.error("Usage: node parse.js [Google KML File] [Output Json File]");
}

var tj = require('togeojson'),
    fs = require('fs'),
    config = require('./config'),
    kd = require('kdtree'),
    graph = require('fbgraph'),
    jsdom = require('jsdom').jsdom;

if(config.metric) {
  congfig.featureRadius *= 0.621371192;
}

graph.setAccessToken(config.accessToken);
graph.setAppSecret(config.appSecret);

var images = [];

var done = function() {
  //sort the images
  images.sort(function(a,b) {
    return a.time - b.time;
  });
  var parsedKml = tj.kml(jsdom(fs.readFileSync(process.argv[2], 'utf8')));
  var points = parsedKml.features[0].geometry.coordinates;
  var times = parsedKml.features[0].properties.coordTimes;

  /***************************
   * Build KD Tree
   ***************************/

  var GEO_DIR = "geoData/";

  //load the countries
  var countryInfo = fs.readFileSync(GEO_DIR+"countryInfo.txt", 'utf8').split('\n');
  var countries = {};
  for(i = 0;i<countryInfo.length;i++) {
    var country = countryInfo[i].split('\t');
    countries[country[0]] = {
      name: country[4],
      admins: {}
    };
  }
  //load the administrations
  var adminInfo = fs.readFileSync(GEO_DIR+"admin1CodesASCII.txt", 'utf8').split('\n');
  for(i = 0;i<adminInfo.length;i++) {
    var admin = adminInfo[i].split('\t');
    var countryCode = admin[0].split('.')[0];
    var adminCode = admin[0].split('.')[1];
    countries[countryCode].admins[adminCode] = admin[1];
  }
  //load the administrations
  var timeZoneInfo = fs.readFileSync(GEO_DIR+"timeZones.txt", 'utf8').split('\n');
  var timezones = {};
  for(i = 0;i<timeZoneInfo.length;i++) {
    var timezoneData = timeZoneInfo[i].split('\t');
    var name = timezoneData[1];
    var timezone = timezoneData[3];
    timezones[name] = {
      name: name,
      offset: timezone,
    };
  }
  //load the features
  var featureInfo = fs.readFileSync(GEO_DIR+"cities1000.txt", 'utf8').split('\n');
  var featureTree = new kd.KDTree(3);
  var features = {};
  for(i = 0;i<featureInfo.length;i++) {
    var c = featureInfo[i].split('\t');
    //skip blank entries
    if(c[0] == '') {
      continue;
    }
    var id = c[0];
    var name = c[1];
    var lat = c[4];
    var lon = c[5];
    var countryCode = c[8];
    var adminCode = c[10];
    var timezone = c[17];
    var featureClass = c[6];
    var featureCode = c[7];
    if(config.featurePriority.indexOf(featureClass+"."+featureCode) == -1 || config.featureBlacklist.indexOf(id) > -1) {
      continue;
    }
    features[id] = {
      name: name,
      countryCode: countryCode,
      adminCode: adminCode,
      lat: lat,
      lon: lon,
      timezone: timezones[timezone],
      featureType: featureClass+"."+featureCode,
      timeSpent: 0,
    };
    var p = to3D(lat,lon);
    featureTree.insert(p.x,p.y,p.z,id);
  }

  // minimum time to remain walking
  var MIN_TIME = config.minTime;

  /***************************
   * Summarize Travels
   ***************************/

  var segments = [];
  var currentSegment = null;
  var countriesVisited = [];
  for(i = 0;i<points.length;i++) {
    var lat = points[i][1];
    var lon = points[i][0];
    var p = to3D(lat,lon);
    var nearestFeatures = featureTree.nearestRange(p.x,p.y,p.z, config.featureRadius / 3959);
    nearestFeatures.sort(function (a,b) {
      var featureA = features[a[3]];
      var featureB = features[b[3]];
      if(featureA.featureType == featureB.featureType) {
        return calculateDistance(lat,lon,featureA.lat,featureA.lon) - calculateDistance(lat,lon,featureB.lat,featureB.lon);
      } else {
        return config.featurePriority.indexOf(featureA.featureType) - config.featurePriority.indexOf(featureB.featureType);
      }
    });
    if(nearestFeatures.length == 0) {
      nearestFeatures = [featureTree.nearest(p.x,p.y,p.z)];
    }
    var id = nearestFeatures[0][3];
    var nearest = features[id];
    if(currentSegment !== null && currentSegment.id == id) {
      currentSegment.endTime = new Date(times[i]).getTime();
    } else {
      var loc = nearest.name;
      if(config.showState && nearest.adminCode.length > 0 && nearest.adminCode !== '00') {
        loc += ", " + countries[nearest.countryCode].admins[nearest.adminCode];
      }
      loc += ", " + countries[nearest.countryCode].name;
      // Travelling faster than the 1000 mph is impossible
      if(currentSegment !== null) {
        var valid = true;
        var previousSegment = segments[segments.length-1];
        if(previousSegment !== undefined) {
          var distance = calculateDistance(currentSegment.lat,currentSegment.lon,previousSegment.lat,previousSegment.lon);
          var time = (currentSegment.startTime - previousSegment.endTime) / (1000 * 60 * 60);
          speed = distance / time;
          if(speed > 2000 && distance > 50) {
            valid = false;
          }
        }
        if(valid) {
          addSegment(currentSegment);
        }
      }
      //TODO: don't duplicate data
      currentSegment = {
        startTime: new Date(times[i]).getTime(),
        endTime: new Date(times[i]).getTime(),
        id: id,
        loc: loc,
        lat: nearest.lat,
        lon: nearest.lon,
        featureType: nearest.featureType,
        tzOffset: nearest.timezone.offset,
        images: [],
      };
    }
  }
  // we have to push the last point because it didn't do it automatically
  addSegment(currentSegment);

  //add images to all of the segments
  var j = 0;
  for(i = 0;i < segments.length && j < images.length;i++) {
    while(j < images.length && images[j].time < segments[i].startTime) {
      j++;
    }
    while(j < images.length && images[j].time < segments[i].endTime) {
      segments[i].images.push(images[j]);
      j++;
    }
  }

  var pruned = true;
  while(pruned) {
    pruned = false;
    //join segments that have the same location
    for(i = 0;i<segments.length-1;i++) {
        if(segments[i].id == segments[i+1].id) {
          segments[i].endTime = segments[i+1].endTime;
          segments.splice(i+1,1);
          i--;
          pruned = true;
        }
    }

    // lets combine the trips together!
    // remove features that don't appear long enough
    // (except the last one)
    for(i = 0;i<segments.length-1;i++) {
      var currentSegment = segments[i];
      if(features[currentSegment.id].timeSpent < MIN_TIME || currentSegment.endTime - currentSegment.startTime < 1000 * 60 * 30) {
        segments.splice(i,1);
        i--;
        pruned = true;
      }
    }
  }

  var dist = 0;
  for(i = 1;i<segments.length;i++) {
    dist += calculateDistance(segments[i].lat,segments[i].lon,segments[i-1].lat,segments[i-1].lon);
  }
  var totalDistance;
  if(config.metric) {
    totalDistance = Math.floor(dist * 0.621371192) + " km.";
  } else {
    totalDistance = Math.floor(dist) + " mi.";
  }
  var data = {
    "segments": segments,
    "stats": {
      "countries": countriesVisited,
      "totalDistance": totalDistance
    }
  };
  fs.writeFileSync(process.argv[3], JSON.stringify(data,null,2));

  function addSegment(segment) {
    segments.push(segment);
    features[segment.id].timeSpent += segment.endTime - segment.startTime;
    var country = countries[features[segment.id].countryCode].name;
    if(countriesVisited.indexOf(country) == -1) {
      countriesVisited.push(country);
    }
  }

  //http://stackoverflow.com/questions/27928/how-do-i-calculate-calculateDistance-between-two-latitude-longitude-points
  function calculateDistance(lat1, lon1, lat2, lon2) {
    var a =
      0.5 - Math.cos((lat2 - lat1) * Math.PI / 180)/2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      (1 - Math.cos((lon2 - lon1) * Math.PI / 180))/2;

    return 3959 * 2 * Math.asin(Math.sqrt(a));
  }

  function to3D(lat, lon) {
    var x = Math.cos(lat * Math.PI / 180) * Math.cos(lon * Math.PI / 180);
    var y = Math.cos(lat * Math.PI / 180) * Math.sin(lon * Math.PI / 180);
    var z = Math.sin(lat * Math.PI / 180);
    return {
      x: x,
      y: y,
      z: z
    };
  }
};

var loadImages = function(res, callback) {
  if(res.error) {
    console.log(res);
    process.exit(1);
  }
  for(i = 0;i<res.data.length;i++) {
    var img = res.data[i];
    if(img.backdated_time) {
      var data = {
        src: img.images[0].source,
        thumb: img.picture,
        time: new Date(img.backdated_time).getTime() + (1000 * 60 * 60 * config.timezoneOffset),
      };
      if(img.name) {
        data.title = img.name;
      }
      images.push(data);
    }
  }
  if(res.paging && res.paging.next) {
    graph.get(res.paging.next, function(err, res2) {
      loadImages(res2, callback);
    });
  } else {
    callback();
  }
};

//load all of the images in the album
graph.get(config.album + '/photos', {limit: 25}, function(err, res) {
  loadImages(res, done);
});
