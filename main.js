var map, currLoc, marker, wpid;
var initial;
var mapElement;
var image;
var geo_options = {
  enableHighAccuracy: true, 
  maximumAge        : 0 
//   timeout           : 27000
};
var lastUpdated;
var INTERVAL = 2000;//epoch time in millisec

var ref = new Firebase("https://fbex52.firebaseio.com/");

function initMap() {
  initial = true;
  mapElement = document.getElementById("map");
  image = {
    url: 'http://uxrepo.com/static/icon-sets/windows/png32/256/000000/location-circle-256-000000.png',
    scaledSize: new google.maps.Size(20, 20),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(10, 10)
  };

  if (!navigator.geolocation){
    mapElement.innerHTML = "<p>Geolocation is not supported by your browser</p>";
    return;
  }      
  
  wpid = navigator.geolocation.watchPosition(geo_success, function(){}, geo_options);
}

function geo_success(pos) {
  if (Date.now() - lastUpdated > INTERVAL) {
    console.log('position:', pos);
    console.log('lastUpdated:', lastUpdated);
    currLoc = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    
    if (initial) {
      map = new google.maps.Map(mapElement, {
        center: currLoc,
        zoom: 15,
        disableDefaultUI: true
      });
      marker = new google.maps.Marker({
        position: currLoc,
        title: 'Me!',
        map: map,
        icon: image
      });
      initial = false;            
    } else {
      //marker.setMap(null);
      //map.setCenter(currLoc); //implement center control
      // marker.setMap(map);
      marker.setPosition(currLoc);
    }
    // $.ajax({
    //   url: 'http://localhost:3000/report',
    //   method: 'post',
    //   data: currLoc
    // })
    // .done(function(data){
    //   console.log(data);
    // });
    ref.push(currLoc);
    lastUpdated = Date.now();
  }
}