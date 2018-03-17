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

function showPosition(position) {
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
    map.setZoom(16);
}
