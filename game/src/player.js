// player.js: the on-foot player, health, cash and movement.
(function () {
  var player = {
    x: 1600, y: 1300, angle: 0, health: 100, cash: 50,
    speed: 0, onFoot: true, car: null, punchCd: 0, shootCd: 0,
    moving: false, walkPhase: 0, ammo: 24, hasGun: true
  };

  function reset(x, y) {
    player.x = x; player.y = y; player.angle = 0;
    player.health = 100; player.onFoot = true; player.car = null;
    player.speed = 0; player.ammo = 24;
  }

  function update(dt) {
    player.punchCd = Math.max(0, player.punchCd - dt);
    player.shootCd = Math.max(0, player.shootCd - dt);
    if (!player.onFoot) return;
    var ax = Input.axisX();
    var ay = Input.axisY();
    var len = Math.hypot(ax, ay);
    player.moving = len > 0;
    if (len > 0) {
      var run = Input.down('Shift') ? 1.8 : 1;
      var sp = 175 * run;
      var nx = player.x + (ax / len) * sp * dt;
      var ny = player.y + (ay / len) * sp * dt;
      if (!City.collideCircle(nx, player.y, 14)) player.x = nx;
      if (!City.collideCircle(player.x, ny, 14)) player.y = ny;
      player.angle = Math.atan2(ay, ax);
      player.walkPhase += dt * (run > 1 ? 14 : 9);
      player.speed = sp;
    } else {
      player.speed = 0;
    }
    if (player.health < 100) player.health = Math.min(100, player.health + dt * 1.2);
  }

  function draw(ctx) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    var bob = player.moving ? Math.sin(player.walkPhase) * 2 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 4, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2a6a8a';
    ctx.fillRect(-9, -8 + bob, 18, 16);
    ctx.fillStyle = '#f0c090';
    ctx.beginPath(); ctx.arc(11, 0, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(12, -2, 7, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(8, -12 + bob, 6, 6);
    ctx.fillRect(8, 6 - bob, 6, 6);
    ctx.restore();
  }

  window.Player = player;
  window.PlayerApi = { reset: reset, update: update, draw: draw };
})();
