var container;
var camera, scene, renderer;
var controls;
var cube;
var cubeGeo, cubeMat;
var rollOverGeo, rollOverMesh, rollOverMaterial;
var framerate = 1000/30;
var voxelSideLength = 50;
var voxelDiagonalLength = 86.60254037844386;
var raycaster;
var voxels = [];
var voxelMap = new VoxelMap();
var robotVoxel;

main();

/**
 * Runs the rendering and camera control code.
 */
function main() {
  init();
  render();
  initPointerLock();
  initMoveOnClick();
  initSelectArea();
  render();
  setInterval(function() {controls.enabled ? render() : false}, framerate);
}

/**
 * Sets the initial scene.
 */
function init() {

  container = document.createElement( 'div' );
  document.body.appendChild( container );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );

  scene = new THREE.Scene();

  // controls
  controls = new PointerLockControls(camera);
  var controlsObject = controls.getObject();

  // change the starting position of the camera/controls
  // settings for 0, 0
  controlsObject.translateZ(200);
  controlsObject.translateY(800);
  controlsObject.children[0].rotation.x = -1.5;

  // settings for 235, 63, 366
  // controlsObject.position.x = 9137.7;
  // controlsObject.position.y = 4234.5;
  // controlsObject.position.z = 18416.7;
  // controlsObject.rotation.y = -13.886;
  // controlsObject.children[0].rotation.x = -.8112;

  scene.add(controlsObject);

  // raycaster
  raycaster = new THREE.Raycaster();

  // cubes

  cubeGeo = new THREE.BoxGeometry( 50, 50, 50 );
  cubeMat = new THREE.MeshLambertMaterial({color: 0xfeb74c});

  rollOverGeo = new THREE.BoxGeometry( 50, 50, 50 );
  rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 0.5, transparent: true });
	rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
	scene.add(rollOverMesh);

  // Lights

  var ambientLight = new THREE.AmbientLight( 0x606060 );
  scene.add( ambientLight );

  var directionalLight = new THREE.DirectionalLight( 0xffffff );
  directionalLight.position.set( 1, 0.75, 0.5 ).normalize();
  scene.add( directionalLight );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( 0xf0f0f0 );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );

}

/**
 * Makes sure everything looks fine after the window changes size.
 */
function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize( window.innerWidth, window.innerHeight );
  render();

}

/**
 * Determines where to place the hover guide.
 */
function placeSelector() {

  var fromScreenCenter = new THREE.Vector2(
    ((renderer.domElement.clientWidth / 2) / renderer.domElement.width) * 2 - 1,
    -(((renderer.domElement.clientHeight / 2) / renderer.domElement.height) * 2 - 1)
  );

  raycaster.setFromCamera(fromScreenCenter, camera);

  var intersects = raycaster.intersectObjects(voxels);
  if (intersects.length > 0) {

    var intersect = intersects[0];
    var normal = intersect.face.normal.clone();
    normal.multiplyScalar(50);
    rollOverMesh.position.copy(intersect.object.position).add(normal);

  }

  var worldCoords = getWorldCoord(rollOverMesh);
  var hoverCoordDiv = document.getElementById('hoverGuideCoordinates');
  hoverCoordDiv.innerHTML = String([worldCoords.x, worldCoords.y, worldCoords.z]);

}

/**
 * Creates a box. Used to indicate a selected area.
 * @param {number} length 
 * @param {number} height 
 * @param {number} width 
 * @param {object} material 
 * @param {object} positionVector 
 * @returns {object}
 */
function makeBox(length, height, width, material, positionVector) {
  var geometry = new THREE.BoxGeometry(length, height, width);
	var mesh = new THREE.Mesh(geometry, material || cubeMat);
  if (positionVector) {mesh.position.copy(positionVector);}
  return mesh;
}

/**
 * Finds the midpoint of two vectors. Used to position boxes between the two voxels at opposite corners.
 * @param {object} v1 
 * @param {object} v2 
 * @returns {object}
 */
function getMidpoint(v1, v2) {
  var midpoint = v1.clone();
  midpoint.add(v2);
  midpoint.divideScalar(2);
  return midpoint;
}

/**
 * Creates a box with the given voxels at opposite corners. Used to indicate a selected area.
 * @param {object} v1 
 * @param {object} v2 
 * @param {object} material
 * @returns {object}
 */
