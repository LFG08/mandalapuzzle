const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('mosaico/index.html','utf8');
const manifest=JSON.parse(fs.readFileSync('mosaico/pieces.json'));
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/    init\(\)\.catch[^\n]+/,'');
const storage=new Map(),sounds=[],listeners=new Map();
function element(){
 const styles=new Map();
 return {scrollLeft:0,scrollTop:0,clientHeight:400,clientWidth:400,scrollWidth:1200,scrollHeight:4000,
  style:{setProperty:(k,v)=>styles.set(k,v),getPropertyValue:k=>styles.get(k)||''},classList:{add(){},remove(){}},
  getBoundingClientRect:()=>({left:0,top:0,right:400,bottom:400,width:400}),
  showModal(){this.open=true},close(){this.open=false},appendChild(n){n.parentElement=this},contains(n){return n.parentElement===this},setAttribute(k,v){this[k]=v},addEventListener(){},remove(){},focus(){}};
}
function contextFor(){
 const ctx={console,document:{getElementById:id=>id==='empty'?null:element(),querySelector:element,body:element(),createElement:()=>({...element(),getContext:()=>({translate(){},rotate(){},drawImage(){}})})},
  Audio:function(src){this.play=()=>{sounds.push(src);return Promise.resolve()}},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{reload(){}},
  addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},removeEventListener(){},matchMedia:()=>({matches:false})};
 vm.createContext(ctx);vm.runInContext(source+'\nthis.api={st,el,init,chooseDifficulty,load,availableSlot,rotatePiece,makePiece,restore,save,setupTrayScroll,reflowTrayIfNeeded,setupAutoTrayLayout,resize,setupMouseRotation,matchingSlots,slotTarget,syncTrayLayout,updateMenu,moveDrag,endDrag,loadManifest:v=>PIECES=v};',ctx);
 ctx.api.loadManifest(manifest.pieces);ctx.api.st.trayWidth=ctx.api.el.tray.clientWidth;return ctx;
}
const ctx=contextFor(),api=ctx.api;api.st.difficulty="easy";
function event(button=0,extra={}){return {button,buttons:button===2?3:1,clientX:60,clientY:70,preventDefault(){},...extra}}
function dispatch(type,e){for(const fn of listeners.get(type)||[])fn(e)}
async function makePiece(id,owner=ctx){
 owner.api.el.tpl.content={firstElementChild:{cloneNode:element}};
 vm.runInContext('loadImage=async()=>({width:108,height:234})',owner);
 return owner.api.makePiece(manifest.pieces[id-1]);
}
(async()=>{
 api.st.boardRect={left:20,top:30};let checked=0,alternates=0;
 for(const p of manifest.pieces){
  assert(p.matches[0].includes(p.id));
  for(let rotation=0;rotation<8;rotation++)for(const id of p.matches[rotation]){
   const slot=manifest.pieces[id-1],piece={id:p.id,data:p,rotation,w:slot.width,h:slot.height,currentX:20+slot.x,currentY:30+slot.y};
   api.st.pieces=[];assert.equal(api.availableSlot(piece).id,id);
   api.st.pieces=[{placed:true,slot:id}];assert.notEqual(api.availableSlot(piece)?.id,id);
   assert(manifest.pieces[id-1].matches[(8-rotation)%8].includes(p.id));checked++;if(id!==p.id)alternates++;
  }
 }
 console.log(`${checked} valid placements, including ${alternates} interchangeable placements; occupied slots and reciprocal rotations verified.`);
 const groups=[[29,31,33,35],[30,32,34,36],[37,38,39,40],[41,42,43,44],[104,105,113,114],[103,108,109,110],[106,107,111,112],[115,116,117,118],[119,120,121,122],[123,124,125,126]];
 for(const group of groups)for(const id of group)assert.deepEqual([...new Set(manifest.pieces[id-1].matches.flat())].sort((a,b)=>a-b),group);
 for(const id of [101,102])for(let r=0;r<8;r++){
  const data=manifest.pieces[id-1];
  assert.deepEqual(data.matches[r],r%2===0?[id]:[]);
  const p={data,rotation:r,w:r%2?Math.ceil(data.width*Math.SQRT2):data.width,h:r%2?Math.ceil(data.height*Math.SQRT2):data.height};
  const target=api.slotTarget(p,data);p.currentX=20+target.x;p.currentY=30+target.y;api.st.pieces=[];
  assert.equal(api.availableSlot(p)?.id,r%2===0?id:undefined,'Center pieces must reject square/diagonal-tip orientations');
 }
 assert.deepEqual(manifest.pieces[103].matches[4],[105]);
 assert.deepEqual(manifest.pieces[103].matches[6],[113]);
 const correction=api.slotTarget({data:manifest.pieces[103],rotation:4,w:93,h:79},manifest.pieces[104]);
 assert.equal(correction.x,manifest.pieces[104].x);assert.equal(correction.y,manifest.pieces[104].y-1);
 const redCorrection=api.slotTarget({data:manifest.pieces[118],rotation:6,w:119,h:120},manifest.pieces[119]);
 assert.equal(redCorrection.x,manifest.pieces[119].x+1);assert.equal(redCorrection.y,manifest.pieces[119].y-1);
 const audited=JSON.parse(fs.readFileSync('mosaico/rotation-groups.json','utf8'));
 for(const group of audited.groups)for(const id of group.pieces)for(const deg of group.clockwiseDegreesFromFirst[id])assert(manifest.pieces[group.pieces[0]-1].matches[deg/45].includes(id));
 assert(!manifest.pieces[134].matches.flat().includes(136));
 assert.deepEqual(manifest.pieces[36].matches[3],[38]);assert.deepEqual(manifest.pieces[40].matches[1],[42]);

 for(const group of [[147,149,152,154],[148,150,151,153]])for(const id of group){
  const def=manifest.pieces[id-1];
  assert.deepEqual([...new Set(def.matches.flat())].sort((a,b)=>a-b),[...group].sort((a,b)=>a-b));
 }
 const aligned=api.slotTarget({data:manifest.pieces[146],rotation:4,w:157,h:286},manifest.pieces[153]);
 assert.equal(aligned.x,80);assert.equal(aligned.y,137,'Use artwork offset rather than canvas center');
 const clipped=api.slotTarget({data:manifest.pieces[146],rotation:6,w:286,h:157},manifest.pieces[151]);
 assert.equal(clipped.x,857);assert.equal(clipped.y,80,'Cropped tips retain their artwork alignment');
 const piece=await makePiece(1),other=await makePiece(2);api.st.pieces=[piece,other];
 piece.sourceX=250;piece.sourceY=350;other.sourceX=700;other.sourceY=900;api.syncTrayLayout();
 const center=[piece.sourceX+piece.w/2,piece.sourceY+piece.h/2];
 for(let r=1;r<=8;r++){
  piece.node.onpointerdown(event(2,{pointerType:'mouse'}));assert.equal(piece.rotation,(r-1)%8);
  piece.node.onmousedown(event(2));piece.node.oncontextmenu(event(2));assert.equal(piece.rotation,r%8);
  assert.equal(piece.sourceX+piece.w/2,center[0]);assert.equal(piece.sourceY+piece.h/2,center[1]);
  assert.equal(other.sourceX,700);assert.equal(other.sourceY,900);
 }
 api.setupMouseRotation();const before=sounds.length;
 piece.node.onpointerdown(event(0,{pointerType:'mouse'}));assert.equal(api.st.drag,null);
 piece.node.onmousedown(event(0));assert(api.st.drag);assert.equal(sounds.length,before);
 const dragCenter=[piece.currentX+piece.w/2,piece.currentY+piece.h/2];
 const oldOx=api.st.drag.ox,oldW=piece.w;
 dispatch('mousedown',event(2));assert.equal(piece.rotation,1);assert(api.st.drag);
 assert.equal(piece.currentX+piece.w/2,dragCenter[0]);assert.equal(piece.currentY+piece.h/2,dragCenter[1]);
 assert.equal(api.st.drag.ox,oldOx+(piece.w-oldW)/2);
 dispatch('mouseup',event(2,{buttons:1}));assert(api.st.drag,'Releasing right keeps left drag active');
 api.moveDrag(event(0,{clientX:500,clientY:600}));assert.equal(piece.currentX,500-api.st.drag.ox);
 // Release left while right is still down: the drag must end immediately.
 api.st.boardRect={left:-10000,top:-10000};api.el.board.getBoundingClientRect=()=>({left:-10000,top:-10000});
 dispatch('mouseup',event(0,{buttons:2}));assert.equal(api.st.drag,null);
 assert.equal(other.sourceX,700);assert.equal(other.sourceY,900);
 console.log('Mouse chord rotates by 45 degrees without moving the center, jumping on next move, or dropping on right release.');

 piece.sourceX=235;piece.sourceY=975;piece.node.style.zIndex='48';other.sourceX=735;other.sourceY=1175;
 api.el.tray.scrollLeft=40;api.el.tray.scrollTop=300;api.st.menuCollapsed=true;api.save();
 const saved=JSON.parse(storage.get('mosaicoJigsawProgress'));
 assert.equal(saved.trayLayout,1);assert.equal(saved.pieces[0].x,235);assert.equal(saved.pieces[0].y,975);
 const reloaded=contextFor(),p2=await makePiece(1,reloaded),o2=await makePiece(2,reloaded);reloaded.api.st.pieces=[p2,o2];
 reloaded.api.restore(saved);reloaded.api.syncTrayLayout();
 assert.equal(p2.sourceX,235);assert.equal(p2.sourceY,975);assert.equal(p2.rotation,piece.rotation);assert.equal(p2.node.style.zIndex,'48');
 assert.equal(o2.sourceX,735);assert.equal(o2.sourceY,1175);assert.equal(saved.trayScroll.y,300);
 reloaded.api.updateMenu();assert.equal(reloaded.api.el.menuActions.hidden,true);assert.equal(reloaded.api.el.menuToggle['aria-expanded'],'false');
 reloaded.api.st.menuCollapsed=false;reloaded.api.updateMenu();assert.equal(reloaded.api.el.menuActions.hidden,false);
 reloaded.api.restore({pieces:[{id:1,rotation:1,slot:null}]});assert.equal(p2.rotation,2);
 assert(!html.includes('id="trayUp"'));assert(!html.includes('id="trayDown"'));
 const boot=contextFor();
 boot.fetch=async()=>({ok:true,json:async()=>({pieces:manifest.pieces.slice(0,2)})});
 boot.api.el.tpl.content={firstElementChild:{cloneNode:element}};
 vm.runInContext('loadImage=async()=>({width:108,height:234})',boot);
 await boot.api.init();
 assert.equal(boot.api.st.pieces[0].sourceX,235);assert.equal(boot.api.st.pieces[0].sourceY,975);
 assert.equal(boot.api.st.pieces[1].sourceX,735);assert.equal(boot.api.st.pieces[1].sourceY,1175);
 assert.equal(boot.api.el.tray.scrollLeft,40);assert.equal(boot.api.el.tray.scrollTop,300);
 assert.equal(boot.api.el.menuActions.hidden,true);
 boot.api.el.menuToggle.onclick();assert.equal(boot.api.el.menuActions.hidden,false);
 console.log('Full initialization after reload retains arrangement, scroll and menu state; legacy rotations load. Arrow controls removed.');

 assert(html.includes('.layout{display:grid;width:100%;grid-template-columns:1318px minmax(320px,1fr)'));
 assert(!html.includes('trayResize'));assert(!html.includes('--tray-width'));
 const packing=contextFor(),pack=[];
 for(let id=3;id<=8;id++)pack.push(await makePiece(id,packing));
 packing.api.st.pieces=pack;packing.api.el.tray.clientWidth=280;
 pack[1].rotation=2;pack[1].w=234;pack[1].h=108;
 packing.api.reflowTrayIfNeeded();
 const beforeWidth=pack.map(p=>[p.sourceX,p.sourceY]);
 pack[5].placed=true;pack[5].node.style.left='777px';
 const rotations=pack.map(p=>p.rotation);
 packing.api.el.tray.clientWidth=800;packing.api.resize();
 assert(pack.slice(0,5).every(p=>p.sourceY===12),'Larger viewport should use the new horizontal space');
 assert(pack[4].sourceX>pack[3].sourceX);assert(beforeWidth[4][1]>pack[4].sourceY);
 assert.deepEqual(pack.map(p=>p.rotation),rotations);assert.equal(pack[5].node.style.left,'777px');
 packing.api.el.tray.clientWidth=280;packing.api.resize();
 for(const p of pack.slice(0,5))assert(p.sourceX+p.w<=268);
 const held=pack.slice(0,5).map(p=>[p.sourceX,p.sourceY]);
 packing.api.st.drag={piece:pack[0],ox:0,oy:0};packing.api.el.tray.clientWidth=1000;
 packing.api.reflowTrayIfNeeded();assert.equal(packing.api.st.pendingReflow,true);
 assert.deepEqual(pack.slice(0,5).map(p=>[p.sourceX,p.sourceY]),held,'Resizing must not move a held piece');
 packing.api.st.drag=null;packing.api.reflowTrayIfNeeded();assert.equal(packing.api.st.pendingReflow,false);
 assert(pack.slice(0,5).every(p=>p.sourceY===12));
 let observed,notify;packing.ResizeObserver=class{constructor(callback){notify=callback}observe(target){observed=target}};
 packing.api.setupAutoTrayLayout();assert.equal(observed,packing.api.el.tray);
 packing.api.el.tray.clientWidth=320;notify();assert(pack[4].sourceY>12);
 pack[0].sourceX=91;notify();assert.equal(pack[0].sourceX,91,'Same-width notifications preserve manual organization');
 assert.equal(JSON.parse(storage.get('mosaicoJigsawProgress')).trayWidth,320);
 console.log('Automatic packing uses available width, preserves order and rotations, defers during drag and observes viewport/zoom changes. Manual resize removed.');

 const targets=[];for(const target of [api.el.tray,api.el.boardWrap])target.addEventListener=(type,fn,options)=>targets.push({type,fn,options});
 api.el.tray.scrollTop=0;api.el.tray.scrollBy=({top})=>api.el.tray.scrollTop=Math.max(0,Math.min(1000,api.el.tray.scrollTop+top));api.setupTrayScroll();
 let intercepted=0;const wheel=(dy,mode=0,ctrlKey=false)=>({deltaY:dy,deltaX:0,deltaMode:mode,ctrlKey,preventDefault(){intercepted++},stopPropagation(){}});
 assert.equal(targets.length,2);assert.equal(targets[0].options.passive,false);
 targets[0].fn(wheel(100));targets[1].fn(wheel(2,1));assert.equal(api.el.tray.scrollTop,132);
 targets[1].fn(wheel(1,2));assert.equal(api.el.tray.scrollTop,532);
 targets[1].fn(wheel(2000));targets[1].fn(wheel(100));assert.equal(api.el.tray.scrollTop,1000);assert.equal(intercepted,5);
 targets[1].fn(wheel(100,0,true));assert.equal(intercepted,5);
 console.log('Independent wheel scrolling, edge containment and Ctrl+wheel zoom verified.');
 assert(html.includes('<title>Mosaico Jigsaw</title>'));
 assert(html.includes('<h2 id="tipTitle">Como Jogar</h2>'));
 assert(html.includes('peças começam no ângulo correto'));
 assert(html.includes('peças começam em ângulos aleatórios'));
 assert(!html.includes('Entendi'));
 assert(!fs.existsSync('vermelho/index.html'));
 async function freshGame(){
  const game=contextFor();game.fetch=async()=>({ok:true,json:async()=>manifest});
  game.api.el.tpl.content={firstElementChild:{cloneNode:element}};
  vm.runInContext('loadImage=async()=>({width:108,height:234})',game);
  await game.api.init();return game;
 }
 storage.clear();
 const easy=await freshGame();assert.equal(easy.api.st.difficulty,null);assert.equal(easy.api.el.tip.open,true);
 easy.api.el.easyMode.onclick();assert.equal(easy.api.st.difficulty,'easy');assert.equal(easy.api.el.tip.open,false);
 assert(easy.api.st.pieces.every(p=>p.rotation===0));
 storage.clear();
 const hard=await freshGame();let sequence=0;hard.Math=Object.create(Math);hard.Math.random=()=>((sequence++%8)+.1)/8;
 hard.api.el.hardMode.onclick();assert.equal(hard.api.st.difficulty,'hard');assert.equal(hard.api.el.tip.open,false);
 assert.deepEqual(Array.from(hard.api.st.pieces,p=>p.rotation),Array.from({length:190},(_,i)=>i%8));
 const hardSaved=JSON.parse(storage.get('mosaicoJigsawProgress'));assert.equal(hardSaved.difficulty,'hard');
 hard.api.chooseDifficulty('easy');assert.equal(hard.api.st.difficulty,'hard','A second click must not reset an active game');
 const resumed=await freshGame();assert.equal(resumed.api.el.tip.open,undefined);assert.equal(resumed.api.st.difficulty,'hard');
 assert.deepEqual(Array.from(resumed.api.st.pieces,p=>p.rotation),Array.from(hard.api.st.pieces,p=>p.rotation));
 assert.deepEqual(Array.from(resumed.api.st.pieces,p=>[p.sourceX,p.sourceY]),Array.from(hard.api.st.pieces,p=>[p.sourceX,p.sourceY]));
 const legacySaved={...hardSaved};delete legacySaved.difficulty;
 storage.clear();storage.set('vermelhoJigsawProgress',JSON.stringify(legacySaved));
 const migrated=await freshGame();assert.equal(migrated.api.st.difficulty,'easy');assert.equal(migrated.api.st.pieces[1].rotation,1);
 migrated.api.el.reset.onclick();assert.equal(storage.has('mosaicoJigsawProgress'),false);assert.equal(storage.has('vermelhoJigsawProgress'),false);
 migrated.api.save();assert.equal(storage.has('mosaicoJigsawProgress'),false,'Unload autosave must not recreate the reset progress');
 const reset=await freshGame();assert.equal(reset.api.st.difficulty,null);assert.equal(reset.api.el.tip.open,true);
 assert(reset.api.st.pieces.every(p=>!p.placed&&p.rotation===0));
 const centerGame=contextFor(),inner=await makePiece(101,centerGame),outer=await makePiece(102,centerGame);
 centerGame.api.st.pieces=[inner,outer];
 centerGame.api.restore({difficulty:'hard',rotationStep:45,pieces:[{id:101,rotation:1,slot:101,x:200,y:300},{id:102,rotation:3,slot:102,x:400,y:500}]});
 assert(!inner.placed&&!outer.placed,'Previously saved invalid center orientations must return to the tray');
 assert.equal(inner.rotation,1);assert.equal(outer.rotation,3,'Keep saved angles so the player can correct them');
 centerGame.api.st.boardRect={left:0,top:0};
 centerGame.api.restore({difficulty:'hard',rotationStep:45,pieces:[{id:101,rotation:2,slot:101},{id:102,rotation:6,slot:102}]});
 assert(inner.placed&&outer.placed,'Valid rotated center pieces must still restore');
 console.log('Mosaico modes, resume, migration, Reset, center orientation restrictions and validation of old saved center placements passed. All tests passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
