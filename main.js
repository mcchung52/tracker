var map, currLoc, marker, wpid;
//var initial;
var mapElement;
var geo_options;
var keepCenter = true;
var showTrails = false;

//var lastUpdated = Date.now();
var INTERVALTOSAVE = 5000;//epoch time in millisec
var trailDuration = 3;
var msTrailDur = trailDuration * 60 * 60 * 1000; //3 hr

//var userInfo;
var cachedPath = [];
var lastUpdatedIdx = 0; //pointer to where it was last called for road-snap; only send after that
var snappedPolyline;

var ref = new Firebase("https://fbex52.firebaseio.com/");
var myRef;
var apiKey = 'AIzaSyAH96MzE7QYxMg0tAD-GfOoB_-8qRLYJ7c';

function initMap() {
  mapElement = document.getElementById("map");
  if (!navigator.geolocation){
    mapElement.innerHTML = "<p>Geolocation is not supported by your browser</p>";
    return;
  }

  //initial = true;

  //userInfo = navigator.platform + " " + navigator.userAgent;
  myRef = ref.child(navigator.platform);
  
  myRef.once('value', function(snapshot) {
    var total = snapshot.numChildren();
    console.log('total children:', total);
    if (total) {
      snapshot.forEach(function(eachCoord) {
        console.log('eachCoord',eachCoord.val());
        if (eachCoord.val().timeAt >= Date.now() - msTrailDur) {
          cachedPath.push(eachCoord.val());          
        }
      });
      console.log('inside initMap, cachedPath:',cachedPath);
    }
  });
  
  geo_options = {
    enableHighAccuracy: true, 
    maximumAge        : 0 
  //   timeout           : 27000
  };
  wpid = navigator.geolocation.getCurrentPosition(setup, function(){}, geo_options);

  // wpid = navigator.geolocation.watchPosition(geo_success, function(){}, geo_options);

  // setInterval(function(){
  //   geo_success();
  // }, INTERVALTOSAVE);
}

function setup(pos) { //pos is passed in by default
  try {
    console.log('inside setup');
    if (!pos) {
      console.log('pos was empty; something wrong');
      return;
    }
    currLoc = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };
    var timeAt = pos.timestamp;
    var humanTime = Date(timeAt);
    myRef.push({currLoc, timeAt, humanTime}, FBpushComplete.call(null,{currLoc, timeAt, humanTime}));

    map = new google.maps.Map(mapElement, {
      center: currLoc,
      zoom: 15,
      disableDefaultUI: true
    });

    var markerImg = {
      url: 'marker.png',//'http://icon-park.com/imagefiles/location_map_pin_attention_purple.png',
      scaledSize: new google.maps.Size(40, 50),
      origin: new google.maps.Point(0, 0),
      anchor: new google.maps.Point(20, 50)
    };

    marker = new google.maps.Marker({
      position: currLoc,
      title: 'Me!',     //display user name
      map: map,
      icon: markerImg
    });

    var centerControlDiv = document.createElement('div');
    var centerControl = new CenterControl(centerControlDiv, map);
    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(centerControlDiv);

    var historyControlDiv = document.createElement('div');
    var historyControl = new HistoryControl(historyControlDiv, map);
    historyControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(historyControlDiv);

    console.log('right before watchPosition');
    wpid = navigator.geolocation.watchPosition(geo_success, function(){}, geo_options);

  } catch (err) {
    console.log(err);
  }
}

function geo_success(pos) {
  // var hrTime = Date(timeAt);  //FOR DEBUG GET RID OF IT LATER
  // console.log('timeAt from fb:', hrTime);
  // console.log('keepCenter:', keepCenter);
  console.log('inside geo_success');
  currLoc = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude
  };
  //if ((timeAt - lastUpdated > INTERVALTOSAVE) || initial) {
    // var userInfo = navigator.platform + " " + navigator.userAgent;
    // myRef.push({currLoc, hrTime, pos.timestamp, userInfo});
    var timeAt = pos.timestamp;
    var humanTime = Date(timeAt);
    myRef.push({currLoc, timeAt, humanTime}, FBpushComplete.call(null,{currLoc, timeAt, humanTime}));
    //lastUpdated = pos.timestamp;      
  //}

  marker.setPosition(currLoc);
  console.log('marker setPosition with currLoc');
  if (keepCenter) {
    map.setCenter(currLoc); //when moving, gets new adjacent map? redraws?
  }
  if (showTrails) { //redraw route
  }
  console.log('end of geo success!!');
}

