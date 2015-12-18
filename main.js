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
var keepCenter = true;
var showTrails = false;
var trailDuration = 3;
var pathValues = [];

var ref = new Firebase("https://fbex52.firebaseio.com/");
var apiKey = 'AIzaSyAH96MzE7QYxMg0tAD-GfOoB_-8qRLYJ7c';

function initMap() {
  initial = true;
  ref.off('child_added');
  mapElement = document.getElementById("map");
  image = {
    //url: 'http://uxrepo.com/static/icon-sets/windows/png32/256/000000/location-circle-256-000000.png',
    // scaledSize: new google.maps.Size(20, 20),
    // origin: new google.maps.Point(0, 0),
    // anchor: new google.maps.Point(10, 10)
    url: 'http://icon-park.com/imagefiles/location_map_pin_attention_purple.png',
    scaledSize: new google.maps.Size(40, 50),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(20, 50)
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
  var timeAt;
  if (pos) {
    currLoc = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    timeAt = pos.timestamp;
  } else {
    timeAt = Date.now();
  }

  // console.log('position:', pos);
  // console.log('lastUpdated:', lastUpdated);
  // console.log('diff:', timeAt - lastUpdated);
  console.log('timeAt from fb:', timeAt);
  console.log('keepCenter:', keepCenter);
  
  if (timeAt - lastUpdated > INTERVALTOSAVE || initial) {
    var userInfo = navigator.platform + " " + navigator.userAgent;
    ref.push({currLoc, timeAt, userInfo});
    lastUpdated = timeAt;      
  }

  if (initial) {
    map = new google.maps.Map(mapElement, {
      center: currLoc,
      zoom: 15,
      disableDefaultUI: true
    });
    marker = new google.maps.Marker({
      position: currLoc,
      title: 'Me!',     //display user name
      map: map,
      icon: image
    });

    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);
    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);

    var historyControlDiv = document.createElement('div');
    var historyControl = new HistoryControl(historyControlDiv, map);
    historyControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(historyControlDiv);
    
    initial = false;            
  } else {
    marker.setPosition(currLoc);
    if (keepCenter) {
      map.setCenter(currLoc);
    }
  }
}

function CenterControl(controlDiv, map) {
  var controlUI = document.createElement('div');
  controlUI.className = 'controlUI';
  controlUI.title = 'Click to keep center';
  controlDiv.appendChild(controlUI);

  var controlImg = document.createElement('img');
  controlImg.className = 'controlImg';
  controlImg.src = "https://cdn.icons8.com/Android/PNG/256/Maps/center_direction-256.png";
  controlUI.appendChild(controlImg);

  controlUI.addEventListener('click', function(e) {
    e.preventDefault();
    keepCenter = !keepCenter;
    if (keepCenter) {
      controlUI.className = 'controlUI';
      map.setCenter(currLoc);
    } else {
      controlUI.className = 'controlUIOff';
    }
  });
}

function HistoryControl(controlDiv, map) {
  var controlUI = document.createElement('div');
  controlUI.className = 'controlUIOff';
  controlUI.title = 'Show history trails for last ' + trailDuration + ' hours';
  controlDiv.appendChild(controlUI);

  var controlImg = document.createElement('img');
  controlImg.className = 'controlImg';
  controlImg.src = "http://www.flaticon.com/png/512/22722.png";
  controlUI.appendChild(controlImg);

  controlUI.addEventListener('click', function(e) {
    e.preventDefault();
    showTrails = !showTrails;
    if (showTrails) {
      controlUI.className = 'controlUI';
      FBeventHandler(showTrails);
    } else {
      controlUI.className = 'controlUIOff';
      ref.off('child_added');
    }
  });
}

