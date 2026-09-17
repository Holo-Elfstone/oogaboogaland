// The rim jumbotron: baked EntropyLab stats on a native voxel board.
// Placement, data parsing, view switching, the poke-an-Ooga hook, and the
// screen's quad meshing all hold in both renderers.
export const jumbotronProbe = async () => {
  const B = window.__ooga, BL = window.BL;
  const frames = (n) => new Promise((resolve) => {
    const step = () => (--n <= 0 ? resolve() : requestAnimationFrame(step));
    requestAnimationFrame(step);
  });
  const j = B.jumbotron;
  if (!j) return { exists: false };
  const screen = j.node.children[0];
  const facesOf = (node) => node && node.geometry ? node.geometry.faces.length : 0;
  const fingerprint = (node) => {
    if (!node || !node.geometry) return 0;
    let h = 0;
    const faces = node.geometry.faces;
    for (let i = 0; i < faces.length; i += 7) {
      const c = faces[i].color;
      h = (h * 31 + c[0] * 3 + c[1] * 5 + c[2] * 7 + faces[i].i[0]) % 1e9;
    }
    return h;
  };
  const p = j.node.position;
  const placement = {
    x: p.x, y: +p.y.toFixed(2), z: p.z,
    onNorthRim: p.z < -20 && Math.hypot(p.x, p.z) > 22,
    aboveGround: p.y > B.island.surfaceAt(p.x, p.z),
    facesCenter: Math.abs(j.node.rotation.y - Math.atan2(-p.x, -p.z)) < 1e-6,
    scale: j.node.scale.x,
    solid: !B.headquarters.solids.props.clearAt(p.x, p.y, p.z, 0.1, 0.1)
  };
  const data = (() => {
    try {
      const parsed = BL.jumbotron.parseStats(BL.jumbotronData);
      const privateFields = ["display_name", "avatar_url", "first_seen_at", "last_seen_at"];
      const noPersonalMetadata = BL.jumbotronData.contributors.every((c) => privateFields.every((key) => !(key in c)))
        && parsed.contributors.every((c) => privateFields.every((key) => !(key in c)));
      const anonymous = BL.jumbotron.parseStats({ ...BL.jumbotronData,
        contributors: [{ ...BL.jumbotronData.contributors.find((c) => c.login.startsWith("email:")), display_name: "private-profile-label" }]
      });
      const anonymousLabel = anonymous.tickerText.includes("ANONYMOUS:")
        && !anonymous.tickerText.includes("PRIVATE-PROFILE-LABEL") && !anonymous.tickerText.includes("EMAIL:");
      return { contributors: parsed.contributors.length, schemaGuard: false, noPersonalMetadata, anonymousLabel };
    } catch {
      return { contributors: 0, schemaGuard: false };
    }
  })();
  try {
    BL.jumbotron.parseStats({ meta: { schema_version: 99 } });
  } catch {
    data.schemaGuard = true;
  }
  const initial = { view: j.view.name, cabinetFaces: facesOf(j.node), screenFaces: facesOf(screen), print: fingerprint(screen) };
  j.setView("leaderboard", { type: "commits" });
  await frames(3);
  const leaderboard = { view: j.view.name, screenFaces: facesOf(screen), changed: fingerprint(screen) !== initial.print };
  const pokeKnown = j.showContributor("portlandhodl");
  await frames(3);
  const poked = { accepted: pokeKnown, view: j.view.name, login: j.view.params && j.view.params.login };
  const pokeAlias = j.showContributor("bc1gui"); // public roster alias -> stats login
  await frames(3);
  const alias = { accepted: pokeAlias, login: j.view.params && j.view.params.login,
    caseInsensitive: j.showContributor("BC1GUI") && j.view.params.login === "ottoz0r" };
  const pokeUnknown = j.showContributor("no-such-ooga");
  const before = facesOf(screen);
  j.nextView();
  await frames(3);
  const advanced = { view: j.view.name, screenFaces: facesOf(screen), drew: facesOf(screen) > 50 && before > 50 };
  return { exists: true, placement, data, initial, leaderboard, poked, alias, pokeUnknown, advanced };
};
