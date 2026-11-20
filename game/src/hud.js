// hud.js: health, cash, wanted stars, objective, speed and the live minimap.
(function () {
  function drawStars(ctx, wanted) {
    for (var i = 0; i < 5; i++) {
      var x = 1080 + i * 34, y = 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i < wanted ? '#ffd83a' : 'rgba(0,0,0,0.45)';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (var k = 0; k < 10; k++) {
        var r = k % 2 === 0 ? 13 : 6;
        var a = -Math.PI / 2 + (k * Math.PI) / 5;
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawMinimap(ctx, px, py, cam) {
    var mw = 220, mh = 165, mx = 1280 - mw - 14, my = 96;
    ctx.save();
    ctx.fillStyle = 'rgba(8,20,28,0.82)';
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
    var sx = mw / City.W, sy = mh / City.H;
    ctx.fillStyle = '#3a7a9e';
    ctx.fillRect(mx + 2720 * sx, my, (3200 - 2720) * sx, mh);
    ctx.fillStyle = '#f0dc9e';
    ctx.fillRect(mx + 2720 * sx - 8, my, 8, mh);
    ctx.fillStyle = '#555';
    for (var gx = 0; gx < 8; gx++) ctx.fillRect(mx + gx * 400 * sx, my, 96 * sx, mh);
    for (var gy = 0; gy < 6; gy++) ctx.fillRect(mx, my + gy * 400 * sy, mw, 96 * sy);
    ctx.fillStyle = '#7fae62';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#3a7a9e';
    ctx.fillRect(mx + 2720 * sx, my, (3200 - 2720) * sx, mh);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var gx2 = 0; gx2 < 8; gx2++) ctx.fillRect(mx + gx2 * 400 * sx, my, 96 * sx, mh);
    for (var gy2 = 0; gy2 < 6; gy2++) ctx.fillRect(mx, my + gy2 * 400 * sy, mw, 96 * sy);
    var cars = Vehicles.getCars();
    for (var i = 0; i < cars.length; i++) {
      var c = cars[i];
      ctx.fillStyle = c.type === 'police' ? '#4a9aff' : '#e8e8e8';
      ctx.fillRect(mx + c.x * sx - 2, my + c.y * sy - 2, 4, 4);
    }
    var mk = Missions.marker();
    if (mk) {
      ctx.fillStyle = mk.color;
      ctx.beginPath();
      ctx.arc(mx + mk.x * sx, my + mk.y * sy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
    ctx.fillStyle = '#2a6a8a';
    ctx.beginPath(); ctx.arc(mx + City.safehouse.x * sx, my + City.safehouse.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e83a8a';
    ctx.beginPath(); ctx.arc(mx + City.sprayShop.x * sx, my + City.sprayShop.y * sy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ff3a3a';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mx + px * sx, my + py * sy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    var vw = cam.w * sx, vh = cam.h * sy;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, vw, vh);
    ctx.restore();
  }

  function draw(ctx, view) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, 12, 250, 46);
    ctx.fillStyle = '#ffd83a';
    ctx.fillText('PALMETTO', 22, 44);
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(City.districtAt(view.px, view.py), 180, 42);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, 66, 220, 30);
    ctx.fillStyle = '#3ac83a';
    ctx.fillRect(20, 74, 180 * Math.max(0, view.health) / 100, 14);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(20, 74, 180, 14);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('HP ' + Math.ceil(view.health), 206, 86);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(12, 102, 220, 30);
    ctx.fillStyle = '#3ac83a';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('$' + view.cash, 22, 124);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('Mission ' + (Missions.state.completedAll ? 'DONE' : (Missions.state.index + 1) + '/5'), 130, 124);
    drawStars(ctx, view.wanted);
    var m = Missions.current();
    var objText = '';
    if (Missions.state.active && m) {
      objText = m.title + ': ' + (m.goal === 'timed' && Missions.state.phase === 'pickup' ? 'Pick up the package' : m.goal === 'timed' ? 'Deliver to the Docks' : m.goal === 'escape' ? 'Lose the cops, reach the safehouse' : 'Reach the blue marker');
      if (m.goal === 'timed') objText += '  ' + Math.ceil(Missions.state.timer) + 's';
    } else if (Missions.state.job) {
      objText = (Missions.state.job.kind === 'taxi' ? 'Taxi: ' : 'Package: ') + (Missions.state.job.phase === 'pickup' ? 'pick up at the marker' : 'deliver to the marker') + '  +$' + Missions.state.job.reward;
    } else if (Missions.state.completedAll) {
      objText = 'All missions complete. Free roam Palmetto. Press T for a taxi fare, P for a package.';
    } else {
      objText = 'Press M to start mission ' + (Missions.state.index + 1) + ': ' + (m ? m.title : '');
    }
    ctx.font = 'bold 16px Arial';
    var tw = ctx.measureText(objText).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(12, 668, tw + 24, 38);
    ctx.fillStyle = '#fff';
    ctx.fillText(objText, 24, 693);
    if (view.inCar) {
      var kmh = Math.round(Math.abs(view.speed) * 0.55);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(1150, 640, 118, 66);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(String(kmh), 1236, 674);
      ctx.font = 'bold 13px Arial';
      ctx.fillText('km/h  ' + view.carName, 1236, 694);
      ctx.textAlign = 'left';
    }
    if (Missions.state.messageTimer > 0 && Missions.state.message) {
      ctx.font = 'bold 17px Arial';
      var words = Missions.state.message.split(' ');
      var lines = [''];
      for (var wi = 0; wi < words.length; wi++) {
        var trial = lines[lines.length - 1] + (lines[lines.length - 1] ? ' ' : '') + words[wi];
        if (ctx.measureText(trial).width > 700 && lines[lines.length - 1]) lines.push(words[wi]);
        else lines[lines.length - 1] = trial;
      }
      var mw2 = 0;
      for (var li = 0; li < lines.length; li++) mw2 = Math.max(mw2, ctx.measureText(lines[li]).width);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect((1280 - mw2) / 2 - 14, 140, mw2 + 28, 20 + lines.length * 22);
      ctx.fillStyle = '#ffe89a';
      ctx.textAlign = 'center';
      for (var lj = 0; lj < lines.length; lj++) ctx.fillText(lines[lj], 640, 164 + lj * 22);
      ctx.textAlign = 'left';
    }
    if (view.nearCar) {
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(520, 620, 240, 34);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('Press E to steal the ' + view.nearCar, 640, 642);
      ctx.textAlign = 'left';
    }
    drawMinimap(ctx, view.px, view.py, view.cam);
    ctx.restore();
  }

  window.Hud = { draw: draw };
})();