function makeBoxAround(v1, v2, material) {
  var midpoint = getMidpoint(v1, v2);
  var distance = v1.distanceTo(v2);
  var box = makeBox(
    Math.abs(v2.x-v1.x) + voxelSideLength,
    Math.abs(v2.y-v1.y) + voxelSideLength,
    Math.abs(v2.z-v1.z) + voxelSideLength,
    material,
    midpoint
  );
  return box;
}

/**
 * Places the hover guide, listens for the camera controls, and draws the scene.
 */
function render() {
  // use # of ms since last update as delta
  placeSelector();
  controls.update(framerate);
  renderer.render(scene, camera);
}

// code for drawing minecraft maps

/**
 * Removes the robot voxel and redraws it elsewhere.
 * @param {object} pos
 */
function moveRobotVoxel(pos) {

  newRobot = addVoxel(
    pos.x * voxelSideLength,
    pos.y * voxelSideLength,
    pos.z * voxelSideLength,
    new THREE.MeshLambertMaterial({color:0xff9999})
  );

  if (robotVoxel) {
    var robotPos = getWorldCoord(robotVoxel);
    removeVoxel(robotPos.x, robotPos.y, robotPos.z, robotVoxel);
  }
  robotVoxel = newRobot;

  render();
}

/**
 * Removes any existing voxel at the coordinates and adds a new one.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {object} material
 * @returns {object}
 */
function addVoxel(x, y, z, material) {
  var voxel = new THREE.Mesh(cubeGeo, material || cubeMat);
  voxel.position.set(x, y, z);

  var coord = getWorldCoord(voxel);
  var priorVoxel = voxelMap.get(coord.x, coord.y, coord.z);
  if (priorVoxel) {removeVoxel(coord.x, coord.y, coord.z, priorVoxel);}

  voxels.push(voxel);
  voxelMap.set(coord.x, coord.y, coord.z, voxel);
  scene.add(voxel);

  return voxel;
}

/**
 * Removes the voxel at x, y, z if there is one.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {object} voxel
 */
function removeVoxel(x, y, z, voxel) {
  result = false;
  if (voxel && voxels.indexOf(voxel) != -1) {
    scene.remove(voxel);
    voxelMap.set(x, y, z, undefined);
    voxels.splice(voxels.indexOf(voxel), 1);
    result = true;
  }
  return result;
}

/**
 * Used to draw terrain data received from robots.
 * @param {object} shape
 */
function addShapeVoxels(shape) {
  for(var x = 0; x < shape.w; x++) {
    for(var z = 0; z < shape.d; z++) {
      for(var y = 0; y < (shape.data.n / (shape.w * shape.d)); y++) {
        // this is how the geolyzer reports 3d data in a 1d array
        // also lua is indexed from 1
        index = (x + 1) + z*shape.w + y*shape.w*shape.d;

        var worldPos = {
          x: (x + shape.x) * voxelSideLength,
          y: (y + shape.y) * voxelSideLength,
          z: (z + shape.z) * voxelSideLength,
        };
        if(shape.data[index]) {
          addVoxel(worldPos.x, worldPos.y, worldPos.z, colorFromHardness(shape.data[index]));
        }
        else {
          removeVoxel(worldPos.x, worldPos.y, worldPos.z, voxelMap.get(worldPos.x, worldPos.y, worldPos.z));
        }
      }
    }
  }
  // have the shapes appear immediately even if the camera isn't moving
  render();
}

/**
 * Converts ranges of noisy hardness values to specific colors.
 * @param {number} hardness
 * @returns {object}
 */
