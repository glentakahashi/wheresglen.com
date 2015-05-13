function initialize() {

  var map;
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
      ];

  var formatDate = function(d) {
    if(Object.prototype.toString.call(d) === "[object Date]" && !isNaN(d.getTime()) ) {
      return monthNames[d.getMonth()] + " " + d.getDate();
    }
    return null;
  }
  var infowindow = new google.maps.InfoWindow();
  //set the day of the trip
  var start = new Date(1427875200000);
  var days = 110;
  var now = new Date();
  var daysinMillis = 24 * 60 * 60 * 1000;
  var daysElapsed = Math.floor((now - start) / daysinMillis);
  var daysLeft = days - daysElapsed;
  $('#dayselapsed').removeClass('loading').text(daysElapsed);
  $('#daysleft').removeClass('loading').text(daysLeft);

  $.ajax("data.json", {
    "success": function (data) {
      var mapOptions = {
        zoom: 3,
    center: new google.maps.LatLng(data.locs[data.locs.length-1].lat, data.locs[data.locs.length-1].lon)
      };
      $("#location").removeClass('loading').text(data.locs[data.locs.length-1].loc);
      map = new google.maps.Map(document.getElementById('map-canvas'),
        mapOptions);
      var flightPlanCoordinates = [
    ];
  $("#distance").removeClass('loading').text(data.stats.distance);
  var countries = [];
  new Set(data.stats.countries).forEach(function(value) {
    countries.push(value);
  });
  $("#numcountries").removeClass('loading').text(countries.length);
  $("#countries").removeClass('loading').text(countries.join(", "));
  $.each(data.locs, function(i,v) {
    var content = "<h1>"+v.loc+"</h1>"
    //TODO: parse based on timezone
    var start = formatDate(new Date(v.start));
  var end = formatDate(new Date(v.end));
  var ele = $('<li></li>');
  if(start == end) {
    if(v.daytrip) {
      content += "<h3>Daytrip</h3>"
    //$('#stops li:last-child').append('<ol class="daytrips"><li>'+v.loc+' | Daytrip</li></ol>');
    }
    if( start !== null ) {
      content += "<h3>"+start+"</h3>"
    }
  } else {
    if(v.end == 0) {
      content += "<h3>"+start+"-Present</h3>"
    } else {
      content += "<h3>"+start+"-"+end+"</h3>"
    }
  }
    ele.text(v.loc);
    $('#stops').append(ele);
  var ll = new google.maps.LatLng(v.lat,v.lon);
  flightPlanCoordinates.push(ll);
  if(v.daytrip) {
    flightPlanCoordinates.push(flightPlanCoordinates[flightPlanCoordinates.length-2]);
  }
  var marker = new google.maps.Marker({
    position: ll,
      map: map,
      title: v.loc
  });
  google.maps.event.addListener(marker, 'click', function() {
    infowindow.close();
    infowindow.setContent(content);
    infowindow.open(map,marker);
  });
  ele.click(function() {
    infowindow.close();
    infowindow.setContent(content);
    infowindow.open(map,marker);
  });
  if(i == data.locs.length-1) {
    infowindow.setContent(content);
    infowindow.open(map,marker);
  }
  });

  var flightPath = new google.maps.Polyline({
    path: flightPlanCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2
  });

  flightPath.setMap(map);

    }
  });
}

google.maps.event.addDomListener(window, 'load', initialize);