function FBeventHandler(goodToGo) { //to turn it on, gotta lead the program into ref.on function?
  ref.on('child_added', function(data) {  //fb event executes wherever it is, had to deal specially, turn off manually
    //console.log('child_added ref');
    //if (showTrails) {
      //console.log('inside ref, showTrails is true');
      //console.log('inside ref',pathValues);
      if (pathValues.length) { //when there is cached path
        if(data.val().timeAt >= pathValues[pathValues.length-1].time) {
          var tmp = [];
          tmp.push({
            coord: data.val().currLoc.lat + ',' + data.val().currLoc.lng, 
            time: data.val().timeAt
          });
          runSnapToRoad(tmp, function(snappedRoad) {
            //console.log('inside runsnap cb');
            drawSnappedLine(pathValues.concat(snappedRoad), map);              
          });
        }
      } else {
        //console.log("this is executing after all data rec'd?");         //check this part
        var msTrailDur = trailDuration * 60 * 60 * 1000; //3 hr
        if (data.val().timeAt >= Date.now() - msTrailDur) {
          pathValues.push({
            coord: data.val().currLoc.lat + ',' + data.val().currLoc.lng, 
            time: data.val().timeAt
          });
          runSnapToRoad(pathValues, function(snappedRoads) {              //want to do this after i get all\
            
            pathValues = snappedRoads;
            drawSnappedLine(pathValues, map);              
          });   
        }
      }
      console.log('pathValues:',pathValues);
    //}
  });
  
  // if (goodToGo) {
  //   ref.off('child_added');
  // }
}






// Snap a user-created polyline to roads and draw the snapped path
function runSnapToRoad(pathList, cb) {
  //try implementing with vanilla js
  $.get('https://roads.googleapis.com/v1/snapToRoads', {
    interpolate: true,
    key: apiKey,
    path: pathList.map(el => el.coord).join('|')
  })
  .done(function(data) {
    console.log('inside drawing polyline ajax get',data);
    //processSnapToRoadResponse(data);
    // Store snapped polyline returned by the snap-to-road method.
    //var snappedCoordinates = [];
    //var placeIdArray = [];
    for (var i = 0; i < data.snappedPoints.length; i++) {
      // var latlng = new google.maps.LatLng(
      //     data.snappedPoints[i].location.latitude,
      //     data.snappedPoints[i].location.longitude);
      //snappedCoordinates.push(latlng);
      //placeIdArray.push(data.snappedPoints[i].placeId);
      pathList[i].coord = data.snappedPoints[i].location.latitude + ',' + 
                          data.snappedPoints[i].location.longitude;
    }
    cb(pathList);
      //drawSnappedPolyline();
      //getAndDrawSpeedLimits();
  })
  .fail(function(data) {
    console.log('inside drawing polyline ajax get fail', data);
  });
}

function drawSnappedLine(pathList, map) {
  var snappedCoordinates = pathList.map(el => {
    var mid = el.coord.indexOf(',');                         //this may not be perfect
    return new google.maps.LatLng(
      el.coord.substring(0,mid-1), el.coord.substring(mid+1) //to the end, also may have to convert to number
    );
  });
  // var latlng = new google.maps.LatLng(
  //       data.snappedPoints[i].location.latitude,
  //       data.snappedPoints[i].location.longitude);
  // snappedCoordinates.push(latlng);
  var snappedPolyline = new google.maps.Polyline({
    path: snappedCoordinates,
    strokeColor: 'blue',
    strokeWeight: 4
  });
  snappedPolyline.setMap(map);
  //polylines.push(snappedPolyline);
}
// function processSnapToRoadResponse(data) {
// }



//   var aClient = new HttpClient();
//   aClient.get('http://some/thing?with=arguments', function(response) {
//       // do something with response
//   });

// var HttpClient = function() {
//   this.get = function(aUrl, aCallback) {
//     var anHttpRequest = new XMLHttpRequest();
//     anHttpRequest.onreadystatechange = function() { 
//       if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
//         aCallback(anHttpRequest.responseText);
//     }

//     anHttpRequest.open( "GET", aUrl, true );            
//     anHttpRequest.send( null );
//   }
// }