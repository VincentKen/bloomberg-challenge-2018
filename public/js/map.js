var map;
var allRequests = [];
var mapMarkers = [];

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
      alert("Sorry we were unable to detect your position");
  }

  map.setCenter({lat: 51.448006, lng: 5.454005});
  map.setZoom(16);
}

function coordsAsKey(requests) {
  var entries = [];
  for (entry of requests) {
    entries.push({
        key:   entry.latitude+"/"+entry.longitude,
        value: entry
    });
  }
  return entries;
}

function groupEntries(entries) {
  return entries.reduce(function (obj, item) {
    obj[item.key] = obj[item.key] || [];
    obj[item.key].push(item.value);
    return obj;
  }, {});
}

function displayGroups(groups) {
  for (entry of groups) {
    if(entry.group == "null/null")
      continue;

    var markerText;
    if(entry.value.length > 1){
      var markerEndText = "";
      markerText = '<div class="multiSelect"><div class="input-field col s12">'+
                    '<select class="selectRequest">'+
                      '<option value="" disabled selected>Choose one of the requests</option>';

      for (request of entry.value) {
        markerText += '<option value="'+request.id+'">'+request.requested_resource+'</option>';
        markerEndText += createInfo(request, "req"+request.id);
      }

      markerText += '</select>'+
                    '<label>Select Request</label>'+
                  '</div>';

      markerText += markerEndText+"</div>";
    }else{
      markerText = createInfo(entry.value[0], null);
    }

    let info = new google.maps.InfoWindow({
      content: markerText
    });

    var diff;
    if(entry.value.length > 1)
      diff = "multiple";
    else
      diff = moment(new Date(entry.value[0].createdAt)).fromNow();

    let marker = new google.maps.Marker({
      position: {lat: Number(entry.value[0].latitude), lng: Number(entry.value[0].longitude)},
      // icon: {url:"", scaledSize: new google.maps.Size(30, 30), labelOrigin:{x: 15, y: 40}},
      label: {color: "#2b00f7", fontWeight:"bold", text:diff,  labelOrigin:{x: 15, y: 40}},
      map: map
    });

    mapMarkers.push(marker);

    info.addListener('domready', function() {
      $('select').material_select();

      $( ".selectRequest" ).change(function() {
        if(!$(this).val())
          return;

        var targetID = "req"+$(this).val();
        $(this).find("option").each(function() {
          if("req"+$(this).val() == targetID)
            $("#req"+$(this).val()).show();
          else
            $("#req"+$(this).val()).hide();
          console.log($(this).attr("id"));
        });
      });
    });

    marker.addListener('click', function() {
      info.open(map, marker);
    });
  }
}

function fetchMapData() {
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", "requests", true);
  xhttp.addEventListener('load', function() {
    var response = JSON.parse(xhttp.responseText);
    allRequests = response;
    var entries = coordsAsKey(response);

    var results = groupEntries(entries);

    var groups = Object.keys(results).map(function (key) {
        return {group: key, value: results[key]};
    });

    displayGroups(groups);

  });

  xhttp.addEventListener('error', () => console.log("Request failed"));
  xhttp.setRequestHeader("Content-type", "application/json");
  xhttp.send();
}

function createInfo(entry, hideId) {
  var hideAttr = "";
  if(hideId)
    hideAttr = "id='"+hideId+"' style='display: none;'";
  return "<div class='mapEntry' "+hideAttr+">"+
            "<h1>"+entry.PhoneNumber.username+" is in need of something!</h1>"+
            "<p><b>Needed: </b>"+entry.requested_resource+"<br>"+
            "<b>Location: </b>"+entry.location+"</p>"+
            "<a class='btn waves-effect waves-light helpButton' onClick='openHelp("+entry.id+")' forId='"+entry.id+"'><i class='fa fa-handshake-o'></i> Offer help to "+entry.PhoneNumber.username+"</a> "+
            "<a href='http://www.google.com/maps/place/"+entry.latitude+","+entry.longitude+"' class='waves-effect waves-light btn'><i class='fa fa-map-marker'></i> Open in Google Maps</a></div>";
}

function showPosition(position) {
    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude});
    map.setZoom(16);
}

var currentId;
function openHelp(id) {
  $('#offerHelp').modal('open');
  currentId = id;
}

$(document).ready(function(){
  $('.modal').modal();
  $('#submitHelp').on('click', function () {

    if($("#helpForm")[0].checkValidity()){
     $.ajax({
         url: 'requests/'+currentId+'/offer',
         type: "POST",
         contentType: "application/json",
         data: JSON.stringify({
             phone_number: $('#phone_number').val(),
             message : $('#desc').val(),
         }),
         success: function() {
           $('#doneModal').modal('open');
         }
     });
    }
  });

  function startSearch() {
    var val = $("#search").val();
    var requests;
    for (var i = 0; i < mapMarkers.length; i++) {
      if (mapMarkers[i]) {
        mapMarkers[i].setMap(null);
      }
      mapMarkers[i] = null;
    }

    if (val === '' || !val) {
      requests = allRequests;
    } else {
      var fuse = new Fuse(allRequests, {
        keys: ['requested_resource'],
        shouldSort: true
      });
      requests = fuse.search(val);
    }

    var entries = coordsAsKey(requests);

    var results = groupEntries(entries);

    var groups = Object.keys(results).map(function (key) {
        return {group: key, value: results[key]};
    });

    displayGroups(groups);
  }

  $('#search').keypress(function(event) {
    if (event.keyCode == 13) {
        startSearch();
    }
  });


  $("#startSearch").on("click", function () {
    startSearch();
  });
});
