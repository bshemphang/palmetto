// police.js: wanted stars, foot cops and police cars that chase and arrest.
(function () {
  var wanted = 0;
  var heat = 0;
  var cops = [];
  var copCars = [];
  var arrestTimer = 0;

  function reset() {
    wanted = 0; heat = 0; cops = []; copCars = []; arrestTimer = 0;
  }

  function addHeat(amount) {
    heat += amount;
    var level = heat < 12 ? 0 : heat < 30 ? 1 : heat < 60 ? 2 : heat < 110 ? 3 : heat < 180 ? 4 : 5;
    if (level > wanted) {
      wanted = level;
      AudioSys.alarm();
    }
  }

  function clearWanted() {
    wanted = 0; heat = 0;
    cops = []; copCars = [];
    AudioSys.sirenSet(false);
  }

  function spawnCopNear(x, y, inCar) {
    var a = Math.random() * Math.PI * 2;
    var sx = x + Math.cos(a) * 420;
    var sy = y + Math.sin(a) * 420;
    sx = Math.max(60, Math.min(City.W - 60, sx));
    sy = Math.max(60, Math.min(City.H - 60, sy));
    if (inCar) {
      var car = Vehicles.makeCar('police', sx, sy, Math.atan2(y - sy, x - sx), false);
      car.traffic = false;
      car.driver = 'police';
      copCars.push(car);
    } else {
      cops.push({ x: sx, y: sy, angle: 0, speed: 165, phase: 0 });
    }
  }

  function update(dt, px, py, playerInCar, playerSpeed) {
    var wantCops = wanted === 0 ? 0 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
    var wantCars = wanted >= 2 ? Math.min(3, wanted - 1) : 0;
    while (cops.length < wantCops) spawnCopNear(px, py, false);
    while (copCars.length < wantCars) spawnCopNear(px, py, true);
    if (wanted === 0) {
      cops = []; copCars = [];
      AudioSys.sirenSet(false);
      return;
    }
    AudioSys.sirenSet(true);
    AudioSys.sirenTick(dt);
    var seen = false;
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      var d = Math.hypot(px - c.x, py - c.y);
      if (d < 700) seen = true;
      c.angle = Math.atan2(py - c.y, px - c.x);
      var sp = d < 60 ? c.speed * 1.2 : c.speed;
      var nx = c.x + Math.cos(c.angle) * sp * dt;
      var ny = c.y + Math.sin(c.angle) * sp * dt;
      if (!City.collideCircle(nx, ny, 12)) { c.x = nx; c.y = ny; }
      c.phase += dt * 10;
      if (d < 26 && !playerInCar) {
        arrestTimer += dt;
        if (arrestTimer > 1.2) {
          arrestTimer = 0;
          window.GameEvents.busted();
        }
      }
    }
    for (var j = 0; j < copCars.length; j++) {
      var car = copCars[j];
      var d2 = Math.hypot(px - car.x, py - car.y);
      if (d2 < 700) seen = true;
      var wantAngle = Math.atan2(py - car.y, px - car.x);
      var diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var steer = Math.max(-1, Math.min(1, diff * 2));
      var hit = Vehicles.steerCar(car, dt, d2 > 90 ? 1 : 0.3, steer);
      if (hit) car.angle += 0.6;
      if (d2 < 55) {
        window.GameEvents.rammed(Math.abs(car.speed));
        car.speed *= -0.4;
      }
    }
    if (!seen) {
      heat = Math.max(0, heat - dt * 7);
      var lvl = heat < 12 ? 0 : heat < 30 ? 1 : heat < 60 ? 2 : heat < 110 ? 3 : heat < 180 ? 4 : 5;
      if (lvl < wanted) {
        wanted = lvl;
        if (wanted === 0) { cops = []; copCars = []; AudioSys.sirenSet(false); }
      }
    } else {
      heat = Math.max(heat, wanted * 12);
    }
  }

  function draw(ctx) {
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);
      var bob = Math.sin(c.phase) * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2a4a';
      ctx.fillRect(-9, -8 + bob, 18, 16);
      ctx.fillStyle = '#f0c090';
      ctx.beginPath(); ctx.arc(11, 0, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a2a4a';
      ctx.beginPath(); ctx.arc(12, -2, 7, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8c83a';
      ctx.fillRect(4, -3, 6, 6);
      ctx.restore();
    }
  }

  window.Police = {
    reset: reset, addHeat: addHeat, clearWanted: clearWanted, update: update, draw: draw,
    getWanted: function () { return wanted; },
    setWanted: function (n) { wanted = n; heat = n * 25; },
    getCops: function () { return cops; },
    getCopCars: function () { return copCars; }
  };
})();
