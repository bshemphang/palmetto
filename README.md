# Palmetto

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/bshemphang/palmetto/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/bshemphang/palmetto/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
Sign up with my referral link: https://make.fun/r/v6wvv0dh

Palmetto is a sun-soaked open-world crime game built for the make.fun gta6-01 bounty. You play Rico Vane, a wheelman fresh out of the Docks, working five story missions for crew boss Mara while the Palmetto PD, taxi fares and package runs fill the streets around you. Everything is original: the city, the characters, the vehicles, the story, the art and the sound. Pure HTML5 canvas and vanilla JavaScript, no engine, no libraries, no network requests.

## How to play

Open `game/index.html` in desktop Chrome, or serve the folder with `node serve.ts` and visit `http://localhost:8080`. Click New Game, or Continue to pick up your save.

## Controls

- WASD or Arrow keys: walk, run and drive
- Shift: run
- E: enter or exit a car (walk up to a parked car and press E to steal it)
- Space or F: punch, or shoot when no one is in reach
- M: start the current mission
- T: take a taxi fare job
- P: take a package pickup job
- Mouse: menus

## Systems

- City: a 3200 by 2400 street grid with five named districts, the Docks, Downtown, the Market, the Suburbs and Beachfront, with varied buildings, parks, palms, a beach and open water.
- Driving: four car types (sedan, taxi, pickup, sports) plus police cars, each with its own top speed, acceleration and handling. Traffic cars drive the roads and turn at junctions. Pedestrians walk the sidewalks and flee when scared.
- Wanted: 1 to 5 stars. Stealing cars, hitting pedestrians, shooting and speeding near police raise your heat. Foot cops chase and try to arrest you on contact, police cars ram you. Wanted decays when you stay out of sight, and the safehouse or the spray shop clears it.
- Missions: a chain of five story missions with briefing text, objective markers, a timer on the delivery run, and cash rewards, plus free-roam taxi fares and package pickups for extra cash.
- HUD: health, cash, wanted stars, mission objective, speed while driving, and a live minimap showing you, cars, police and the mission marker.
- Save: cash, mission progress, health and position save to localStorage.
- Sound: fully synthesised WebAudio, engine hum, sirens, pickup blips, gunshots and crashes. No audio files.
- Camera: smooth follow that pulls back a little while you drive.

## Build

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output directory and writes `dossier.json` with the kit dossier builder:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built by x3npai for the make.fun gta6-01 bounty. Competition page: https://make.fun/bounty/gta6-01
