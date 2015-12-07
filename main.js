var map, currLoc, marker, wpid;
var initial;
var mapElement;
var image;
var geo_options = {
  enableHighAccuracy: true, 
  maximumAge        : 0 
//   timeout           : 27000
};
var lastUpdated = Date.now();
var INTERVALTOSAVE = 5000;//epoch time in millisec

var ref = new Firebase("https://fbex52.firebaseio.com/");

function initMap() {
  initial = true;
  mapElement = document.getElementById("map");
  image = {
    //url: 'http://uxrepo.com/static/icon-sets/windows/png32/256/000000/location-circle-256-000000.png',
    // scaledSize: new google.maps.Size(20, 20),
    // origin: new google.maps.Point(0, 0),
    // anchor: new google.maps.Point(10, 10)
    url: 'http://icon-park.com/imagefiles/location_map_pin_attention_purple.png',
    scaledSize: new google.maps.Size(40, 50),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(50, 20)
  };

  if (!navigator.geolocation){
    mapElement.innerHTML = "<p>Geolocation is not supported by your browser</p>";
    return;
  }

  wpid = navigator.geolocation.watchPosition(geo_success, function(){}, geo_options);
  setInterval(function(){
    geo_success();
  }, INTERVALTOSAVE);
}

function geo_success(pos) {
  var rightNow;
  if (pos) {
    currLoc = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    rightNow = pos.timestamp;
  } else {
    rightNow = Date.now();
  }

  console.log('position:', pos);
  console.log('lastUpdated:', lastUpdated);
  console.log('rightnow:', rightNow);
  console.log('diff:', rightNow - lastUpdated);
  
  if (rightNow - lastUpdated > INTERVALTOSAVE || initial) {
    var userInfo = navigator.platform + " " + navigator.userAgent;
    ref.push({currLoc, rightNow, userInfo});
    lastUpdated = rightNow;      
  }

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

    // Create the DIV to hold the control and call the CenterControl() constructor
    // passing in this DIV.
    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);

    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);
    
    initial = false;            
  } else {
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
}

function CenterControl(controlDiv, map) {

  // Set CSS for the control border.
  var controlUI = document.createElement('div');
  controlUI.className = 'controlUI';
  controlUI.title = 'Click to recenter the map';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior.
  // var controlText = document.createElement('div');
  // controlText.className = 'controlText';
  // controlText.innerHTML = 'Center Map';
  var controlImg = document.createElement('img');
  controlImg.className = 'controlImg';
  controlImg.src = "https://cdn.icons8.com/Android/PNG/256/Maps/center_direction-256.png";
  controlUI.appendChild(controlImg);

  // Setup the click event listeners: simply set the map to Chicago.
  controlUI.addEventListener('click', function() {
    map.setCenter(currLoc);
  });

}