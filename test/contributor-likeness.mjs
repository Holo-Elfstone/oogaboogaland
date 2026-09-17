// Default hand props must survive the same wardrobe refresh used on scene entry.
export const yellowLikenessProbe = () => {
  const B = window.__ooga, BL = window.BL, cave = B.cavemen.get("YellowBrokeIt");
  const color = (geometry, rgb) => geometry.faces.some((face) => face.color.join(",") === rgb);
  const before = cave.parts.club.geometry;
  B.applyAllSwag();
  const refreshed = cave.parts.club.geometry === before && before === cave.skins.club.default;
  const item = BL.models.SWAG.find((entry) => entry.id === "golden-club");
  const entry = B.game.addItem({ item, tier: item.tier, donationId: "yellow-likeness" });
  B.game.assign(entry.id, cave.traits.name); B.applyAllSwag();
  const gold = cave.parts.club.geometry === cave.skins.club.gold && color(cave.parts.club.geometry, "224,181,58");
  B.game.unassign(cave.traits.name); B.applyAllSwag();
  return { roster: BL.contributors.roster.length, crew: B.cavemen.size, state: cave.state,
    traits: ["bald", "cleanShaven", "wideEyes", "yellowFace", "cigarette", "energyCan", "orangeChest"].every((key) => cave.traits[key]),
    yellow: color(cave.headOpen, "255,227,106"), orange: color(cave.parts.torso.geometry, "232,148,35"),
    cigarette: cave.parts.armR.children.some((node) => node.geometry && node.geometry.faces.some((face) => face.emissive === 0.7)),
    can: color(before, "36,88,166") && color(before, "201,204,210"), upright: cave.parts.club.rotation.x === 0,
    refreshed, gold, sameShape: before.verts.every((v, i) => v === cave.skins.club.gold.verts[i]) && before.verts.length === cave.skins.club.gold.verts.length,
    restored: cave.parts.club.geometry === before };
};
