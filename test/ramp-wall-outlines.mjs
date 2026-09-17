export const apertureOutlineProbe = () => {
  const BL = window.BL, canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  Object.defineProperties(canvas, { clientWidth: { value: 640 }, clientHeight: { value: 360 } });
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), cover = BL.cameraCover.create(canvas), camera = BL.scene.createCamera({ near: 0.1 });
  const windows = [{ sill: -0.6, height: 1.2, flare: { frusta: [{ angle: 0, start: 2, half: 0.6, inner: false }] } }];
  const aperture = BL.wallApertures.create({ windows, island: { geometry: { verts: [], faces: [] } } });
  const surface = { surface: new Float32Array([-4,-3,0, -4,3,0, 4,3,0, -4,-3,0, 4,3,0, 4,-3,0]), surfaceCount: 2, surfaceGroups: new Uint16Array([0,0]), surfaceWholePhases: new Float32Array([1]), surfacePhases: new Float32Array([1]), surfaceHidden: new Uint8Array([1]), surfaceAperture: new Uint8Array([1]), surfaceWholeActive: 1, surfaceActive: 1, apertures: aperture };
  const guides = { structures: [surface], objectsEnabled: true, count: 0, providerCount: 0, lines: new Float32Array(0) }, rows = [], view = BL.math.mat4.create();
  camera.fov = Math.PI / 2;
  for (const distance of [5, 7, 9]) for (const x of [-1.5, -0.5, 0.5, 1.5]) {
    Object.assign(camera.position, { x, y: 0.35, z: -distance }); Object.assign(camera.target, { x: 0, y: 0, z: 0 });
    aperture.update(camera, true); ctx.clearRect(0,0,640,360); cover.draw(camera,null,false,false,()=>false,()=>null,guides);
    const pixels = ctx.getImageData(0,0,640,360).data;
    BL.math.mat4.lookAt(view,camera.position,camera.target,{x:0,y:1,z:0});
    let windowSamples=0, wallSamples=0, leaked=0, dropped=0;
    for(let py=30;py<330;py+=2)for(let px=40;px<600;px+=2){
      const vx=(px+0.5-320)/180,vy=(180-py-0.5)/180;
      const dx=view[0]*vx+view[1]*vy-view[2],dy=view[4]*vx+view[5]*vy-view[6],dz=view[8]*vx+view[9]*vy-view[10];
      const t=-camera.position.z/dz,wx=camera.position.x+dx*t,wy=camera.position.y+dy*t;
      if(Math.abs(wx)>3.8||Math.abs(wy)>2.8)continue;
      const gate=(-2-camera.position.z)/dz,gx=camera.position.x+dx*gate,gy=camera.position.y+dy*gate,alpha=pixels[(py*640+px)*4+3];
      if(Math.abs(gx)<0.5&&Math.abs(gy)<0.5){windowSamples++;if(alpha>1)leaked++;}
      if(Math.abs(gx)>0.7||Math.abs(gy)>0.7){wallSamples++;if(alpha<20)dropped++;}
    }
    rows.push({distance,x,windowSamples,wallSamples,leaked,dropped});
  }
  surface.apertures=BL.wallApertures.create({windows,island:{geometry:{verts:[-3,-3,-3,3,-3,-3,3,3,-3,-3,3,-3],faces:[{i:[0,1,2,3]}]}}});
  surface.apertures.update(camera,true);ctx.clearRect(0,0,640,360);cover.draw(camera,null,false,false,()=>false,()=>null,guides);
  const blocked=ctx.getImageData(320,180,1,1).data[3];
  guides.objectsEnabled=false;ctx.clearRect(0,0,640,360);cover.draw(camera,null,false,false,()=>false,()=>null,guides);
  const disabled=ctx.getImageData(0,0,640,360).data.every((v,n)=>n%4!==3||v===0);
  cover.dispose();return {rows,blocked,disabled};
};

export const rampWallFloorProbe = () => {
  const BL=window.BL,island=window.__ooga.island,H=island.headquarters,guides=BL.rockGuides.create({island}),rows=[];
  const floors = island.geometry.faces.filter((f) => f.headquartersRamp || f.headquartersBasementRamp), source = island.geometry.verts;
  const floorAt = (basement, x, z) => {
    for (const face of floors) {
      if (!!face.headquartersBasementRamp !== basement) continue;
      const a = face.i[0] * 3, b = face.i[1] * 3, c = face.i[2] * 3;
      const ax = source[a], az = source[a + 2], bx = source[b] - ax, bz = source[b + 2] - az, cx = source[c] - ax, cz = source[c + 2] - az, det = bx * cz - bz * cx;
      if (Math.abs(det) < 1e-12) continue;
      const u = ((x - ax) * cz - (z - az) * cx) / det, v = (bx * (z - az) - bz * (x - ax)) / det;
      if (u >= -1e-5 && v >= -1e-5 && u + v <= 1 + 1e-5) return source[a + 1] + u * (source[b + 1] - source[a + 1]) + v * (source[c + 1] - source[a + 1]);
    }
    return null;
  };
  for(const c of guides.contexts)if(c.kind==='ramp'){
    const edges=new Map(),lowest=new Map(),v=c.surface,key=(x,y,z)=>[x,y,z].map(n=>Math.round(n*1e5)).join(',');
    for(let at=0;at<v.length;at+=3){const k=key(v[at],0,v[at+2]);lowest.set(k,Math.min(lowest.get(k)??Infinity,v[at+1]));}
    for(let at=0;at<v.length;at+=9)for(let n=0;n<3;n++){const i=at+n*3,j=at+(n+1)%3*3,a=key(v[i],v[i+1],v[i+2]),b=key(v[j],v[j+1],v[j+2]),k=a<b?a+':'+b:b+':'+a,e=edges.get(k);if(e)e.count++;else edges.set(k,{count:1,a:[v[i],v[i+1],v[i+2]],b:[v[j],v[j+1],v[j+2]]});}
    let floorEdges=0,slopingEdges=0,maxFloorError=0;const samples=[];
    for(const edge of edges.values())if(edge.count===1){
      const a=edge.a,b=edge.b,fa=floorAt(c.basement,a[0],a[2]),fb=floorAt(c.basement,b[0],b[2]);
      if(a[1]>lowest.get(key(a[0],0,a[2]))+1e-5||b[1]>lowest.get(key(b[0],0,b[2]))+1e-5)continue;
      if(fa===null||fb===null||Math.hypot(a[0]-b[0],a[2]-b[2])<0.01||Math.abs(a[1]-fa)>0.08||Math.abs(b[1]-fb)>0.08)continue;
      floorEdges++;if(Math.abs(a[1]-b[1])>0.001)slopingEdges++;
      for(const p of [a,b]){const error=Math.abs(p[1]-floorAt(c.basement,p[0],p[2]));maxFloorError=Math.max(maxFloorError,error);if(error>0.00002&&samples.length<4)samples.push({p,error});}
    }
    rows.push({basement:c.basement,index:c.index,floorEdges,slopingEdges,maxFloorError,samples});
  }
  guides.dispose();return {rows};
};
