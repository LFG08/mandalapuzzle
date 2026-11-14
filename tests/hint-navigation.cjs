const assert = require('node:assert/strict');
const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({executablePath: process.env.CHROMIUM_BINARY || '/usr/bin/chromium', args:['--no-sandbox']});
 let checks = 0;
 try {
  for (const viewport of [{width:1280,height:800},{width:390,height:844}]) {
   for (const puzzle of ['wasteland_baby','cores','mais_gatos']) {
    const page = await browser.newPage({viewport});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.goto(`${process.env.TEST_ORIGIN || 'http://localhost:8000'}/${puzzle}/`);
    await page.waitForLoadState('networkidle');
    for (const zoom of [0.7,1.4]) for (const rotation of [0,90,180,270]) {
     const count = await page.evaluate(async ({zoom,rotation,puzzle})=>{
      const container=document.querySelector('.container');
      container.style.transition='none';container.style.zoom=zoom;container.style.transform=`rotate(${rotation}deg)`;
      await new Promise(requestAnimationFrame);
      const calls=[]; const original=window.scrollTo;
      window.scrollTo=(position)=>calls.push(position);
      const areas=[...document.querySelectorAll('map area')];
      try {
       areas.forEach((area,index)=>{
        calls.length=0;
        const word=area.getAttribute('onclick').match(/'([^']+)'/)[1];
        const target=document.querySelector(`.image-map-targets [aria-label="Elemento escondido ${index+1}"]`);
        const rect=target.getBoundingClientRect();
        const expected={left:Math.min(Math.max(0,document.documentElement.scrollWidth-innerWidth), Math.max(0,scrollX+rect.left+rect.width/2-innerWidth/2)),top:Math.min(Math.max(0,document.documentElement.scrollHeight-innerHeight),Math.max(0,scrollY+rect.top+rect.height/2-innerHeight/2))};
        if(puzzle==='mais_gatos') activateHintForWord(word);
        else document.getElementById('menu-'+word).dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}));
        if(calls.length!==1 || Math.abs(calls[0].left-expected.left)>1 || Math.abs(calls[0].top-expected.top)>1) throw Error(`${puzzle}/${word}: incorrect hint destination ${JSON.stringify(calls)} expected ${JSON.stringify(expected)}`);
        if(!document.querySelector('.hint-region.active'))throw Error(`${word}: missing region highlight`);
       });
      } finally {window.scrollTo=original;}
      return areas.length;
     },{zoom,rotation,puzzle});
     checks+=count;
    }
    assert.deepEqual(errors,[]);
    await page.close();
   }
  }
  console.log(`Passed ${checks} hint destinations across 3 puzzles, desktop/mobile, 2 zoom levels, and 4 rotations.`);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
