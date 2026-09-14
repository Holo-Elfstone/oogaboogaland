// SHA-256 hashes of the complete 32x32 RGB images from Blockchain Commons'
// bc-lifehash C++ reference, revision 0444dbe, Version::version2, module_size=1.
// These fixed vectors cover UTF-8, all four palettes, both symmetries and SHA-256
// padding boundaries; the browser's independent SHA-256 hashes the actual images.
export const lifehashProbe = async () => {
  const vectors = [
    ["", "ca68773e52a9f34f57dab7b5c32e2ef5bee5622c5afb04e2d5c07c7f77d27ae5"],
    ["Hello", "a58bb5ca1f675a286f562e951d6c6d0436ec6d0375dd8b7975944e80932de584"],
    ["LifeHash", "3dba998f97a989e204fe26d63165be340032ef4e168b3e0dbca8900b0d3627b2"],
    ["0", "8720911ff37e66101c206c275bda128fb9ef2464db16c38bc7aeb4ecc8937b5a"],
    ["🐺", "f5076a19df9166337f0d9648f07952eda8eed875d691b5c7d19bcbd6149f9bc2"],
    ["room:1,-6,3:sheet", "35f6863e6c8776bc7c8b4983a52e04476844b965d18d4bc2df89940966209242"],
    ["room:1,-6,3:pillow", "6e5dd786707721579bfaccb784118eb453831d23c88b5a34692f3b40ac5cb5f7"],
    ["room:1,-7,3:sheet", "4cc26d33761d419a3a25c4c1eb5380039883d9299bb0bafd783f1549d596e354"],
    ["room:2,-6,3:sheet", "67f7c9972f855c9589591f8a27499a44b3fe694aa84ac2493ac663621ac02701"],
    ["room:1,-6,4:sheet", "646afe514d675a1c7b857f07fba4746e5206fcccfa1bad303e0f9a45ad1fd1a3"],
    ["a".repeat(55), "2739a2d2d7ccc7ae7cf8fd59828baffb3cd268193104c2c0f210a2e0bc4f876f"],
    ["a".repeat(56), "fe4ff5e1548813a9a44617340a4af9b11a137229b46cea07e934a28985f91594"],
    ["a".repeat(64), "cc660d127aecbe9157c51fdbbb4b3ec92a3f108702a3d54a3dd22288be0e4ed2"],
    ["a".repeat(200), "aba63df599e1038bf9ee2397034d342c2b53d7d5287bd10c03e4ad6cf4861be7"]
  ];
  const failures = [], signatures = new Set();
  let referenceMatches = 0, shapeMatches = 0, repeatMatches = 0, constructionMs = 0;
  for (const [seed, expected] of vectors) {
    const start = performance.now(), image = window.BL.lifehash.make(seed);
    constructionMs += performance.now() - start;
    if (image.width === 32 && image.height === 32 && image.colors instanceof Uint8Array && image.colors.length === 3072) shapeMatches++;
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", image.colors));
    const actual = Array.from(digest, (v) => v.toString(16).padStart(2, "0")).join("");
    if (actual === expected) referenceMatches++; else failures.push({ seed, expected, actual });
    signatures.add(actual);
    const repeated = window.BL.lifehash.make(seed);
    if (repeated.colors !== image.colors && repeated.colors.every((v, i) => v === image.colors[i])) repeatMatches++;
  }
  return { vectors: vectors.length, referenceMatches, shapeMatches, repeatMatches, unique: signatures.size, constructionMs, failures };
};