function colorFromHardness(hardness) {

  var hardnessToColorMap = {
    // bedrock
    '-1': new THREE.MeshLambertMaterial({color:0x000000}),
    // leaves
    0.2: new THREE.MeshLambertMaterial({color:0x00cc00}),
    // glowstone
    0.3: new THREE.MeshLambertMaterial({color:0xffcc00}),
    // netherrack
    0.4: new THREE.MeshLambertMaterial({color:0x800000}),
    // dirt or sand
    0.5: new THREE.MeshLambertMaterial({color:0xffc140}),
    // grass block
    0.6: new THREE.MeshLambertMaterial({color:0xddc100}),
    // sandstone
    0.8: new THREE.MeshLambertMaterial({color:0xffff99}),
    // pumpkins or melons
    1.0: new THREE.MeshLambertMaterial({color:0xfdca00}),
    // smooth stone
    1.5: new THREE.MeshLambertMaterial({color:0xcfcfcf}),
    // cobblestone
    2.0: new THREE.MeshLambertMaterial({color:0x959595}),
    // ores
    3.0: new THREE.MeshLambertMaterial({color:0x66ffff}),
    // cobwebs
    4.0: new THREE.MeshLambertMaterial({color:0xf5f5f5}),
    // ore blocks
    5.0: new THREE.MeshLambertMaterial({color:0xc60000}),
    // obsidian
    50: new THREE.MeshLambertMaterial({color:0x1f1f1f}),
    // water or lava
    100: new THREE.MeshLambertMaterial({color:0x9900cc})
  };

  var closestMatch = 999; // arbitrarily high number
  var oldDifference = Math.abs(closestMatch - hardness);
  for (var key in hardnessToColorMap) {

    var newDifference = Math.abs(key - hardness);
    if (newDifference < oldDifference) {
      closestMatch = key;
      oldDifference = newDifference;
    }

  }

  return hardnessToColorMap[closestMatch];

}

/**
 * Allows enabling and disabling of the camera controls.
 */
function initPointerLock() {
  // locking/unlocking the cursor, enabling/disabling controls
  if ('pointerLockElement' in document) {

    var element = renderer.domElement;

    function pointerLockChangeCB(event) {
      if (document.pointerLockElement === element) {controls.enabled = true;}
      else {
        controls.enabled = false;
        document.getElementById('commandInput').focus();
      }
    }

    // Hook pointer lock state change events
    document.addEventListener( 'pointerlockchange', pointerLockChangeCB, false );
    document.addEventListener( 'pointerlockerror', console.dir, false );

    element.addEventListener('click', function(event) {
      element.requestPointerLock();
    }, false);

  }
  else {alert("Your browser doesn't seem to support Pointer Lock API");}
}

/**
 * Returns the corresponding Minecraft world coordinate of a voxel.
 * @param {object} mesh
 * @returns {object}
 */
function getWorldCoord(mesh) {
  return mesh.clone().position.divideScalar(50).round();
}

/**
 * Sends a command to robots telling them to move to the coordinate clicked on.
 */
function initMoveOnClick() {
  renderer.domElement.addEventListener('click', ()=>{
    var moveToolActive = document.getElementById('moveTool').checked;
    if (controls.enabled && moveToolActive) {
      var coord = getWorldCoord(rollOverMesh);
      console.log(coord);
      var scanLevel = document.getElementById('scanWhileMoving').value;
      var luaString = 'return mas.to(' + [coord.x, coord.y, coord.z, scanLevel] + ');'
      addMessage(luaString, true);
      socket.emit('command', luaString);
    }
  });
}

var selectStart = {
  x: document.getElementById('selectStartX'),
  y: document.getElementById('selectStartY'),
  z: document.getElementById('selectStartZ')
};
var selectEnd = {
  x: document.getElementById('selectEndX'),
  y: document.getElementById('selectEndY'),
  z: document.getElementById('selectEndZ')
};

/**
 * Allows specifying an area of voxels. Used for digging.
 */
function initSelectArea() {
  renderer.domElement.addEventListener('click', ()=>{
    var selectToolActive = document.getElementById('selectTool').checked;
    if (controls.enabled && selectToolActive) {
      if (!(selectStart.x.value || selectStart.y.value || selectStart.z.value)) {
        selectStart.x.value = rollOverMesh.position.x;
        selectStart.y.value = rollOverMesh.position.y;
        selectStart.z.value = rollOverMesh.position.z;
      }
      else if (!(selectEnd.x.value || selectEnd.y.value || selectEnd.z.value)) {
        selectEnd.x.value = rollOverMesh.position.x;
        selectEnd.y.value = rollOverMesh.position.y;
        selectEnd.z.value = rollOverMesh.position.z;
      }
      else {
        var v1 = new THREE.Vector3(
          parseInt(selectStart.x.value),
          parseInt(selectStart.y.value),
          parseInt(selectStart.z.value)
        );
        var v2 = new THREE.Vector3(
          parseInt(selectEnd.x.value),
          parseInt(selectEnd.y.value),
          parseInt(selectEnd.z.value)
        );
        scene.add(makeBoxAround(v1, v2, rollOverMaterial));
        for (fieldName in selectStart) {
          selectStart[fieldName].value = '';
          selectEnd[fieldName].value = '';
        }
      }
    }
  });
}
