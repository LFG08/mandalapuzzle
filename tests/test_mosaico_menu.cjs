const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
const section=html.split('<h2 class="menu-section-title">quebra-cabeça</h2>')[1].split('</section>')[0];
const card=section.match(/<a[^>]*id="mosaicoCard"[\s\S]*?<\/a>/)?.[0];
assert(card);assert(card.includes('href="/mosaico/"'));assert(card.includes('data-key="mosaicoJigsawProgress"'));assert(card.includes('data-total="190"'));
for(const tag of ['#mosaico','#quebra-cabeça','#jigsaw'])assert(card.includes(tag));
assert(card.includes('mosaico/background.png'));assert(fs.existsSync('mosaico/background.png'));
const start=html.indexOf('function getStoredProgressCount(key){');
const end=html.indexOf('\nfunction ',start+1);
const storage=new Map();const ctx={localStorage:{getItem:k=>storage.get(k)||null}};vm.createContext(ctx);vm.runInContext(html.slice(start,end),ctx);
assert.equal(ctx.getStoredProgressCount('mosaicoJigsawProgress'),0);
const save={pieces:[{id:1,slot:1},{id:2,slot:null},{id:3,slot:3},{id:4,slot:3},{id:5,slot:999},{id:6,slot:0}]};
storage.set('mosaicoJigsawProgress',JSON.stringify(save));assert.equal(ctx.getStoredProgressCount('mosaicoJigsawProgress'),2);
storage.delete('mosaicoJigsawProgress');storage.set('vermelhoJigsawProgress',JSON.stringify(save));assert.equal(ctx.getStoredProgressCount('mosaicoJigsawProgress'),2);
storage.set('other',JSON.stringify({pieces:[{placed:true},{placed:false}]}));assert.equal(ctx.getStoredProgressCount('other'),1);
console.log('Mosaico menu section, route, thumbnail, tags, saved-placement count, legacy progress and existing counter behavior pass.');

const manifest=JSON.parse(fs.readFileSync('mosaico/pieces.json','utf8'));
let canvases=[],imageLoads=[],fetches=0;
const thumbCtx={
 localStorage:ctx.localStorage,
 getStoredObjectFromKeys:keys=>{for(const key of keys){try{const value=JSON.parse(storage.get(key)||'null');if(value&&typeof value==='object')return value}catch{}}return null},
 loadMenuImage:async src=>{
  imageLoads.push(src);
  if(src==='mosaico/background.png')return {src,width:1280,height:1280};
  const p=manifest.pieces.find(p=>src===`mosaico/peças/${p.file}`);assert(p,`Unexpected preview image ${src}`);
  return {src,width:p.width,height:p.height};
 },
 fetch:async(url,options)=>{fetches++;assert.equal(url,'mosaico/pieces.json');assert.equal(options.cache,'no-store');return {ok:true,json:async()=>manifest}},
 document:{createElement:type=>{
  assert.equal(type,'canvas');const canvas={width:0,height:0,ops:[]};
  const drawing={drawImage:(...args)=>canvas.ops.push(['drawImage',...args]),translate:(...args)=>canvas.ops.push(['translate',...args]),rotate:(...args)=>canvas.ops.push(['rotate',...args])};
  canvas.getContext=()=>drawing;canvas.toDataURL=()=>`data:image/png;mock,${canvases.indexOf(canvas)}`;canvases.push(canvas);return canvas;
 }}
};
vm.createContext(thumbCtx);
const thumbStart=html.indexOf('let mosaicoManifestPromise;'),thumbEnd=html.indexOf('function setYagaCardHref(',thumbStart);
vm.runInContext(html.slice(thumbStart,thumbEnd),thumbCtx);
(async()=>{
 storage.clear();
 let status=await thumbCtx.getMosaicoStatus(190);assert.equal(status.found,0);assert.equal(status.total,190);assert.equal(fetches,0);
 assert.deepEqual(imageLoads,['mosaico/background.png']);assert.equal(canvases.at(-1).width,512);assert.equal(canvases.at(-1).height,512);
 canvases=[];imageLoads=[];
 storage.set('mosaicoJigsawProgress',JSON.stringify({rotationStep:45,pieces:[
  {id:92,slot:96,rotation:1,z:8},{id:101,slot:101,rotation:1,z:3},
  {id:93,slot:93,rotation:0,z:5},{id:94,slot:null,rotation:0,z:9},
  {id:90,slot:96,rotation:5,z:10},{id:92,slot:92,rotation:0,z:11},{id:2,slot:999,rotation:0}
 ]}));
 status=await thumbCtx.getMosaicoStatus(190);assert.equal(status.found,2);assert.equal(fetches,1);
 assert.deepEqual(imageLoads,['mosaico/background.png','mosaico/peças/peca-093.png','mosaico/peças/peca-092.png']);
 const board=canvases[0],draws=board.ops.filter(op=>op[0]==='drawImage');assert.equal(draws.length,3);
 assert.equal(draws[1][1].ops.find(op=>op[0]==='drawImage')[1].src,'mosaico/peças/peca-093.png','Preserve saved stacking order');
 const turned=draws[2][1];assert.equal(turned.ops.find(op=>op[0]==='rotate')[1],Math.PI/4);
 assert.equal(turned.width,102);assert.equal(turned.height,102);
 const slot=manifest.pieces[95],offset=manifest.pieces[91].placementOffsets[1]['96'];
 assert.equal(draws[2][2],slot.x+offset.x);assert.equal(draws[2][3],slot.y+offset.y);
 // A Ctrl removal clears the saved slot, so the next preview must remove the artwork.
 storage.set('mosaicoJigsawProgress',JSON.stringify({rotationStep:45,pieces:[{id:92,slot:null,rotation:1}]}));
 imageLoads=[];status=await thumbCtx.getMosaicoStatus(190);assert.equal(status.found,0);assert.deepEqual(imageLoads,['mosaico/background.png']);
 storage.set('mosaicoJigsawProgress',JSON.stringify({rotationStep:45,pieces:manifest.pieces.map(p=>({id:p.id,slot:p.id,rotation:0,z:p.id}))}));
 status=await thumbCtx.getMosaicoStatus(190);assert.equal(status.found,190);assert.equal(fetches,1);
 storage.delete('mosaicoJigsawProgress');storage.set('vermelhoJigsawProgress',JSON.stringify({pieces:[{id:92,slot:97,rotation:1}]}));
 canvases=[];status=await thumbCtx.getMosaicoStatus(190);assert.equal(status.found,1);
 assert.equal(canvases[1].ops.find(op=>op[0]==='rotate')[1],Math.PI/2,'Legacy 90-degree rotations load correctly');
 assert(html.includes('window.addEventListener("pageshow",refreshMosaico)'));
 assert(html.includes('window.addEventListener("storage",event =>'));
 console.log('Progress thumbnail: empty/partial/full saves, rotated and interchangeable pieces, exact offsets, stacking, removal, invalid/duplicate placements, legacy saves and refresh hooks pass.');
})().catch(error=>{console.error(error);process.exitCode=1});
