$(document).ready(function (){
  var map;
  var stops = {};
  var stopIds = [];
  var infowindow = new google.maps.InfoWindow();

  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
      ];

  var formatDate = function(d, offset) {
    //convert to Timezone date
    d = new Date(d + offset * 3600 * 1000);
    return [monthNames[d.getUTCMonth()], d.getUTCDate()];
  };

  var escapeHTML = function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  var parseInfo = function(id) {
    var stop = stops[id];
    var content = "<h1>"+stop.loc+"</h1>";
    var start = formatDate(stop.times[0][0], stop.tzOffset);
    var end = formatDate(stop.times[0][1], stop.tzOffset);
    for(i = 1;i<stop.times.length;i++) {
      var start2 = formatDate(stop.times[i][0], stop.tzOffset);
      var end2 = formatDate(stop.times[i][1], stop.tzOffset);
      //if it is a continuation of the same days
      if(start2[0] == end[0] && start2[1] == end[1]) {
        end = end2;
      //otherwise add the old segment
      } else {
        if(start[0] == end[0] && start[1] == end[1]) {
          content += "<h3>"+start[0]+" "+start[1]+"</h3>";
        } else {
          content += "<h3>"+start[0]+" "+start[1]+"-";
          if(start[0] != end[0]) {
            content += end[0]+" ";
          }
          content += end[1]+"</h3>";
        }
        start = start2;
        end = end2;
      }
    }
    //the last stop
    if(stop.lastStop === true) {
      content += "<h3>"+start[0]+" "+start[1]+"-Present</h3>";
    } else if(start[0] == end[0] && start[1] == end[1]) {
      content += "<h3>"+start[0]+" "+start[1]+"</h3>";
    } else {
      content += "<h3>"+start[0]+" "+start[1]+"-";
      if(start[0] != end[0]) {
        content += end[0]+" ";
      }
      content += end[1]+"</h3>";
    }

    //add the images
    if(stop.images && stop.images.length > 0) {
      content += "<div class='images'>";
      for(i = 0;i < stop.images.length; i++) {
        var img = stop.images[i];
        content += "<a href='" + img.src +"' data-lightbox='" + id + "'";
        if(img.title && img.title.length > 0) {
          content += " data-title='" + escapeHTML(img.title) + "'";
        }
        content += "><img class='thumb' src='" + img.thumb + "' alt='";
        if(img.title && img.title.length > 0) {
          content += escapeHTML(img.title);
        }
        content += "'></a>";
      }
      content += "</div>";
    }

    stop.content = content;
    return content;
  };

  $.ajax("data.json", {
    "success": function (data) {
      var days = 111;
      var daysElapsed = Math.floor((data.segments[data.segments.length-1].endTime - data.segments[0].startTime) / (24 * 60 * 60 * 1000));
      var daysLeft = days - daysElapsed;
      $('#dayselapsed').removeClass('loading').text(daysElapsed);
      $('#daysleft').removeClass('loading').text(daysLeft);
      $("#distance").removeClass('loading').text(data.stats.totalDistance);
      $("#numcountries").removeClass('loading').text(data.stats.countries.length);
      //$("#countries").removeClass('loading').text(data.stats.countries.join(", "));
      //$("#location").removeClass('loading').text(data.segments[data.segments.length-1].loc);

      var mapOptions = {
        zoom: 4,
        center: new google.maps.LatLng(data.segments[data.segments.length-1].lat, data.segments[data.segments.length-1].lon)
      };
      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
      var travelLine = [];
      var currentIndex = 0;
      $.each(data.segments, function(i,v) {
        var marker;
        if(stops[v.id] === undefined) {
          stopIds.push(v.id);
          var openInfoWindow = function() {
            var index = stopIds.indexOf(v.id);
            infowindow.close();
            if(stops[v.id].content !== undefined) {
              infowindow.setContent(stops[v.id].content);
            } else {
              infowindow.setContent(parseInfo(v.id));
            }
            infowindow.open(map,marker);
            if(index == 0) {
              $('.previous').addClass('navigation-disabled');
              $('.previous').off('click.previous');
            } else {
              $('.previous').removeClass('navigation-disabled');
              $('.previous').off('click.previous');
              $('.previous').on('click.previous', stops[stopIds[index-1]].opener);
            }
            if (index == stopIds.length-1) {
              $('.next').addClass('navigation-disabled');
              $('.next').off('click.next');
            } else {
              $('.next').removeClass('navigation-disabled');
              $('.next').off('click.next');
              $('.next').on('click.next', stops[stopIds[index+1]].opener);
            }
            $('.position').text((stopIds.length - index) + "/" + (stopIds.length));
          };
          marker = new google.maps.Marker({
            position: new google.maps.LatLng(v.lat,v.lon),
            map: map,
            title: v.loc
          });
          stops[v.id] = {
            loc: v.loc,
            marker: marker,
            times: [[v.startTime, v.endTime]],
            tzOffset: v.tzOffset,
            images: v.images,
            opener: openInfoWindow,
          };
          google.maps.event.addListener(marker, 'click', function() {
            openInfoWindow();
          });
          var ele = $('<li>'+v.loc+'</li>');
          $('#stops').prepend(ele);
          ele.click(function() {
            openInfoWindow();
          });
          if(i == data.segments.length-1) {
            stops[v.id].lastStop = true;
            openInfoWindow();
          }
        } else {
          marker = stops[v.id].marker;
          stops[v.id].times.push([v.startTime, v.endTime]);
          stops[v.id].images = stops[v.id].images.concat(v.images);
        }
        travelLine.push(marker.position);
      });

      var line = new google.maps.Polyline({
        path: travelLine,
          geodesic: true,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2
      });
      line.setMap(map);
    }
  });
});
