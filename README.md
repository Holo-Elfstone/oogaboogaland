# Ooga Booga Land

A WebGL2 floating island whose cliff caves are games. Voxel cavemen stand in for the contributors of [OogaBoogaX](https://github.com/OogaBoogaX); donated bananas feed them, the live Bitcoin mempool makes the weather, and a once-a-minute poll of the oogatron stats keeps the rim jumbotron's numbers live. Plain JavaScript, no dependencies, no build requirement, read-only network connections only. Payments are a simulator for now; visitor state stays in the visitor's own browser.

## Run it

Open `src/index.html` in a browser, or serve `src/` with any static server.

```sh
npm run serve   # build, then serve the built page at http://127.0.0.1:8080/
npm run watch   # the same, rebuilding on every change under src/
```

`/` is the built page as GitHub Pages serves it and `/src/` the unbundled sources; `PORT` picks another port and `HOST=0.0.0.0` opens the server to the network. Reload the tab after a rebuild.

## The island

The page lands on the hub. Fly with **W A S D**, **Q E** to turn, **Z**/**Space** up and **X** down; drag to orbit, scroll to zoom. On a phone the left stick moves and the right stick looks. Double-tap an Ooga to walk in their boots: **Space** (or **JUMP!**) jumps, twice for a double jump, and uses the control, bench or launcher beside you. **Escape** lets go.

The island keeps your local time from dawn to midnight. Roster labels show yellow for clank (a contribution within the hour), orange for chill (24 hours) and gray for sleep; commits, pull requests, reviews, merges and comments across every OogaBoogaX repository count, and a fresh contribution wakes its sleeper. Working Oogas load banana ammunition at the pile, run to their project's cave and shoot into it. Tap the jumbotron's screen for a close-up you can page through.

The 11 o'clock cave is **EntropyLab**, the 9 o'clock cave **Ooga Rally**, the plane on the rally roof **Ooga Drop**, and the rope bridge off the south rim leads to **Ooga Orbit**. A vine bridge at 4 o'clock reaches the **Mempool island**, whose cave reads the chain out in stone. Every game opens on a title card; **Enter** or its button starts it, **Escape** or **Leave** brings you back.

Two ramps inside HQ lead to a basement of beds: **Space** lies down, **WAKE UP!** gets up. Walk off the edge and you fall through an open window into HQ, or into the abyss and back to the pile; land on the clouds to walk their tops. A jetpack spins above a cloud beyond the island: jump into it to collect it, **J** puts it on, hold **Space** to climb. 2140data has thrusters in his feet, and his plating runs green while the coin is up on the day and red while it is down.

**Weapons.** **G** switches, **1** is the club, **2** the rifle. Right-click enters the shooting view. **Left mouse** fires or swings: a tap pokes, a press swings, a hold charges to double damage. **R** swaps magazines, **Space** beside the pile reloads. Boxes, barrels and rocks break and drop pickups. The OBL mirror cracks, breaks panel by panel and heals when left alone.

## Ooga Rally

**W** accelerates, **S** brakes, **A D** steer, a held **Space** drifts (orange, blue, then purple the longer you hold; release for the boost), **E** throws the item (brake while throwing a rock to send it backward, or while dropping a peel to lay it ahead), **Q** looks back, **Escape** pauses. Hold **W** through the last count for a rocket start; hold it earlier and the wheels spin. Every lap reads against your record lap. Trackside rocks and trees stop a kart.

Pick an Ooga, a ride and one of three tracks, then race three laps. On foot boosts hardest and recovers fastest from a spin, a Dino charges its drift quickest, a Rock Kart is simply fastest. Bananas fill a turbo meter, crates hand out items, snowballs roll across the peak's ice, and some races load in the rain. A podium offers the next track, **Cup** races all three, and a gold Cup opens **Mirror**.

## Ooga Drop

Pick an Ooga and **Fly!**. The plane climbs in a circle (hold **Space** to hurry), counts 3, 2, 1 and calls JUMP; **Space** throws you out high above the first hoop. In freefall **W S** pitch, **A D** roll, **Q E** turn: belly down is slow, head down is fast, a tilt tracks you sideways. A marker on the next hoop shows where you are heading; through the middle is a bullseye, all eight a clean sweep. **Space** pulls the chute, **W** dives, **S** flares, **A D** bank. Any landing under the canopy is good and the pile is best; a soft touchdown and a low pull pay extra. Every jump lays its own course.

## Ooga Orbit

Build a rocket, engine at the bottom and pod on top: tap or drag parts onto it. **Launch!** counts down and **Space** in the green lets go of the clamps. On the way up **W S** push while the autopilot flies the arc; **A D** steer, **G** flies by hand. Push or lean too hard in thick air and it tears apart. **Space** drops a dry stage; drop one still burning and its fuel goes down with it.

At the Sky Top, 500 up, the sky hook holds you over the island. **Space** drops the rest, then **V** climbs out on a tether with forty seconds of air to measure the space rock, somewhere new each launch. **Space** again drops home: shield first survives, nose first burns, **Space** pulls the chute at the call and **A D** steer it to the pad. A cheaper rocket that still makes it scores thrift, a quick climb scores pace, a hand-flown climb scores too, and a fireball never medals.

## Ooga Mine

Not open yet: its cave stays sealed, but `?wip=mine` opens it for anyone.

A Bitcoin mining tycoon, and the lesson is margin: every machine earns hash and burns power, and the profit bar says whether the operation is making money. Drag gear from the shop onto a lit spot or tap to place it. Crack the banana rock (**C**), take a loan, put up a Rack and drag a Thunder Box into it. Newer models launch through the hour, each doing more hash for the same power; when the pads run out, dig into the Rack Hall and the Big Cave.

The network climbs every few minutes (buy just after a retarget for the whole epoch at the old difficulty), and at 30:00 the reward halves. Power comes off the grid at a moving price: lock it with a contract, build your own, keep a battery for outages. Each chamber has its own circuit and cooling: overload trips a breaker, heat slows machines and starts fires. Fires eat along a rack and jump to the next; take a Fire Stopper off the wall (**Space** beside it) and carry it over, or beat it out by hand for five seconds. A box about to melt down glows red for ten seconds: pull it in time and it only dies.

You are the Ooga you walked in as: **W A S D** walk, the mouse or **Q E** turn, **Space** (**WORK** on a phone) works on whatever is beside you, **V** looks round the cave. Tap a job in the list to look at it. Mine 21 coin before the hour is out; the faster, the better the medal, and the hour plays on with the score still counting. **Shift+S** sells coin, **P** pauses, the run saves as you go, and the cave waits while you are away.

## The Agent

Double-click the Agent to play it; double-click again or press **Escape** to let it go. **W A S D** walk, **Shift** gallops, **Space** jumps, **H** switches gaits, **C** beats its chest. Three quick clicks show its code.

## Weather

The weather is the mempool and it stands over the Mempool island. **Soak** (the backlog paying at least 1 sat/vB, averaged over ten minutes) sets how hard it rains in six steps: dry, drizzle, light rain, rain, heavy rain, downpour. **Gale** (how many vbytes a second arrive) sets the wind. Every block strikes lightning and rolls thunder, and a downpour throws extra. The sky stays as the clock paints it until the rain is falling hard.

## Debug

`?scene=lab`, `race`, `drop`, `orbit` or `mine` opens that scene; `?nosim=1` silences the simulator and every feed, `?mempool=0` the socket alone, `?chain=0` the REST polling and the price socket, `?oogatron=0` the stats poll; `?canvas2d=1` forces the Canvas 2D fallback; `?debug=1` exposes `window.__ooga`. **B** adds test bananas, **L** a legendary tip, **P** fills the pile, **Shift+R** resets. The Konami code opens the live feed panel. AGENTS.md lists every flag and fixture.

## Test

```sh
npm test
```

A headless Chrome suite over the DevTools protocol, a clean console required. Needs Node 22 or newer and Chrome (`CHROME` points at the binary off macOS). `npm test` is the fast lane; `npm run test:full` the full gate.

## Build and deploy

```sh
npm run build
```

Writes `oogaboogaland.html`, one self-contained page with the content policy pinned to its hashes. It is gitignored: pull requests carry sources, CI commits the page back after each merge to `rock`, and GitHub Pages serves it as `index.html` at https://oogaboogax.github.io/oogaboogaland/. Nothing under `src/` goes to a server.

To add your Ooga, add one file to `src/characters/` named after your GitHub handle; click **2140data** on the island for a prompt that describes the whole job. `npm run characters` lists everyone.

## Privacy

No analytics and no personal data. Read-only requests, nothing about the visitor sent: the mempool.space websocket and REST API (falling back to blockstream.info's Esplora), Coinbase Exchange's websocket feed for the live price and the day's open (falling back to Coinbase Exchange, Kraken, Coinbase spot and mempool.space over REST), and the oogatron stats worker. The roster lists public contributor handles only; the donation handle and message stay in localStorage.

## License

Public domain under [The Ooga Booga License](LICENSE), a caveman-speak dedication with the meaning of The Unlicense.

## Contributing

Read [AGENTS.md](AGENTS.md) first: the module layout, the engine patterns, how to add things, and the checks every change must pass.
