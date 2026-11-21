// missions.js: the 5-mission story chain plus taxi fares and package pickups.
(function () {
  var MISSIONS = [
    {
      title: 'Welcome to Palmetto',
      brief: 'Mara needs a driver she can trust. Steal any car and drive to the blue marker at the Docks to meet her.',
      goal: 'reach', x: 300, y: 48, reward: 150, needCar: true,
      done: 'Mara: You drive like you mean it. The crew is yours now.'
    },
    {
      title: 'Hot Wheels',
      brief: 'Borrow a sports car and bring it to the spray shop on Coral Row. Fast cars only, and do not get caught.',
      goal: 'reachCar', x: 1500, y: 500, reward: 300, needCar: true, needType: 'sports',
      done: 'Mara: Fresh paint, clean plates. That car is a ghost now.'
    },
    {
      title: 'Dockside Delivery',
      brief: 'Pick up the package at the Market and run it to the Docks before the timer ends. 90 seconds, no excuses.',
      goal: 'timed', x: 300, y: 48, pickupX: 848, pickupY: 1500, reward: 450, time: 90,
      done: 'Mara: Delivered clean. The buyers are happy and so am I.'
    },
    {
      title: 'Beachfront Heat',
      brief: 'The cops are onto the crew. Lose a 3 star wanted level, then reach the safehouse in the Suburbs.',
      goal: 'escape', x: 2080, y: 2100, reward: 600, needStars: 3,
      done: 'Mara: You shook them. Nobody shakes the Palmetto PD like that.'
    },
    {
      title: 'The Big Score',
      brief: 'One last job. Grab the downtown payroll van stash at the tower, then drive it to the beachfront drop. Go.',
      goal: 'reach', x: 2900, y: 1200, reward: 1200, needCar: false,
      done: 'Mara: That is the whole payroll. Palmetto is ours now. You did it.'
    }
  ];

  var state = {
    index: 0, active: false, phase: 'idle', timer: 0, message: '',
    messageTimer: 0, job: null, jobTimer: 0, completedAll: false,
    cleanEscape: true, prevWanted: 0
  };

  function current() { return MISSIONS[state.index] || null; }

  function start() {
    state.active = true;
    state.phase = 'go';
    var m = current();
    if (!m) { state.active = false; state.completedAll = true; return; }
    if (m.goal === 'timed') { state.phase = 'pickup'; state.timer = m.time; }
    if (m.goal === 'escape') { Police.setWanted(3); state.cleanEscape = true; }
    state.message = m.title + ': ' + m.brief;
    state.messageTimer = 6;
    AudioSys.mission();
  }

  function complete() {
    var m = current();
    if (!m) return;
    Player.cash += m.reward;
    state.message = m.done + '  +$' + m.reward;
    state.messageTimer = 6;
    AudioSys.coin();
    state.index++;
    state.active = false;
    state.phase = 'idle';
    if (state.index >= MISSIONS.length) state.completedAll = true;
  }

  function startTaxi() {
    var spots = [[900, 300], [1700, 1100], [2500, 1900], [500, 1900], [1300, 700]];
    var s = spots[Math.floor(Math.random() * spots.length)];
    state.job = { kind: 'taxi', x: s[0], y: s[1], reward: 80 + Math.floor(Math.random() * 60), phase: 'pickup' };
    state.message = 'Taxi fare: pick up the passenger at the yellow marker.';
    state.messageTimer = 5;
  }

  function startPackage() {
    var spots = [[48, 1500], [2100, 300], [900, 1900], [2500, 700]];
    var s = spots[Math.floor(Math.random() * spots.length)];
    state.job = { kind: 'package', x: s[0], y: s[1], reward: 120, phase: 'pickup' };
    state.message = 'Package job: collect the package at the green marker.';
    state.messageTimer = 5;
  }

  function cancelJob() {
    if (!state.job) return;
    state.job = null;
    state.message = 'Job cancelled. Press T for a taxi fare, P for a package.';
    state.messageTimer = 4;
  }

  function invalidateEscape() {
    state.cleanEscape = false;
  }

  function update(dt, px, py, inCar, carType) {
    state.messageTimer = Math.max(0, state.messageTimer - dt);
    var w = Police.getWanted();
    if (state.prevWanted === 0 && w > 0) state.cleanEscape = true;
    state.prevWanted = w;
    if (state.active) {
      var m = current();
      if (!m) return;
      if (m.goal === 'timed') {
        state.timer -= dt;
        if (state.timer <= 0) {
          state.message = 'Too slow. The buyers walked away. Try the mission again.';
          state.messageTimer = 5;
          state.active = false;
          state.phase = 'idle';
          return;
        }
      }
      var tx = m.x, ty = m.y;
      if (m.goal === 'timed' && state.phase === 'pickup') { tx = m.pickupX; ty = m.pickupY; }
      var d = Math.hypot(px - tx, py - ty);
      if (d < 70) {
        if (m.goal === 'timed' && state.phase === 'pickup') {
          state.phase = 'go';
          state.message = 'Package grabbed. Run it to the Docks, fast.';
          state.messageTimer = 4;
          AudioSys.blip();
          return;
        }
        if (m.goal === 'reachCar' && carType !== 'sports') {
          state.message = 'Wrong car. Mara wants a sports car for this one.';
          state.messageTimer = 3;
          return;
        }
        if (m.goal === 'reach' && m.needCar && !inCar) {
          state.message = 'You need a car for this. Steal one with E.';
          state.messageTimer = 3;
          return;
        }
        if (m.goal === 'escape' && Police.getWanted() > 0) {
          state.message = 'Still wanted. Lose the cops first, then come back.';
          state.messageTimer = 3;
          return;
        }
        if (m.goal === 'escape' && !state.cleanEscape) {
          state.message = 'You got caught or went down. Get hot again, then lose the cops cleanly.';
          state.messageTimer = 3;
          return;
        }
        complete();
      }
    }
    if (state.job) {
      var j = state.job;
      var dj = Math.hypot(px - j.x, py - j.y);
      if (dj < 60) {
        if (j.phase === 'pickup') {
          j.phase = 'drop';
          var drops = [[2900, 300], [500, 300], [1700, 1900], [2500, 1500]];
          var d2 = drops[Math.floor(Math.random() * drops.length)];
          j.x = d2[0]; j.y = d2[1];
          state.message = j.kind === 'taxi' ? 'Passenger aboard. Drive them to the drop marker.' : 'Package collected. Deliver it to the marker.';
          state.messageTimer = 4;
          AudioSys.blip();
        } else {
          Player.cash += j.reward;
          state.message = (j.kind === 'taxi' ? 'Fare complete. +$' : 'Delivery complete. +$') + j.reward;
          state.messageTimer = 4;
          AudioSys.coin();
          state.job = null;
        }
      }
    }
  }

  function marker() {
    if (state.active) {
      var m = current();
      if (!m) return null;
      if (m.goal === 'timed' && state.phase === 'pickup') return { x: m.pickupX, y: m.pickupY, color: '#3aa8e8' };
      return { x: m.x, y: m.y, color: '#3aa8e8' };
    }
    if (state.job) return { x: state.job.x, y: state.job.y, color: state.job.kind === 'taxi' ? '#e8c83a' : '#3ac83a' };
    return null;
  }

  window.Missions = {
    MISSIONS: MISSIONS, state: state, current: current, start: start,
    complete: complete, startTaxi: startTaxi, startPackage: startPackage, cancelJob: cancelJob,
    invalidateEscape: invalidateEscape,
    update: update, marker: marker,
    reset: function () {
      state.index = 0; state.active = false; state.phase = 'idle';
      state.timer = 0; state.job = null; state.completedAll = false;
      state.message = ''; state.messageTimer = 0;
      state.cleanEscape = true; state.prevWanted = 0;
    },
    loadProgress: function (index, completed) {
      state.index = index || 0;
      state.completedAll = !!completed;
      state.active = false; state.phase = 'idle'; state.job = null;
      state.cleanEscape = true; state.prevWanted = 0;
    }
  };
})();
