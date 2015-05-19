function initialize() {

  var map;

  var infowindow = new google.maps.InfoWindow();

  $.ajax("data.json", {
    "success": function (data) {
      var mapOptions = {
        zoom: 15,
        center: new google.maps.LatLng(data.locs[0].lat, data.locs[0].lon)
      };
      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
      var flightPlanCoordinates = [];
      $.each(data.locs, function(i,v) {
        var content = "<h1>"+v.lat+", "+v.lon+"</h1>"
        var start = new Date(v.start);
        content += "<h3>"+start+"</h3>"
        var ll = new google.maps.LatLng(v.lat,v.lon);
        var marker = new google.maps.Marker({
          position: ll,
          map: map,
          title: v.loc
        });
        flightPlanCoordinates.push(ll);
        google.maps.event.addListener(marker, 'click', function() {
          infowindow.close();
          infowindow.setContent(content);
          infowindow.open(map,marker);
        });
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


