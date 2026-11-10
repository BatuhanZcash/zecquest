import type { LevelDef } from "./sim";

/**
 * Level maps. Legend:
 *   #  solid block        =  one-way platform     ~  crumbling platform
 *   D  viewing-key gate (vertical run = one gate; gate n opens with key n, left to right)
 *   o  ZEC-symbol coin    w  tracker (stompable)  d  scanner drone
 *   S  shield pickup      i  info crystal (fact)  k  viewing key
 *   F  phishing fake key  C  checkpoint           P  start
 *   G  Shielded Gate (finish; place on the row above the floor)
 *   M  horizontally moving platform (run = width)   V  vertically moving platform
 */
class Grid {
  g: string[][];
  constructor(public cols: number, public rows: number) {
    this.g = Array.from({ length: rows }, () => Array(cols).fill("."));
  }
  set(x: number, y: number, c: string) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) this.g[y][x] = c;
    return this;
  }
  run(x: number, y: number, w: number, c: string) {
    for (let i = 0; i < w; i++) this.set(x + i, y, c);
    return this;
  }
  fill(x0: number, y0: number, x1: number, y1: number, c: string) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
    return this;
  }
  each(list: [number, number][], c: string) {
    for (const [x, y] of list) this.set(x, y, c);
    return this;
  }
  rowsOut() {
    return this.g.map((r) => r.join(""));
  }
}

/* ---------------------------------------------------------------------
   Level 1 — Transparent City. Mechanic: the shield (shielded mode).
   --------------------------------------------------------------------- */
function level1(): string[] {
  const m = new Grid(150, 17);
  const ground = (a: number, b: number) => m.fill(a, 15, b, 16, "#");
  ground(0, 22); ground(26, 47); ground(51, 70); ground(75, 96); ground(100, 118); ground(122, 149);
  const plat = (x: number, y: number, w: number) => m.run(x, y, w, "=");
  plat(9, 11, 4); plat(16, 9, 3); plat(30, 11, 5); plat(38, 8, 4); plat(44, 11, 3);
  plat(55, 11, 4); plat(61, 8, 3); plat(79, 11, 4); plat(85, 9, 4); plat(91, 7, 3);
  plat(104, 11, 3); plat(109, 9, 3); plat(114, 11, 2); plat(126, 11, 4); plat(133, 9, 4);
  const col = (x: number, h: number) => m.fill(x, 15 - h, x, 14, "#");
  col(34, 2); col(66, 3); col(97, 1); col(119, 1);
  m.fill(148, 0, 149, 14, "#");
  m.each([[10, 10], [11, 10], [12, 10], [17, 8], [18, 8], [24, 12], [25, 11], [31, 10], [32, 10], [33, 10], [39, 7], [40, 7], [45, 10],
    [49, 12], [50, 11], [56, 10], [57, 10], [62, 7], [63, 7], [72, 12], [73, 11], [74, 12], [80, 10], [81, 10], [86, 8], [87, 8], [92, 6],
    [98, 12], [99, 11], [105, 10], [110, 8], [111, 8], [120, 12], [121, 11], [127, 10], [128, 10], [134, 8], [135, 8], [136, 8]], "o");
  m.each([[20, 14], [36, 14], [42, 14], [58, 14], [68, 14], [83, 14], [93, 14], [107, 14], [116, 14], [130, 14], [140, 14]], "w");
  m.each([[46, 6], [81, 5], [111, 5], [137, 5]], "d");
  m.each([[40, 6], [92, 5]], "S");
  m.each([[14, 14], [53, 14], [88, 7], [124, 14]], "i");
  m.each([[56, 14], [102, 14]], "C");
  m.set(2, 14, "P");
  m.set(143, 14, "G");
  return m.rowsOut();
}

/* ---------------------------------------------------------------------
   Level 2 — Sapling Forest. Mechanic: viewing-key gates. Each gate opens
   only for its own key; showing the key to the gate does not reveal you
   to the drones (your shield stays on).
   --------------------------------------------------------------------- */
