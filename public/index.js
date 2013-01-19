var geom = {}, models = {};

function webGLStart() {
  var $id = function(d) { return document.getElementById(d); };

  //Create moon
  models.earth = new PhiloGL.O3D.Sphere({
    nlat: 30,
    nlong: 30,
    radius: 2,
    uniforms: {
      shininess: 32
    },
    textures: ['earth.jpg', 'earth-specular.gif'],
    colors: [1, 1, 1, 1]
  });
  
  //Create application
  PhiloGL('map-canvas', {
    program: {
      from: 'uris',
      path: 'shaders/',
      vs: 'spec-map.vs.glsl',
      fs: 'spec-map.fs.glsl'
    },
    camera: {
      position: {
        x: 0, y: 0, z: -6
      }
    },
    textures: {
      src: ['earth.jpg', 'earth-specular.gif'],
      parameters: [{
        name: 'TEXTURE_MAG_FILTER',
        value: 'LINEAR'
      }, {
        name: 'TEXTURE_MIN_FILTER',
        value: 'LINEAR_MIPMAP_NEAREST',
        generateMipmap: true
      }]
    },
    onError: function() {
      alert("There was an error creating the app.");
    },
    onLoad: function(app) {
      //Unpack app properties
      var gl = app.gl,
          scene = app.scene,
          canvas = app.canvas,
          ambient = {
            r: 0.8,
            g: 0.8,
            b: 0.8
          };
        //object rotation
      geom.phi = Math.PI;
      geom.theta = -Math.PI / 2.0;

      //onBeforeRender
      models.earth.onBeforeRender = function(program, camera) {
        program.setUniform('enableSpecularMap', true);
        program.setUniform('enableColorMap', true);
      };
      
      //Basic gl setup
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.viewport(0, 0, +canvas.width, +canvas.height);
      //Add objects to the scene
      scene.add(models.earth);
      //Animate
      draw();

      //Draw the scene
      function draw() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        //Setup lighting
        var lights = scene.config.lights;
        lights.enable = true;
        lights.ambient = {
          r: +ambient.r,
          g: +ambient.g,
          b: +ambient.b
        };
        
        //Update position
        //theta += 0.01;
        models.earth.rotation.set(geom.phi, geom.theta, 0.0);
        models.earth.update();
        
        //render objects
        scene.render();

        //request new frame
        PhiloGL.Fx.requestAnimationFrame(draw);
      }
    }
  });
}

//center to coordinates
function centerMap(lat, lng) {
 var  earth = models.earth,
      phi = lat,
      theta = lng,
      phiPrev = geom.phi || Math.PI / 2,
      thetaPrev = geom.theta || (3 * Math.PI / 2),
      phiDiff = phi - phiPrev,
      thetaDiff = theta - thetaPrev;

  geom.matEarth = earth.matrix.clone();
  geom.matCities = cities.matrix.clone();

  fx.start({
    onCompute: function(delta) {
      rotateXY(phiDiff * delta, thetaDiff * delta);
      geom.phi = phiPrev + phiDiff * delta;
      geom.theta = thetaPrev + thetaDiff * delta;
    },

    onComplete: function() {
      centerAirline.app.scene.resetPicking();
    }
  });
}

//rotate the planet of phi and theta angles
function rotateXY(phi, theta) {
  var earth = models.earth,
      cities = models.cities,
      xVec = [1, 0, 0],
      yVec = [0, 1, 0],
      yVec2 =[0, -1, 0];

  earth.matrix = geom.matEarth.clone();
  cities.matrix = geom.matCities.clone();

  var m1 = new Mat4(),
      m2 = new Mat4();

  m1.$rotateAxis(phi, xVec);
  m2.$rotateAxis(phi, xVec);

  m1.$mulMat4(earth.matrix);
  m2.$mulMat4(cities.matrix);

  var m3 = new Mat4(),
      m4 = new Mat4();

  m3.$rotateAxis(theta, yVec2);
  m4.$rotateAxis(theta, yVec);

  m1.$mulMat4(m3);
  m2.$mulMat4(m4);

  earth.matrix = m1;
  cities.matrix = m2;
}