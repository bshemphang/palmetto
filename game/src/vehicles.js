// vehicles.js: parked cars, traffic, driving physics and car drawing.
(function () {
  var TYPES = {
    sedan: { name: 'Sedan', top: 330, accel: 240, turn: 2.6, color: '#c84a3a', w: 46, h: 22 },
    taxi: { name: 'Taxi', top: 310, accel: 230, turn: 2.7, color: '#e8c83a', w: 46, h: 22 },
    pickup: { name: 'Pickup', top: 290, accel: 200, turn: 2.2, color: '#4a7a4a', w: 52, h: 24 },
    sports: { name: 'Sports', top: 460, accel: 340, turn: 3.1, color: '#b83a8a', w: 48, h: 21 },
    police: { name: 'Police', top: 400, accel: 300, turn: 3.0, color: '#20242a', w: 48, h: 22 }
  };

  var cars = [];
  var idCounter = 1;
  var TSPOTS = [
    ['sedan', 48, 448, 0], ['taxi', 48, 848, 0], ['sedan', 848, 48, Math.PI / 2],
    ['pickup', 1248, 48, Math.PI / 2], ['sedan', 2048, 48, Math.PI / 2],
    ['taxi', 2448, 48, Math.PI / 2], ['sedan', 48, 2048, 0], ['pickup', 1648, 48, Math.PI / 2]
  ];

  function removeCar(car) {
    for (var i = 0; i < cars.length; i++) {
      if (cars[i].id === car.id) { cars.splice(i, 1); return; }
    }
  }

  function makeCar(type, x, y, angle, traffic) {
    var t = TYPES[type];
    var car = {
      id: idCounter++, type: type, name: t.name, x: x, y: y, angle: angle,
      speed: 0, top: t.top, accel: t.accel, turn: t.turn,
      color: t.color, w: t.w, h: t.h, traffic: !!traffic,
      parked: !traffic, driver: !traffic ? null : 'traffic',
      brakeLight: false, targetSpeed: 0, dir: 1, stuck: 0
    };
    cars.push(car);
    return car;
  }

  function spawnWorld() {
    cars.length = 0;
    idCounter = 1;
    var spots = [
      ['sedan', 448, 150], ['taxi', 448, 260], ['pickup', 850, 150], ['sports', 1250, 150],
      ['sedan', 1650, 150], ['taxi', 2050, 150], ['pickup', 448, 550], ['sedan', 850, 550],
      ['sports', 2050, 550], ['sedan', 448, 950], ['taxi', 1250, 950], ['pickup', 1650, 950],
      ['sedan', 448, 1350], ['sports', 850, 1350], ['taxi', 2050, 1350], ['pickup', 1250, 1750],
      ['sedan', 1650, 1750], ['sedan', 448, 1750], ['taxi', 850, 2150], ['sports', 2050, 2150]
    ];
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      makeCar(s[0], s[1], s[2], Math.PI / 2, false);
    }
    var tspots = TSPOTS;
    for (var j = 0; j < tspots.length; j++) {
      var t2 = tspots[j];
      makeCar(t2[0], t2[1], t2[2], t2[3], true);
    }
  }

  function nearestParked(x, y, maxDist) {
    var best = null, bestD = maxDist;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (c.traffic || c.driver) continue;
      var d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function nearestCar(x, y, maxDist, exclude) {
    var best = null, bestD = maxDist;
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (exclude && c.id === exclude.id) continue;
      var d = Math.hypot(c.x - x, c.y - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  function steerCar(car, dt, throttle, steer) {
    var maxTurn = car.turn * (0.35 + 0.65 * Math.min(1, Math.abs(car.speed) / 180));
    car.angle += steer * maxTurn * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 60 + 0.25);
    car.speed += throttle * car.accel * dt;
    if (throttle === 0) car.speed *= Math.pow(0.4, dt);
    if (car.speed > car.top) car.speed = car.top;
    if (car.speed < -120) car.speed = -120;
    var nx = car.x + Math.cos(car.angle) * car.speed * dt;
    var ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (City.collideCircle(nx, ny, 18)) {
      car.speed *= -0.3;
      return true;
    }
    car.x = nx; car.y = ny;
    return false;
  }

  function updateTraffic(dt, playerX, playerY) {
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      if (!c.traffic) continue;
      var aheadX = c.x + Math.cos(c.angle) * 70;
      var aheadY = c.y + Math.sin(c.angle) * 70;
      var blocked = false;
      for (var j = 0; j < cars.length; j++) {
        if (i === j) continue;
        var o = cars[j];
        if (Math.hypot(o.x - aheadX, o.y - aheadY) < 42) { blocked = true; break; }
      }
      if (!blocked && !City.isRoad(aheadX, aheadY)) {
        var right = (c.angle + Math.PI / 2) % (Math.PI * 2);
        var rx = c.x + Math.cos(right) * 60, ry = c.y + Math.sin(right) * 60;
        if (City.isRoad(rx, ry)) c.angle = right; else c.angle = (c.angle - Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      }
      c.speed += ((blocked ? 0 : 150) - c.speed) * Math.min(1, dt * 1.2);
      var ox = c.x, oy = c.y;
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (City.collideCircle(c.x, c.y, 18)) {
        c.x = ox; c.y = oy;
        c.angle = (c.angle + Math.PI / 2) % (Math.PI * 2);
        c.speed *= 0.5;
      }
      if (c.x < 40 || c.x > City.W - 40 || c.y < 40 || c.y > City.H - 40) {
        var rs = TSPOTS[Math.floor(Math.random() * TSPOTS.length)];
        c.x = rs[1]; c.y = rs[2];
        c.angle = rs[3];
      }
    }
  }

  function drawCar(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 7);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.9)';
    ctx.beginPath();
    ctx.roundRect(-c.w / 2 + 12, -c.h / 2 + 3, 14, c.h - 6, 3);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(c.w / 2 - 8, -c.h / 2 + 2, 4, 5);
    ctx.fillRect(c.w / 2 - 8, c.h / 2 - 7, 4, 5);
    if (c.type === 'taxi') {
      ctx.fillStyle = '#222';
      ctx.fillRect(-6, -c.h / 2 - 4, 12, 5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, -c.h / 2 - 6);
    }
    if (c.type === 'police') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-4, -c.h / 2 + 1, 10, c.h - 2);
      ctx.fillStyle = '#c83a3a';
      ctx.fillRect(-2, -c.h / 2 + 1, 3, c.h - 2);
      ctx.fillStyle = '#3a6ac8';
      ctx.beginPath(); ctx.arc(-c.w / 2 + 6, -c.h / 2 + 2, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c83a3a';
      ctx.beginPath(); ctx.arc(-c.w / 2 + 6, c.h / 2 - 2, 3, 0, Math.PI * 2); ctx.fill();
    }
    if (c.brakeLight) {
      ctx.fillStyle = '#ff2a2a';
      ctx.fillRect(-c.w / 2 - 2, -c.h / 2 + 2, 3, 6);
      ctx.fillRect(-c.w / 2 - 2, c.h / 2 - 8, 3, 6);
    }
    ctx.restore();
  }

  function draw(ctx) {
    for (var i = 0; i < cars.length; i++) drawCar(ctx, cars[i]);
  }

  window.Vehicles = {
    cars: cars, TYPES: TYPES, spawnWorld: spawnWorld,
    makeCar: makeCar, removeCar: removeCar, nearestParked: nearestParked, nearestCar: nearestCar,
    steerCar: steerCar, updateTraffic: updateTraffic, draw: draw,
    getCars: function () { return cars; }
  };
})();
