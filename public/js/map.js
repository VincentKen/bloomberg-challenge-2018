var map;

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
        zoom: 3,
        mapTypeId: 'roadmap',
        center: new google.maps.LatLng(47.5856, 14.3235),
        gestureHandling: "greedy",
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControlOptions: {
          mapTypeIds: [google.maps.MapTypeId.TERRAIN, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.HYBRID],
          position: google.maps.ControlPosition.LEFT_BOTTOM ,
          style: google.maps.MapTypeControlStyle.DEFAULT},
        styles: [{
          featureType: "poi",
          stylers: [{visibility: "off"}]
        }]
      });

      locate();
      fetchMapData();
}

function locate() {
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition);
  } else {
      alert("Sorry we have not been able to detect your position");
  }


  map.setCenter({lat: 51.448006, lng: 5.454005});
  map.setZoom(16);
}

function fetchMapData() {
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", "http://37.252.184.84:3000/requests", true);
  xhttp.addEventListener('load', function() {
    var response = JSON.parse(xhttp.responseText);

    for (entry of response) {

      let info = new google.maps.InfoWindow({
        content:"<div class='mapEntry'>"+
                  "<h1>"+entry.requested_resource+"</h1>"+
                  "<p><i>Pete is in need of something!</i><br>"+
                  "<b>Needed: </b>"+entry.requested_resource+"<br>"+
                  "<b>Location: </b>"+entry.location+"</p>"+
                  "<a class='waves-effect waves-light btn'>Open in Google Maps</a></div>"
      });

      var diff = moment(new Date(entry.createdAt)).fromNow();

      let marker = new google.maps.Marker({
        position: {lat: Number(entry.latitude), lng: Number(entry.longitude)},
        // icon: {url:"", scaledSize: new google.maps.Size(30, 30), labelOrigin:{x: 15, y: 40}},
        label: {color: "#2b00f7", fontWeight:"bold", text:diff,  labelOrigin:{x: 15, y: 40}},
        map: map
      });

      marker.addListener('click', function() {
        info.open(map, marker);
      });
    }
  });

  xhttp.addEventListener('error', () => console.log("Request failed"));
  xhttp.setRequestHeader("Content-type", "application/json");
  xhttp.send();
}

function showPosition(position) {
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
    map.setZoom(16);
}
