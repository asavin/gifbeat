//Unpack modules
PhiloGL.unpack();
Scene.PICKING_RES = 1;

//some locals
var $ge = function(id) { return document.getElementById(id); },
    $$ = function(selector) { return document.querySelectorAll(selector); },
    citiesWorker = new Worker('cities.js'),
    data = { citiesRoutes: {}, airlinesRoutes: {} },
    models = { airlines: {} }, geom = {},
    fx = new Fx({
      duration: 1000,
      transition: Fx.Transition.Expo.easeInOut
    }),
    airlineList, pos, tooltip;

//Get handles when document is ready
document.onreadystatechange = function() {
  if (document.readyState == 'complete' && PhiloGL.hasWebGL()) {

    tooltip = $('tooltip');

    //load dataset
    loadData();
  }
};

//Create earth
models.earth = new O3D.Sphere({
  nlat: 30,
  nlong: 30,
  radius: 2,
  /*uniforms: {
    shininess: 32
  },*/
  textures: ['earthbw.jpg'],
  program: 'earth'
});
models.earth.rotation.set(Math.PI, 0,  0);
models.earth.update();

//Create cities layer model and create PhiloGL app.
citiesWorker.onmessage = function(e) {
  var modelInfo = e.data;

  if (typeof modelInfo == 'number') {
      Log.write('Building models ' + modelInfo + '%');
  } else {
    data.citiesIndex = modelInfo.citiesIndex;
    models.cities = new O3D.Model(Object.create(modelInfo, {
      pickable: {
        value: true
      },
      //Add a custom picking method
      pick: {
        value: function(pixel) {
          //calculates the element index in the array by hashing the color values
          if (pixel[0] == 0 && (pixel[1] != 0 || pixel[2] != 0)) {
            var index = pixel[2] + pixel[1] * 256;
            return index;
          }
          return false;
        }
      },

      render: {
        value: function(gl, program, camera) {
          gl.drawElements(gl.TRIANGLES, this.$indicesLength, gl.UNSIGNED_SHORT, 0);
        }
      }
    }));
    Log.write('Loading assets...');
    createApp();
  }
};

citiesWorker.onerror = function(e) {
  Log.write(e);
};

function loadData() {
  Log.write('Loading data...');
  //Request cities data
  new IO.XHR({
    url: 'cities.json',
    onSuccess: function(json) {
      data.cities = JSON.parse(json);
      citiesWorker.postMessage(data.cities);
      Log.write('Building models...');
    },
    onProgress: function(e) {
      Log.write('Loading airports data, please wait...' +
                (e.total ? Math.round(e.loaded / e.total * 1000) / 10 : ''));
    },
    onError: function() {
      Log.write('There was an error while fetching cities data.', true);
    }
  }).send();
}

