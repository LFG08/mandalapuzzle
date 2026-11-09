const fs=require('fs'),vm=require('vm'),assert=require('assert');
const SCALE=1;
const manifest=JSON.parse(fs.readFileSync('vermelho/pieces.json'));
let source=fs.readFileSync('vermelho/index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
source=source.replace(/    init\(\)\.catch[^\n]+/,'');
const element=()=>({getBoundingClientRect:()=>({left:0,top:0}),classList:{add(){},remove(){}},style:{},appendChild(){},setAttribute(){}});
const sounds=[];
const context={addEventListener(){},document:{getElementById:element,querySelector:element},Audio:function(src){this.play=()=>{sounds.push(src);return Promise.resolve()};},console,localStorage:{setItem(){},getItem(){return null}}};vm.createContext(context);
vm.runInContext(source+'\nthis.api={st,el,availableSlot,rotatePiece,makePiece,restore,setupTrayScroll,clampTrayWidth,setTrayWidth,setupTrayResize,matchingSlots,slotTarget,loadManifest:v=>PIECES=v};',context);
const {api}=context;api.loadManifest(manifest.pieces);api.st.boardRect={left:20,top:30};
let checked=0,alternates=0;
for(const p of manifest.pieces){
 assert(p.matches[0].includes(p.id));
 for(let rotation=0;rotation<8;rotation++)for(const id of p.matches[rotation]){
 const slot=manifest.pieces.find(q=>q.id===id);
 const piece={id:p.id,data:p,rotation,w:slot.width,h:slot.height,currentX:20+slot.x*SCALE,currentY:30+slot.y*SCALE};
 api.st.pieces=[];assert.equal(api.availableSlot(piece).id,id);
 api.st.pieces=[{placed:true,slot:id}];assert.notEqual(api.availableSlot(piece)?.id,id);
 checked++;if(id!==p.id)alternates++;
 }
}
const p=manifest.pieces[0], forbidden=manifest.pieces.find(s=>!p.matches.flat().includes(s.id));
api.st.pieces=[];const invalid={data:p,w:p.width,h:p.height,rotation:0,currentX:20+forbidden.x*SCALE,currentY:30+forbidden.y*SCALE};
assert.notEqual(api.availableSlot(invalid)?.id,forbidden.id);
vm.runInContext('save()',context);
console.log(`Passed ${checked} valid rotation/slot combinations, including ${alternates} interchangeable combinations; occupied and nonidentical slots rejected; save OK.`);

// Exercise the actual right-click handlers and ensure rotation keeps other pieces in place.
(async()=>{
 const html=fs.readFileSync('vermelho/index.html','utf8');
 const actions=html.match(/<div class="actions">([\s\S]*?)<\/div>/)[1];
 assert.deepEqual([...actions.matchAll(/>([^<]+)<\/(?:button|a)>/g)].map(m=>m[1]),['Menu Principal','Reset','Embaralhar Peças','Som: Ligado','Sobre essa Imagem']);
 assert(!html.includes('id="rotate"'));
 assert(html.includes('width:1280px;height:1280px'));
 assert(html.includes('grid-template-columns:minmax(0,1fr) var(--tray-width,minmax(320px,1fr))'));
 assert(html.includes('const SCALE=BOARD/1280'));
 const canvas={style:{},getContext:()=>({translate(){},rotate(){},drawImage(){}})};
 context.document.createElement=()=>canvas;
 const node={...element(),appendChild(){}};
 api.el.tpl.content={firstElementChild:{cloneNode:()=>node}};
 api.el.tray.scrollLeft=api.el.tray.scrollTop=0;
 vm.runInContext('loadImage=async()=>({width:108,height:234});compact=()=>{throw new Error("Rotation must not rearrange the tray")}',context);
 const piece=await api.makePiece(p);
 piece.sourceX=200;piece.sourceY=200;api.st.pieces=[piece];
 const center=[piece.sourceX+piece.w/2,piece.sourceY+piece.h/2];
 node.onpointerdown({button:2});assert.equal(api.st.drag,null);
 let prevented=0;
 for(let r=1;r<=8;r++){
  node.oncontextmenu({preventDefault(){prevented++}});
  assert.equal(piece.rotation,r%8);
  assert(Math.abs(piece.sourceX+piece.w/2-center[0])<1e-8);
  assert(Math.abs(piece.sourceY+piece.h/2-center[1])<1e-8);
 }
 assert.equal(prevented,8);
 for(const rotation of [1,3,5,7])assert.equal(api.availableSlot({...piece,rotation}),undefined);
 const beforePickup=sounds.length;
 context.document.body={appendChild(){}};
 node.onpointerdown({button:0,clientX:10,clientY:10,preventDefault(){}});
 assert.equal(sounds.length,beforePickup);

 api.st.drag=null;api.st.soundOn=false;
 node.onpointerdown({button:0,clientX:10,clientY:10,preventDefault(){}});
 assert.equal(sounds.length,beforePickup);
 api.st.drag=null;
 api.restore({pieces:[{id:piece.id,rotation:1,slot:null}]});
 assert.equal(piece.rotation,2,'Legacy 90-degree rotations retain their orientation');
 api.restore({rotationStep:45,pieces:[{id:piece.id,rotation:1,slot:null}]});
 assert.equal(piece.rotation,1,'New progress restores 45-degree orientations');
 assert(html.includes('.piece,.piece:focus,.piece:focus-visible{outline:none}'));

 piece.placed=true;const placedRotation=piece.rotation;node.oncontextmenu({preventDefault(){}});assert.equal(piece.rotation,placedRotation);
 console.log('Right-click rotates through eight orientations, keeps the piece centered, prevents the browser menu, and leaves placed pieces locked. Menu buttons match Alittlepuzzle.');
})().catch(error=>{console.error(error);process.exitCode=1});

// Wheel handling is attached only to the board area and tray, never the page.
const wheelTargets=[];
for(const target of [api.el.tray,api.el.boardWrap])target.addEventListener=(type,handler,options)=>wheelTargets.push({target,type,handler,options});
context.matchMedia=()=>({matches:false});
api.el.tray.clientHeight=400;
api.el.tray.scrollTop=0;
api.el.tray.scrollBy=({top})=>{api.el.tray.scrollTop=Math.max(0,Math.min(1000,api.el.tray.scrollTop+top))};
api.setupTrayScroll();
assert.equal(wheelTargets.length,2);
for(const entry of wheelTargets){assert.equal(entry.type,'wheel');assert.equal(entry.options.passive,false)}
let intercepted=0;
const wheel=(deltaY,deltaMode=0,ctrlKey=false)=>({deltaY,deltaX:0,deltaMode,ctrlKey,preventDefault(){intercepted++},stopPropagation(){}});
wheelTargets[0].handler(wheel(100));assert.equal(api.el.tray.scrollTop,100);
wheelTargets[1].handler(wheel(2,1));assert.equal(api.el.tray.scrollTop,132);
wheelTargets[1].handler(wheel(1,2));assert.equal(api.el.tray.scrollTop,532);
api.el.trayUp.onclick();assert.equal(api.el.tray.scrollTop,232);
api.el.trayDown.onclick();assert.equal(api.el.tray.scrollTop,532);
wheelTargets[1].handler(wheel(2000));assert.equal(api.el.tray.scrollTop,1000);
wheelTargets[1].handler(wheel(100));assert.equal(api.el.tray.scrollTop,1000);assert.equal(intercepted,5);
wheelTargets[1].handler(wheel(100,0,true));assert.equal(intercepted,5);
console.log('Tray buttons and wheel scrolling pass for pixel, line, and page deltas; wheel stays contained at tray limits and preserves Ctrl+wheel zoom.');

const groups=[[29,31,33,35],[30,32,34,36],[37,38,39,40],[41,42,43,44]];
for(const group of groups)for(const id of group){
 const def=manifest.pieces[id-1];
 assert.deepEqual([...new Set(def.matches.flat())].sort((a,b)=>a-b),group);
 for(const other of group)assert.equal(def.matches.filter(ids=>ids.includes(other)).length,1);
}
for(const id of [101,102])for(let rotation=0;rotation<8;rotation++)assert.deepEqual(manifest.pieces[id-1].matches[rotation],[id]);
const diagonal={data:manifest.pieces[36],rotation:3,w:190,h:190};
const diagonalSlot=manifest.pieces[37];const target=api.slotTarget(diagonal,diagonalSlot);
assert.equal(target.x+diagonal.w/2,diagonalSlot.x+diagonalSlot.width/2);
assert.equal(target.y+diagonal.h/2,diagonalSlot.y+diagonalSlot.height/2);
assert.equal(api.clampTrayWidth(2000,900),900);
assert.equal(api.clampTrayWidth(20,900),280);
assert.equal(api.clampTrayWidth(500,200),200);
console.log('Explicit groups stay separate; 101/102 support every 45-degree orientation; diagonal slots stay centered; resize respects page and minimum widths.');
const resizeStyles=new Map();
api.el.layout.style={setProperty:(key,value)=>resizeStyles.set(key,value),getPropertyValue:key=>resizeStyles.get(key)||''};
api.el.app.getBoundingClientRect=()=>({width:1000});
api.el.trayWrap.getBoundingClientRect=()=>({width:parseFloat(resizeStyles.get('--tray-width'))||600});
api.el.trayResize.setPointerCapture=()=>{};
context.matchMedia=()=>({matches:true});
vm.runInContext('compact=()=>{}',context);
api.setupTrayResize();
api.el.trayResize.onpointerdown({button:0,clientX:100,pointerId:1,preventDefault(){}});
api.el.trayResize.onpointermove({clientX:250});assert.equal(resizeStyles.get('--tray-width'),'750px');
api.el.trayResize.onpointermove({clientX:1500});assert.equal(resizeStyles.get('--tray-width'),'1000px');
api.el.trayResize.onpointerup();
context.matchMedia=()=>({matches:false});api.setTrayWidth(600);
api.el.trayResize.onpointerdown({button:0,clientX:600,pointerId:2,preventDefault(){}});
api.el.trayResize.onpointermove({clientX:700});assert.equal(resizeStyles.get('--tray-width'),'500px');
api.el.trayResize.onpointermove({clientX:-500});assert.equal(resizeStyles.get('--tray-width'),'656px');
api.el.trayResize.onpointercancel();
assert.deepEqual(manifest.pieces[36].matches[3],[38]);
assert.deepEqual(manifest.pieces[36].matches[7],[40]);
assert.deepEqual(manifest.pieces[40].matches[1],[42]);
assert.deepEqual(manifest.pieces[40].matches[5],[44]);
console.log('Resize pointer gestures work on both layouts and clamp to page margins; clockwise diagonal group orientations are verified.');
