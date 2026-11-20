// input.js: keyboard and mouse state for Palmetto. Plain globals, no libraries.
(function () {
  var keys = {};
  var pressed = {};
  var mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  var canvas = null;

  function keyName(e) {
    var k = e.key;
    if (k === ' ') return 'Space';
    if (k.length === 1) return k.toLowerCase();
    return k;
  }

  window.addEventListener('keydown', function (e) {
    var k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.key) !== -1) e.preventDefault();
    if (!keys[k]) pressed[k] = true;
    keys[k] = true;
  });
  window.addEventListener('keyup', function (e) {
    keys[e.key === ' ' ? 'Space' : (e.key.length === 1 ? e.key.toLowerCase() : e.key)] = false;
  });
  window.addEventListener('blur', function () { keys = {}; });

  function bindCanvas(c) {
    canvas = c;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * (c.width / r.width);
      mouse.y = (e.clientY - r.top) * (c.height / r.height);
    });
    c.addEventListener('mousedown', function (e) {
      var r = c.getBoundingClientRect();
      mouse.clickX = (e.clientX - r.left) * (c.width / r.width);
      mouse.clickY = (e.clientY - r.top) * (c.height / r.height);
      mouse.clicked = true;
    });
  }

  window.Input = {
    down: function (k) { return !!keys[k]; },
    pressed: function (k) { return !!pressed[k]; },
    axisX: function () {
      var x = 0;
      if (keys['a'] || keys['ArrowLeft']) x -= 1;
      if (keys['d'] || keys['ArrowRight']) x += 1;
      return x;
    },
    axisY: function () {
      var y = 0;
      if (keys['w'] || keys['ArrowUp']) y -= 1;
      if (keys['s'] || keys['ArrowDown']) y += 1;
      return y;
    },
    mouse: mouse,
    bindCanvas: bindCanvas,
    endFrame: function () { pressed = {}; mouse.clicked = false; }
  };
})();
