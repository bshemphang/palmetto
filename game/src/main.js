// main.js: boot, game loop, camera, combat, stealing, wanted triggers and menus.
(function () {
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  Input.bindCanvas(canvas);

  var state = 'menu';
  var cam = { x: 960, y: 940, w: 1280, h: 720, zoom: 1 };
  var zoomTarget = 1;
  var saveTimer = 0;
  var shotMode = null;
  var shotReady = false;
  var flashTimer = 0;
  var flashText = '';
  var hitCd = 0;
  var ramCd = 0;
  var params = new URLSearchParams(window.location.search);
  shotMode = params.get('shot');
  var seedParam = params.get('seed');

  var buttons = [];

  window.GameEvents = {
    busted: function () {
      state = 'busted';
      Player.cash = Math.max(0, Player.cash - 200);
      Police.clearWanted();
      AudioSys.engineStop();
      AudioSys.sirenSet(false);
    },
    rammed: function (speed) {
      if (state !== 'playing') return;
      if (ramCd > 0) return;
      ramCd = 1.0;
      Player.health -= Math.min(12, 3 + speed * 0.02);
      AudioSys.crash();
      flash('RAMMED BY POLICE');
      if (Player.health <= 0) wasted();
    }
  };

  function flash(text) { flashText = text; flashTimer = 1.6; }

  function wasted() {
    state = 'wasted';
    Player.health = 100;
    Player.cash = Math.max(0, Player.cash - 100);
    Police.clearWanted();
    if (Player.car) { Player.car.driver = null; Player.car = null; Player.onFoot = true; }
    Player.x = City.safehouse.x; Player.y = City.safehouse.y;
    AudioSys.engineStop();
  }

  function newGame() {
    SaveSys.clear();
    Player.cash = 50;
    Player.health = 100;
    Missions.reset();
    Police.reset();
    PlayerApi.reset(1600, 1300);
    Vehicles.spawnWorld();
    Pedestrians.spawnWorld();
    state = 'playing';
    Missions.start();
    AudioSys.unlock();
  }

  function continueGame() {
    var s = SaveSys.load();
    if (!s) { newGame(); return; }
    Player.cash = s.cash || 50;
    Player.health = s.health || 100;
    Missions.loadProgress(s.missionIndex || 0, false);
    Police.reset();
    PlayerApi.reset(s.x || 1600, s.y || 1300);
    Vehicles.spawnWorld();
    Pedestrians.spawnWorld();
    state = 'playing';
    AudioSys.unlock();
  }

  function setupShot(mode) {
    Vehicles.spawnWorld();
    Pedestrians.spawnWorld();
    Police.reset();
    Missions.reset();
    if (mode === 'chase') {
      PlayerApi.reset(1300, 300);
      var car = Vehicles.nearestParked(1300, 300, 500);
      if (car) enterCar(car, true);
      Missions.state.index = 3;
      Missions.start();
      Police.setWanted(3);
      state = 'playing';
    } else if (mode === 'drive') {
      PlayerApi.reset(900, 300);
      var car2 = Vehicles.nearestParked(900, 300, 600);
      if (car2) enterCar(car2, true);
      Missions.state.index = 0;
      state = 'playing';
    } else if (mode === 'foot') {
      PlayerApi.reset(900, 700);
      state = 'playing';
    } else if (mode === 'mission') {
      PlayerApi.reset(500, 300);
      var car3 = Vehicles.nearestParked(500, 300, 600);
      if (car3) enterCar(car3, true);
      Missions.state.index = 0;
      Missions.start();
      state = 'playing';
    } else {
      state = 'menu';
    }
    AudioSys.unlock();
  }

  function enterCar(car, silent) {
    Player.car = car;
    Player.onFoot = false;
    car.driver = 'player';
    car.parked = false;
    Player.x = car.x; Player.y = car.y;
    Player.angle = car.angle;
    if (!silent) {
      Police.addHeat(14);
      flash('CAR STOLEN - THE COPS NOTICED');
      AudioSys.engineStart();
      AudioSys.alarm();
    }
  }

  function exitCar() {
    var car = Player.car;
    if (!car) return;
    car.driver = null;
    car.speed = 0;
    Player.onFoot = true;
    Player.x = car.x - Math.cos(car.angle) * 40;
    Player.y = car.y - Math.sin(car.angle) * 40;
    Player.car = null;
    AudioSys.engineStop();
    AudioSys.engineSet(0, false);
  }

  function tryPunchOrShoot() {
    if (Player.punchCd > 0 && Player.shootCd > 0) return;
    if (Player.onFoot) {
      var near = Pedestrians.nearest(Player.x + Math.cos(Player.angle) * 24, Player.y + Math.sin(Player.angle) * 24, 46);
      if (near) {
        near.flee = 3;
        near.angle = Math.atan2(near.y - Player.y, near.x - Player.x);
        Police.addHeat(8);
        Pedestrians.scare(Player.x, Player.y, 160);
        AudioSys.punch();
        Player.punchCd = 0.4;
        return;
      }
      if (Player.ammo > 0) {
        Player.ammo--;
        Player.shootCd = 0.35;
        AudioSys.gunshot();
        var target = Pedestrians.nearest(Player.x, Player.y, 240);
        if (target) { target.flee = 4; Police.addHeat(12); }
        else Police.addHeat(6);
        Pedestrians.scare(Player.x, Player.y, 260);
        flash('GUNSHOT - AMMO ' + Player.ammo);
      }
    }
  }

  function update(dt) {
    if (state !== 'playing') return;
    flashTimer = Math.max(0, flashTimer - dt);
    hitCd = Math.max(0, hitCd - dt);
    ramCd = Math.max(0, ramCd - dt);
    saveTimer += dt;
    if (saveTimer > 5) {
      saveTimer = 0;
      SaveSys.save({ cash: Player.cash, missionIndex: Missions.state.index, completed: Missions.state.completedAll, x: Player.x, y: Player.y, health: Player.health });
    }
    var inCar = !Player.onFoot && Player.car;
    if (inCar) {
      var car = Player.car;
      var throttle = 0;
      if (Input.down('w') || Input.down('ArrowUp')) throttle = 1;
      if (Input.down('s') || Input.down('ArrowDown')) throttle = car.speed > 5 ? -1 : -0.6;
      var steer = 0;
      if (Input.down('a') || Input.down('ArrowLeft')) steer = -1;
      if (Input.down('d') || Input.down('ArrowRight')) steer = 1;
      var hitWall = Vehicles.steerCar(car, dt, throttle, steer);
      if (hitWall && hitCd <= 0) { hitCd = 0.6; AudioSys.crash(); Player.health -= 2; }
      car.brakeLight = throttle < 0;
      Player.x = car.x; Player.y = car.y; Player.angle = car.angle; Player.speed = car.speed;
      AudioSys.engineSet(Math.abs(car.speed) / car.top, true);
      if (Math.abs(car.speed) > 330) {
        var cops = Police.getCops();
        for (var ci = 0; ci < cops.length; ci++) {
          if (Math.hypot(cops[ci].x - car.x, cops[ci].y - car.y) < 320) { Police.addHeat(dt * 6); break; }
        }
      }
      var peds = Pedestrians.getPeds();
      for (var pi = 0; pi < peds.length; pi++) {
        var p = peds[pi];
        if (!p.alive) continue;
        if (Math.hypot(p.x - car.x, p.y - car.y) < 30 && Math.abs(car.speed) > 40) {
          p.alive = false;
          Police.addHeat(14);
          Pedestrians.scare(car.x, car.y, 240);
          AudioSys.crash();
          flash('PEDESTRIAN HIT');
          setTimeout(function () { Pedestrians.spawnWorld(); }, 8000);
        }
      }
    } else {
      PlayerApi.update(dt);
      AudioSys.engineSet(0, false);
    }
    if (Input.pressed('e') || Input.pressed('E')) {
      if (Player.onFoot) {
        var nearCar = Vehicles.nearestParked(Player.x, Player.y, 75);
        if (nearCar) enterCar(nearCar, false);
      } else {
        exitCar();
      }
    }
    if (Input.pressed('Space') || Input.pressed('f') || Input.pressed('F')) tryPunchOrShoot();
    if (Input.pressed('m') || Input.pressed('M')) {
      if (!Missions.state.active && !Missions.state.completedAll) Missions.start();
    }
    if (Input.pressed('t') || Input.pressed('T')) {
      if (!Missions.state.job) Missions.startTaxi();
    }
    if (Input.pressed('p') || Input.pressed('P')) {
      if (!Missions.state.job) Missions.startPackage();
    }
    Vehicles.updateTraffic(dt, Player.x, Player.y);
    Pedestrians.update(dt, Player.x, Player.y, Player.speed);
    Police.update(dt, Player.x, Player.y, !!inCar, Player.speed);
    Missions.update(dt, Player.x, Player.y, !!inCar, inCar ? inCar.type : null);
    var sh = City.safehouse, sp = City.sprayShop;
    if (Math.hypot(Player.x - sh.x, Player.y - sh.y) < 90 && Police.getWanted() > 0) {
      Police.clearWanted();
      Player.health = 100;
      flash('SAFEHOUSE - WANTED CLEARED, HEALTH RESTORED');
      AudioSys.coin();
    }
    if (Math.hypot(Player.x - sp.x, Player.y - sp.y) < 90 && Police.getWanted() > 0) {
      Police.clearWanted();
      Player.cash = Math.max(0, Player.cash - 50);
      flash('SPRAY SHOP - CLEAN PAINT, WANTED CLEARED (-$50)');
      AudioSys.coin();
    }
    if (Player.health <= 0) wasted();
    var tx = Player.x, ty = Player.y;
    zoomTarget = inCar ? 0.82 : 1;
    cam.zoom += (zoomTarget - cam.zoom) * Math.min(1, dt * 2);
    cam.w = 1280 / cam.zoom;
    cam.h = 720 / cam.zoom;
    cam.x += (tx - cam.w / 2 - cam.x) * Math.min(1, dt * 5);
    cam.y += (ty - cam.h / 2 - cam.y) * Math.min(1, dt * 5);
    cam.x = Math.max(0, Math.min(City.W - cam.w, cam.x));
    cam.y = Math.max(0, Math.min(City.H - cam.h, cam.y));
  }

  function drawWorld() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1a24';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.save();
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
    City.draw(ctx, cam);
    var sh = City.safehouse, sp = City.sprayShop;
    ctx.fillStyle = '#2a6a8a';
    ctx.fillRect(sh.x - 30, sh.y - 22, 60, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SAFEHOUSE', sh.x, sh.y + 4);
    ctx.fillStyle = '#e83a8a';
    ctx.fillRect(sp.x - 30, sp.y - 22, 60, 44);
    ctx.fillStyle = '#fff';
    ctx.fillText('SPRAY SHOP', sp.x, sp.y + 4);
    ctx.textAlign = 'left';
    var mk = Missions.marker();
    if (mk) {
      var pulse = 26 + Math.sin(Date.now() / 300) * 6;
      ctx.strokeStyle = mk.color;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(mk.x, mk.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = mk.color;
      ctx.beginPath(); ctx.arc(mk.x, mk.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(mk.x, mk.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = mk.color;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(mk.x, mk.y - pulse - 34); ctx.lineTo(mk.x, mk.y - pulse - 10); ctx.stroke();
      ctx.fillStyle = mk.color;
      ctx.beginPath(); ctx.moveTo(mk.x, mk.y - pulse - 40); ctx.lineTo(mk.x - 8, mk.y - pulse - 26); ctx.lineTo(mk.x + 8, mk.y - pulse - 26); ctx.closePath(); ctx.fill();
    }
    Vehicles.draw(ctx);
    Pedestrians.draw(ctx);
    Police.draw(ctx);
    if (Player.onFoot) PlayerApi.draw(ctx);
    ctx.restore();
  }

  function drawMenu() {
    drawWorld();
    ctx.fillStyle = 'rgba(8,18,26,0.78)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd83a';
    ctx.font = 'bold 84px Arial';
    ctx.fillText('PALMETTO', 640, 170);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('A sun-soaked open world. Steal it. Drive it. Own it.', 640, 212);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#cfe8ff';
    ctx.fillText('You are Rico Vane, a wheelman fresh out of the Docks. Mara runs the crew now,', 640, 258);
    ctx.fillText('and five jobs stand between you and the biggest score Palmetto has ever seen.', 640, 282);
    ctx.fillText('Five missions, taxi fares, package runs, and a police force that never sleeps.', 640, 306);
    buttons = [];
    var hasSave = SaveSys.hasSave();
    var by = 350;
    function button(label, y, action) {
      buttons.push({ x: 490, y: y, w: 300, h: 52, label: label, action: action });
      ctx.fillStyle = '#ffd83a';
      ctx.fillRect(490, y, 300, 52);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 22px Arial';
      ctx.fillText(label, 640, y + 34);
    }
    button('NEW GAME', by, 'new');
    if (hasSave) button('CONTINUE', by + 66, 'continue');
    ctx.fillStyle = '#fff';
    ctx.font = '15px Arial';
    ctx.fillText('WASD / Arrows: move and drive    E: enter or exit car    Space / F: punch or shoot', 640, 520);
    ctx.fillText('Shift: run    M: start mission    T: taxi fare    P: package job    Mouse: menus', 640, 544);
    ctx.fillText('Stealing cars, hitting pedestrians and shooting raise your wanted level.', 640, 568);
    ctx.fillText('Lose the cops out of sight, or clear it at the safehouse or spray shop.', 640, 592);
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, sub, color) {
    ctx.fillStyle = 'rgba(8,18,26,0.8)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.font = 'bold 72px Arial';
    ctx.fillText(title, 640, 320);
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(sub, 640, 370);
    ctx.font = '16px Arial';
    ctx.fillText('Press Enter to keep playing', 640, 410);
    ctx.textAlign = 'left';
  }

  function render() {
    if (state === 'menu') {
      drawMenu();
    } else if (state === 'busted') {
      drawWorld();
      drawOverlay('BUSTED', 'The Palmetto PD caught you. -$200 bail, wanted cleared.', '#4a9aff');
    } else if (state === 'wasted') {
      drawWorld();
      drawOverlay('WASTED', 'You woke up at the safehouse. -$100 hospital bill.', '#ff4a4a');
    } else {
      drawWorld();
      var nearCar = null;
      if (Player.onFoot) {
        var nc = Vehicles.nearestParked(Player.x, Player.y, 75);
        if (nc) nearCar = nc.name;
      }
      Hud.draw(ctx, {
        px: Player.x, py: Player.y, health: Player.health, cash: Player.cash,
        wanted: Police.getWanted(), inCar: !Player.onFoot, speed: Player.speed || 0,
        carName: Player.car ? Player.car.name : '', nearCar: nearCar, cam: cam
      });
      if (flashTimer > 0) {
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        var fw = ctx.measureText(flashText).width;
        ctx.fillRect((1280 - fw) / 2 - 12, 200, fw + 24, 38);
        ctx.fillStyle = '#ff6a5a';
        ctx.fillText(flashText, 640, 226);
        ctx.textAlign = 'left';
      }
    }
    shotReady = true;
    window.__shotReady = true;
  }

  function handleClicks() {
    if (!Input.mouse.clicked) return;
    var mx = Input.mouse.clickX, my = Input.mouse.clickY;
    if (state === 'menu') {
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
          if (b.action === 'new') newGame();
          if (b.action === 'continue') continueGame();
        }
      }
    }
  }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleClicks();
    if (state === 'busted' || state === 'wasted') {
      if (Input.pressed('Enter')) {
        PlayerApi.reset(City.safehouse.x, City.safehouse.y);
        state = 'playing';
      }
    }
    update(dt);
    render();
    Input.endFrame();
    requestAnimationFrame(loop);
  }

  Vehicles.spawnWorld();
  Pedestrians.spawnWorld();
  PlayerApi.reset(1600, 1300);
  if (shotMode) setupShot(shotMode);
  window.__palmetto = { getState: function () { return state; }, getPlayer: function () { return Player; } };
  requestAnimationFrame(loop);
})();
