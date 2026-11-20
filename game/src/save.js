// save.js: localStorage save and load for Palmetto progress.
(function () {
  var KEY = 'palmetto-save-v1';
  window.SaveSys = {
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (!raw) return null;
        var data = JSON.parse(raw);
        if (!data || typeof data !== 'object') return null;
        return data;
      } catch (e) { return null; }
    },
    save: function (state) {
      try {
        var data = {
          cash: state.cash,
          missionIndex: state.missionIndex,
          completed: state.completed,
          x: Math.round(state.x),
          y: Math.round(state.y),
          health: state.health,
          savedAt: Date.now()
        };
        localStorage.setItem(KEY, JSON.stringify(data));
        return true;
      } catch (e) { return false; }
    },
    clear: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
    },
    hasSave: function () {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    }
  };
})();