function level2(): string[] {
  const m = new Grid(184, 17);
  const ground = (a: number, b: number, top = 15) => m.fill(a, top, b, 16, "#");
  const plat = (x: number, y: number, w: number) => m.run(x, y, w, "=");
  // trunk walls with a gate at the bottom: solid canopy above, gate rows 9..14
  const gateWall = (x: number) => { m.fill(x, 0, x, 8, "#"); m.fill(x, 9, x, 14, "D"); };

  // A: meadow, first key on a branch
  ground(0, 30); ground(34, 44);
  plat(8, 11, 3); plat(13, 8, 4); plat(19, 11, 3);
  m.set(15, 7, "k");
  m.each([[9, 10], [10, 10], [14, 7], [16, 7], [20, 10], [24, 13], [25, 12], [26, 13], [32, 11], [33, 11]], "o");
  m.each([[22, 14], [28, 14]], "w");
  m.set(5, 14, "i");
  gateWall(42);
  m.set(2, 14, "P");

  // B: drone grove — the key sits under the beams; a shield makes it safe
  ground(43, 74); ground(78, 92);
  m.set(46, 14, "C");
  m.set(48, 14, "S");
  plat(52, 11, 4); plat(58, 9, 4); plat(64, 11, 4);
  m.each([[55, 5], [66, 5]], "d");
  m.set(60, 8, "k");
  m.each([[53, 10], [54, 10], [59, 8], [61, 8], [65, 10], [66, 10], [70, 13], [71, 13], [76, 11], [77, 11]], "o");
  m.each([[69, 14], [84, 14]], "w");
  m.set(73, 14, "i");
  m.fill(74, 13, 74, 14, "#");
  gateWall(90);

  // C: canopy climb — the key is high in the trees
  ground(91, 106); ground(110, 120); ground(124, 140);
  m.set(93, 14, "C");
  plat(96, 12, 3); plat(100, 9, 3); plat(104, 6, 4); plat(110, 6, 3); plat(115, 9, 3);
  m.set(112, 5, "k");
  m.set(98, 14, "S");
  m.each([[103, 5]], "d");
  m.each([[97, 11], [101, 8], [105, 5], [106, 5], [111, 5], [116, 8], [108, 12], [109, 11], [122, 12], [123, 11]], "o");
  m.each([[102, 14], [114, 14], [118, 14], [130, 14]], "w");
  m.set(126, 14, "i");
  plat(127, 11, 3);
  m.each([[128, 10], [133, 13], [134, 13]], "o");
  gateWall(138);

  // D: final stretch to the Shielded Gate
  ground(139, 155); ground(159, 183);
  m.set(141, 14, "C");
  m.set(144, 14, "S");
  plat(148, 11, 3); plat(153, 9, 3); plat(160, 11, 4); plat(166, 9, 3);
  m.each([[150, 5], [165, 5]], "d");
  m.each([[149, 10], [150, 10], [154, 8], [156, 12], [157, 11], [158, 12], [161, 10], [162, 10], [167, 8], [168, 8]], "o");
  m.each([[146, 14], [163, 14], [172, 14]], "w");
  m.set(170, 14, "i");
  m.fill(182, 0, 183, 14, "#");
  m.set(177, 14, "G");
  return m.rowsOut();
}

/* ---------------------------------------------------------------------
   Level 3 — Node Tower. Vertical climb with moving and crumbling
   platforms. Fake "free key" pickups are phishing: never take them.
   --------------------------------------------------------------------- */
