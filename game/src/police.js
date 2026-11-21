// police.js: wanted stars, foot cops and police cars that chase and arrest.
(function () {
  var wanted = 0;
  var heat = 0;
  var cops = [];
  var copCars = [];
  var arrestTimer = 0;
  var spawnDelay = 0;
  // True when the most recent return to wanted 0 came from heat decaying
  // away (losing the cops), not from an instant clear (safehouse, spray
  // shop, busted, wasted). Mission 4 only counts a decayed escape.
  var decayedToZero = false;

  function levelFor(h) {
    return h < 12 ? 0 : h < 40 ? 1 : h < 60 ? 2 : h < 110 ? 3 : h < 180 ? 4 : 5;
  }

  function reset() {
    wanted = 0; heat = 0; cops = []; copCars = []; arrestTimer = 0; spawnDelay = 0; decayedToZero = false;
  }

  function resetArrest() { arrestTimer = 0; }

  function addHeat(amount) {
    heat += amount;
    var level = levelFor(heat);
    if (level > 0) decayedToZero = false;
    if (level > wanted) {
      wanted = level;
      AudioSys.alarm();
    }
  }

  // Pull cop cars out of the world for good. Police cars are created with
  // Vehicles.makeCar, which pushes them into Vehicles.cars; emptying the
  // copCars list alone leaves ghost cars driving around forever.
  function removeCopCars() {
    for (var i = 0; i < copCars.length; i++) Vehicles.removeCar(copCars[i]);
    cops = []; copCars = [];
  }

  function clearWanted() {
    wanted = 0; heat = 0;
    arrestTimer = 0; spawnDelay = 0; decayedToZero = false;
    removeCopCars();
    AudioSys.sirenSet(false);
  }

  // Drop the farthest extras when the wanted level falls, so the chase
  // thins out instead of piling up.
  function despawnExcess(list, want, px, py, isCars) {
    while (list.length > want) {
      var far = 0, farD = -1;
      for (var i = 0; i < list.length; i++) {
        var d = Math.hypot(px - list[i].x, py - list[i].y);
        if (d > farD) { farD = d; far = i; }
      }
      var removed = list.splice(far, 1)[0];
      if (isCars) Vehicles.removeCar(removed);
    }
  }

  function spawnCopNear(x, y, inCar) {
    var sx = x;
    var sy = y;
    var placed = false;
    for (var t = 0; t < 24 && !placed; t++) {
      var a = Math.random() * Math.PI * 2;
      var r = 420 + Math.random() * 120;
      var cx = x + Math.cos(a) * r;
      var cy = y + Math.sin(a) * r;
      cx = Math.max(60, Math.min(City.W - 60, cx));
      cy = Math.max(60, Math.min(City.H - 60, cy));
      if (City.isRoad(cx, cy) && !City.collideCircle(cx, cy, 12)) {
        sx = cx; sy = cy; placed = true;
      }
    }
    if (!placed) {
      var found = false;
      for (var rr = 200; rr <= 520 && !found; rr += 40) {
        for (var k = 0; k < 24 && !found; k++) {
          var ang = (k / 24) * Math.PI * 2;
          var fx = x + Math.cos(ang) * rr;
          var fy = y + Math.sin(ang) * rr;
          fx = Math.max(60, Math.min(City.W - 60, fx));
          fy = Math.max(60, Math.min(City.H - 60, fy));
          if (City.isRoad(fx, fy) && !City.collideCircle(fx, fy, 12)) {
            sx = fx; sy = fy; found = true;
          }
        }
      }
      if (!found) {
        sx = Math.max(60, Math.min(City.W - 60, sx));
        sy = Math.max(60, Math.min(City.H - 60, sy));
      }
    }
    if (inCar) {
      var car = Vehicles.makeCar('police', sx, sy, Math.atan2(y - sy, x - sx), false);
      car.traffic = false;
      car.driver = 'police';
      car.top = 280 + 25 * wanted;
      car.ramCd = 0;
      copCars.push(car);
    } else {
      cops.push({ x: sx, y: sy, angle: 0, speed: 165, phase: 0 });
    }
  }

  // Shove the player's car away from a ramming cop car so one hit cannot
  // pin the player in place. Positional nudge plus a small forward boost.
  function pushPlayerCar(copCar) {
    var pc = Player.car;
    if (!pc) return;
    var pa = Math.atan2(Player.y - copCar.y, Player.x - copCar.x);
    var nx = pc.x + Math.cos(pa) * 26;
    var ny = pc.y + Math.sin(pa) * 26;
    if (!City.collideCircle(nx, ny, 18)) { pc.x = nx; pc.y = ny; }
    if (pc.speed >= 0) pc.speed = Math.min(pc.top, pc.speed + 40);
  }

  function update(dt, px, py, playerInCar, playerSpeed) {
    var wantCops = wanted === 0 ? 0 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : 4;
    var wantCars = wanted >= 3 ? Math.min(3, wanted - 1) : 0;
    despawnExcess(cops, wantCops, px, py, false);
    despawnExcess(copCars, wantCars, px, py, true);
    // The first cops take a second to arrive after a crime, and heat does
    // not decay while they are on their way, or the wanted level can clear
    // before a single cop is ever seen.
    var delayActive = false;
    if (wanted > 0 && cops.length === 0 && copCars.length === 0) {
      if (spawnDelay <= 0) spawnDelay = 1.0;
      spawnDelay -= dt;
      delayActive = spawnDelay > 0;
    }
    if (!delayActive) {
      while (cops.length < wantCops) spawnCopNear(px, py, false);
      while (copCars.length < wantCars) spawnCopNear(px, py, true);
    }
    if (wanted === 0) {
      removeCopCars();
      arrestTimer = 0;
      AudioSys.sirenSet(false);
      return;
    }
    AudioSys.sirenSet(true);
    AudioSys.sirenTick(dt);
    var seen = false;
    var anyClose = false;
    for (var i = 0; i < cops.length; i++) {
      var c = cops[i];
      var d = Math.hypot(px - c.x, py - c.y);
      if (d < 550) seen = true;
      if (d < 26 && !playerInCar) anyClose = true;
      c.angle = Math.atan2(py - c.y, px - c.x);
      var sp = d < 60 ? c.speed * 1.2 : c.speed;
      var dx = Math.cos(c.angle) * sp * dt;
      var dy = Math.sin(c.angle) * sp * dt;
      var movedX = false;
      var movedY = false;
      if (!City.collideCircle(c.x + dx, c.y, 12)) { c.x += dx; movedX = true; }
      if (!City.collideCircle(c.x, c.y + dy, 12)) { c.y += dy; movedY = true; }
      if (!movedX) {
        var sy = sp * dt;
        var northFree = !City.collideCircle(c.x, c.y - sy, 12);
        var southFree = !City.collideCircle(c.x, c.y + sy, 12);
        var pickY = 0;
        if (northFree && !City.collideCircle(c.x + dx, c.y - sy, 12)) pickY = -1;
        else if (southFree && !City.collideCircle(c.x + dx, c.y + sy, 12)) pickY = 1;
        else if (dy < 0 && northFree) pickY = -1;
        else if (dy > 0 && southFree) pickY = 1;
        else if (northFree) pickY = -1;
        else if (southFree) pickY = 1;
        if (pickY !== 0) c.y += pickY * sy;
      }
      if (!movedY) {
        var sx = sp * dt;
        var westFree = !City.collideCircle(c.x - sx, c.y, 12);
        var eastFree = !City.collideCircle(c.x + sx, c.y, 12);
        var pickX = 0;
        if (westFree && !City.collideCircle(c.x - sx, c.y + dy, 12)) pickX = -1;
        else if (eastFree && !City.collideCircle(c.x + sx, c.y + dy, 12)) pickX = 1;
        else if (dx < 0 && westFree) pickX = -1;
        else if (dx > 0 && eastFree) pickX = 1;
        else if (westFree) pickX = -1;
        else if (eastFree) pickX = 1;
        if (pickX !== 0) c.x += pickX * sx;
      }
      c.phase += dt * 10;
    }
    // The arrest timer charges once per frame however many cops are close,
    // and drains when nobody is close, so a bust always takes ~1.2s of
    // contact and a near miss does not carry over to the next encounter.
    if (anyClose) {
      arrestTimer += dt;
      if (arrestTimer > 1.2) {
        arrestTimer = 0;
        window.GameEvents.busted();
      }
    } else {
      arrestTimer = Math.max(0, arrestTimer - dt * 2);
    }
    for (var j = 0; j < copCars.length; j++) {
      var car = copCars[j];
      car.top = 280 + 25 * wanted;
      car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
      var d2 = Math.hypot(px - car.x, py - car.y);
      if (d2 < 550) seen = true;
      var wantAngle = Math.atan2(py - car.y, px - car.x);
      var diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      var steer = Math.max(-1, Math.min(1, diff * 2));
      var throttle = car.ramCd > 0 ? 0 : (d2 > 90 ? 1 : 0.3);
      var hit = Vehicles.steerCar(car, dt, throttle, steer);
      if (hit) car.angle += 0.6;
      // A ram only counts when the cop car is actually moving, and only
      // once per car per 2s. The cop bounces off and coasts while its
      // cooldown runs, and the player car is shoved clear.
      if (d2 < 55 && Math.abs(car.speed) > 120 && car.ramCd <= 0) {
        car.ramCd = 2;
        window.GameEvents.rammed(Math.abs(car.speed));
        pushPlayerCar(car);
        car.speed *= -0.5;
      }
    }
    if (!seen && !delayActive) {
      heat = Math.max(0, heat - dt * 7);
      var lvl = levelFor(heat);
      if (lvl < wanted) {
        wanted = lvl;
        if (wanted === 0) { decayedToZero = true; removeCopCars(); arrestTimer = 0; AudioSys.sirenSet(false); }
      }
    } else if (seen) {
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
    reset: reset, resetArrest: resetArrest, addHeat: addHeat, clearWanted: clearWanted, update: update, draw: draw,
    getWanted: function () { return wanted; },
    setWanted: function (n) { wanted = n; heat = n * 25; if (n > 0) decayedToZero = false; },
    decayedToZero: function () { return decayedToZero; },
    getCops: function () { return cops; },
    getCopCars: function () { return copCars; }
  };
})();