function centerTo(lat, lon) {
  var earth = models.earth,
      cities = models.cities,
      pi = Math.PI,
      pi2 = pi * 2,
      phi = pi - (+lat + 90) / 180 * pi,
      theta = pi2 - (+lon + 180) / 360 * pi2,
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

function createApp() {
  //Create application
  PhiloGL('map-canvas', {
    program: [{
      //to render cities and routes
      id: 'layer',
      from: 'uris',
      path: 'shaders/',
      vs: 'layer.vs.glsl',
      fs: 'layer.fs.glsl',
      noCache: true
    },{
      //to render the globe
      id: 'earth',
      from: 'uris',
      path: 'shaders/',
      vs: 'spec-map.vs.glsl',
      fs: 'spec-map.fs.glsl',
    }, {
      //for glow post-processing
      id: 'glow',
      from: 'uris',
      path: 'shaders/',
      vs: 'glow.vs.glsl',
      fs: 'glow.fs.glsl',
      noCache: true
    }],
    camera: {
      position: {
        x: 0, y: 0, z: -6
      }
    },
    scene: {
      lights: {
        enable: true,
        ambient: {
          r: 1.0,
          g: 0.4,
          b: 1.0
        }
      }
    },
    events: {
      picking: true,
      centerOrigin: false,
      onDragStart: function(e) {
        pos = pos || {};
        pos.x = e.x;
        pos.y = e.y;
        pos.started = true;

        geom.matEarth = models.earth.matrix.clone();
        geom.matCities = models.cities.matrix.clone();
      },
      onDragMove: function(e) {
        var phi = geom.phi,
            theta = geom.theta,
            clamp = function(val, min, max) {
                return Math.max(Math.min(val, max), min);
            },
            y = -(e.y - pos.y) / 100,
            x = (e.x - pos.x) / 100;

        rotateXY(y, x);

      },
      onDragEnd: function(e) {
        var y = -(e.y - pos.y) / 100,
            x = (e.x - pos.x) / 100,
            newPhi = (geom.phi + y) % Math.PI,
            newTheta = (geom.theta + x) % (Math.PI * 2);

        newPhi = newPhi < 0 ? (Math.PI + newPhi) : newPhi;
        newTheta = newTheta < 0 ? (Math.PI * 2 + newTheta) : newTheta;

        geom.phi = newPhi;
        geom.theta = newTheta;

        pos.started = false;

        this.scene.resetPicking();
      },
      onMouseWheel: function(e) {
        var camera = this.camera,
            from = -5.125,
            to = -2.95,
            pos = camera.position,
            pz = pos.z,
            speed = (1 - Math.abs((pz - from) / (to - from) * 2 - 1)) / 6 + 0.001;

        pos.z += e.wheel * speed;

        if (pos.z > to) {
            pos.z = to;
        } else if (pos.z < from) {
            pos.z = from;
        }

        clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(function(me) {
          me.scene.resetPicking();
        }, 500, this);

        camera.update();
      },
      onMouseEnter: function(e, model) {
        if (model) {
          clearTimeout(this.timer);
          var style = tooltip.style,
              name = data.citiesIndex[model.$pickingIndex].split('^'),
              textName = name[1][0].toUpperCase() + name[1].slice(1) + ', ' + name[0][0].toUpperCase() + name[0].slice(1),
              bbox = this.canvas.getBoundingClientRect();

          style.top = (e.y + 10 + bbox.top) + 'px';
          style.left = (e.x + 5 + bbox.left) + 'px';
          this.tooltip.className = 'tooltip show';

          this.tooltip.innerHTML = textName;
        }
      },
      onMouseLeave: function(e, model) {
        this.timer = setTimeout(function(me) {
          me.tooltip.className = 'tooltip hide';
        }, 500, this);
      }
    },
    textures: {
      src: ['earthbw.jpg'],
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
      Log.write("There was an error creating the app.", true);
    },
    onLoad: function(app) {
      //Unpack app properties
      var gl = app.gl,
          scene = app.scene,
          camera = app.camera,
          canvas = app.canvas,
          width = canvas.width,
          height = canvas.height,
          program = app.program,
          clearOpt = gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT;

      app.tooltip = $ge('tooltip');

      models.earth.onBeforeRender = function(program, camera) {
        program.setUniform('enableSpecularMap', true);
        program.setUniform('enableColorMap', true);
      };

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.viewport(0, 0, +canvas.width, +canvas.height);

      //create shadow, glow and image framebuffers
      /*app.setFrameBuffer('world', {
        width: 1024,
        height: 1024,
        bindToTexture: {
          parameters : [ {
            name : 'TEXTURE_MAG_FILTER',
            value : 'LINEAR'
          }, {
            name : 'TEXTURE_MIN_FILTER',
            value : 'LINEAR',
            generateMipmap : false
          } ]
        },
        bindToRenderBuffer: true
      }).setFrameBuffer('world2', {
        width: 1024,
        height: 1024,
        bindToTexture: {
          parameters : [ {
            name : 'TEXTURE_MAG_FILTER',
            value : 'LINEAR'
          }, {
            name : 'TEXTURE_MIN_FILTER',
            value : 'LINEAR',
            generateMipmap : false
          } ]
        },
        bindToRenderBuffer: true
      });*/

      //picking scene
      scene.add(models.earth,
                models.cities);

      draw();

      //$('list-wrapper').style.display = '';

      //Draw to screen
      function draw() {
        // render to a texture
        
        //program.earth.use();
        //program.earth.setUniform('renderType',  0);
        //app.setFrameBuffer('world', true);
        
        gl.clear(clearOpt);
        
        //scene.renderToTexture('world');
        //app.setFrameBuffer('world', false);

        /*program.earth.use();
        program.earth.setUniform('renderType',  -1);
        app.setFrameBuffer('world2', true);
        gl.clear(clearOpt);
        scene.renderToTexture('world2');
        app.setFrameBuffer('world2', false);*/

        /*Media.Image.postProcess({
          fromTexture: ['world-texture', 'world2-texture'],
          toScreen: true,
          program: 'glow',
          width: 1024,
          height: 1024
        });*/

        scene.render();

        Fx.requestAnimationFrame(draw);
      }
    }
  });
}

//Log
//Singleton that logs information
//Log singleton
var Log = {
  elem: null,
  timer: null,
  
  getElem: function() {
    if (!this.elem) {
      return (this.elem = $ge('log-message'));
    }
    return this.elem;
  },
  
  write: function(text, hide) {
    if (this.timer) {
      this.timer = clearTimeout(this.timer);
    }
    
    var elem = this.getElem(),
        style = elem.parentNode.style;

    elem.innerHTML = text;
    style.display = '';

    if (hide) {
      this.timer = setTimeout(function() {
        style.display = 'none';
      }, 2000);
    }
  }
};