function level3(): string[] {
  const W = 26, H = 104;
  const m = new Grid(W, H);
  const y = (n: number) => H - 1 - n; // n = tiles above the floor surface (n=0 is the floor row itself)
  m.fill(0, 0, 0, H - 1, "#");
  m.fill(W - 1, 0, W - 1, H - 1, "#");
  m.fill(0, H - 1, W - 1, H - 1, "#");
  const plat = (x: number, n: number, w: number, c = "=") => m.run(x, y(n), w, c);

  m.set(3, y(1), "P");
  m.set(7, y(1), "i");
  m.set(16, y(1), "w");
  // 0–20: warm-up
  plat(2, 4, 6); plat(18, 4, 6);
  m.each([[3, y(5)], [4, y(5)], [19, y(5)], [20, y(5)]], "o");
  plat(9, 8, 8);
  m.each([[11, y(9)], [12, y(9)], [13, y(9)]], "o");
  plat(2, 12, 5); plat(19, 12, 5);
  m.set(21, y(13), "F"); // bait: fake key next to a coin
  m.set(3, y(13), "o");
  plat(10, 16, 3, "M");
  plat(2, 20, 6, "~"); plat(18, 20, 6);
  m.each([[4, y(21)], [5, y(21)], [20, y(21)]], "o");

  // 24: first checkpoint floor
  plat(1, 24, 24);
  m.set(12, y(25), "C");
  m.set(22, y(25), "S");
  m.set(6, y(25), "w");
  m.set(12, y(31), "d");
  plat(3, 28, 5); plat(18, 28, 5);
  m.each([[4, y(29)], [5, y(29)], [19, y(29)], [20, y(29)]], "o");
  plat(10, 32, 6);
  m.set(12, y(33), "i");
  plat(2, 36, 3, "V");
  plat(18, 36, 5);
  m.set(21, y(37), "F");
  m.set(19, y(37), "o");

  // 40: second checkpoint floor
  plat(1, 40, 24);
  m.set(4, y(41), "C");
  m.each([[10, y(41)], [18, y(41)]], "w");
  plat(6, 44, 4, "~"); plat(16, 44, 4, "~");
  m.each([[7, y(45)], [8, y(45)], [17, y(45)], [18, y(45)]], "o");
  plat(10, 48, 4, "M");
  plat(2, 52, 5); plat(19, 52, 5);
  m.set(3, y(53), "i");
  m.set(22, y(53), "F");
  m.set(12, y(58), "d");
  plat(9, 55, 8);
  m.set(10, y(56), "S");
  m.each([[12, y(56)], [13, y(56)], [14, y(56)]], "o");

  // 59: third checkpoint floor
  plat(1, 59, 24);
  m.set(20, y(60), "C");
  m.set(8, y(60), "w");
  plat(3, 63, 4, "V");
  plat(12, 66, 4, "~");
  m.each([[13, y(67)], [14, y(67)]], "o");
  plat(19, 70, 5);
  m.set(21, y(71), "F");
  m.set(20, y(71), "o");
  plat(10, 73, 4, "M");
  plat(2, 77, 5);
  m.set(4, y(78), "i");
  plat(1, 81, 24);
  m.set(12, y(82), "C");
  m.set(16, y(82), "w");
  m.set(6, y(87), "d");
  m.set(18, y(87), "d");
  m.set(22, y(82), "S");
  plat(4, 85, 4, "~"); plat(17, 85, 4, "~");
  m.each([[5, y(86)], [18, y(86)]], "o");
  plat(10, 89, 6);
  m.each([[11, y(90)], [14, y(90)]], "o");
  m.set(3, y(93), "F");
  plat(2, 92, 4);
  plat(19, 93, 5);
  // summit
  plat(6, 96, 14, "#");
  m.each([[8, y(97)], [9, y(97)], [16, y(97)], [17, y(97)]], "o");
  m.set(12, y(97), "G");
  return m.rowsOut();
}

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    theme: "city",
    map: level1(),
    par: 75,
    facts: ["games_fact_transparent", "games_fact_shielded", "games_fact_viewing", "games_fact_ua"],
    droneRange: [6, 9, 7, 8],
  },
  {
    id: 2,
    theme: "forest",
    map: level2(),
    par: 110,
    facts: ["games_fact_viewing", "games_fact_viewing_readonly", "games_fact_selective", "games_fact_shielded"],
    droneRange: [4, 4, 4, 5, 5],
  },
  {
    id: 3,
    theme: "tower",
    map: level3(),
    par: 120,
    facts: ["games_fact_seed", "games_fact_phishing", "games_fact_seed_offline", "games_fact_ua", "games_fact_transparent"],
    droneRange: [4, 9, 9, 4],
  },
];

export const LEVEL_COUNT = LEVELS.length;