function CenterControl(controlDiv, map) {
  var controlUI = document.createElement('div');
  controlUI.className = 'controlUI';
  controlUI.title = 'Click to keep center';
  controlDiv.appendChild(controlUI);

  var controlImg = document.createElement('img');
  controlImg.className = 'controlImg';
  controlImg.src = 'center.png';//"https://cdn.icons8.com/Android/PNG/256/Maps/center_direction-256.png";
  controlUI.appendChild(controlImg);

  controlUI.addEventListener('click', e => {
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
  controlImg.src = 'history.png';//"http://www.flaticon.com/png/512/22722.png";
  controlUI.appendChild(controlImg);

  controlUI.addEventListener('click', e => {
    e.preventDefault();
    showTrails = !showTrails;
    if (showTrails) {
      controlUI.className = 'controlUI';
      //FBeventHandler(map);//showTrails);            //must draw here initially then afterwards draw Q position change
      //console.log('end of showTrails after FBeventHandler');

      runSnapToRoad(function() {
        
        drawSnappedLine();//cachedPath, map);              
        console.log('cachedPath:', cachedPath.length);
      });

    } else {
      controlUI.className = 'controlUIOff';
      myRef.off('child_added');

      snappedPolyline.setMap(null);
      console.log('polyline after setMap=null',snappedPolyline);
      snappedPolyline = null;
      console.log('polyline after =null',snappedPolyline);
    }
  });
}

function FBpushComplete(trail) {
  cachedPath.push(trail);
}
// Snap a user-created polyline to roads and draw the snapped path
function runSnapToRoad(cb) {//pathList, cb) {
  //try implementing with vanilla js
  //console.log('in runSnapToRoad, pathlist:',pathList.length);
  if (lastUpdatedIdx < cachedPath.length) {
    //if successful
    lastUpdatedIdx = cachedPath.length;
    //else don't update
  }


  $.get('https://roads.googleapis.com/v1/snapToRoads', {
    interpolate: true,
    key: apiKey,
    path: cachedPath.map(el => el.currLoc.lat + ',' + el.currLoc.lng).join('|')
  })
  .done(function(data) {
    //console.log('polyline ajax, success:', data);
    for (var i = 0; i < data.snappedPoints.length; i++) {
      pathList[i].coord = data.snappedPoints[i].location.latitude + ',' + 
                          data.snappedPoints[i].location.longitude;
    }
    cb(pathList);
  })
  .fail(function(data) {
    //console.log('polyline ajax, fail:', data);
    cb(pathList);
  });
}

function drawSnappedLine() {//pathList, map) {
  //console.log('in drawSnapped, pathlist:',pathList.length);
  var snappedCoordinates = cachedPath.map(el => {
    // var mid = el.coord.indexOf(',');
    // console.log('snapped lat:'+el.coord.substring(0,mid)+' lng:'+el.coord.substring(mid+1));
    // return new google.maps.LatLng(
    //   Number(el.coord.substring(0,mid)), 
    //   Number(el.coord.substring(mid+1))
    // );
    return new google.maps.LatLng( el.currLoc.lat, el.currLoc.lng );
  });

  // snappedCoordinates.sort(function(a,b) {
  //   return a.time - b.time;
  // });

  snappedPolyline = new google.maps.Polyline({
    path: snappedCoordinates,
    strokeColor: 'blue',
    strokeWeight: 4
  });
  //console.log('before setMap, snappedCoord:',snappedCoordinates);
  snappedPolyline.setMap(map);
}

/*
function FBeventHandler(map) { //to turn it on, gotta lead the program into ref.on function?
  var lastIdx = cachedPath.length - 1; //this should never error cuz cachedPath will always have something by here
                                       //then get rid of if... else statement below  and rename variable
  console.log('lastIdx',lastIdx);
  myRef.on('child_changed', function(data) {
    console.log('inside child_changed', data.val());
  });
  myRef.on('child_added', function(data) {  //fb event executes wherever it is, had to deal specially, turn off manually
      //console.log('data:',myRef.numChildren());
      console.log('inside child_added');
      if (cachedPath.length) {
        console.log('cachedPath.length',cachedPath.length);
        console.log('data:',data.val());
        console.log('last timeAt',cachedPath[lastIdx].timeAt);
        if(data.val().timeAt > cachedPath[lastIdx].timeAt) {
          console.log('inside timelimit',cachedPath[lastIdx].timeAt);
          // var tmp = [];
          // tmp.push({
          //   coord: data.val().currLoc.lat + ',' + data.val().currLoc.lng, 
          //   time: data.val().timeAt
          // });
          cachedPath.push(data.val());

          runSnapToRoad(cachedPath, function(snappedRoad) {
          //runSnapToRoad(tmp, function(snappedRoad) {
            //console.log('inside runsnap cb');
            cachedPath = cachedPath.concat(snappedRoad);
            drawSnappedLine(cachedPath, map);              
            console.log('cachedPath:', cachedPath.length);
          });
        }
      } else {
        //console.log("this is executing after all data rec'd?");         //check this part
        console.log("will this ever get executed?? cachedPath will always have something");
        //var msTrailDur = trailDuration * 60 * 60 * 1000; //3 hr
        if (data.val().timeAt >= Date.now() - msTrailDur) {
          cachedPath.push({
            coord: data.val().currLoc.lat + ',' + data.val().currLoc.lng, 
            time: data.val().timeAt
          });
          runSnapToRoad(cachedPath, function(snappedRoads) {              //want to do this after i get all\
            
            cachedPath = snappedRoads;
            drawSnappedLine(cachedPath, map);              
            console.log('cachedPath:', cachedPath.length);
          });   
        }
      }
    //}
  });
  console.log('end of FBeventHandler, is this after all children added?');
}
*/


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