const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const puzzles=['wasteland_baby/','cores/','unrealunearth/','ajna/','arcane/','bichanos/','celtic/','fundodomar/level3.html','goya/','LAURA/','losgatos/','mais_gatos/','margrego/','rotadeseda/','tarits/','vibevegana/','yaga/index_abruxa.html','LispenardStreet/'];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_BINARY||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  for(const puzzle of puzzles){
   await page.goto(`${process.env.TEST_ORIGIN||'http://localhost:8000'}/${puzzle}`);
   await page.waitForLoadState('networkidle');
   // Start over the footer/right edge, then zoom out beyond the minimum.
   await page.evaluate(()=>scrollTo(10000,10000));
   await page.mouse.move(1200,700);
   for(let i=0;i<35;i++) await page.evaluate(()=>document.body.dispatchEvent(new WheelEvent('wheel',{deltaY:100,clientX:1200,clientY:700,bubbles:true,cancelable:true})));
   const bounds=await page.locator('[data-zoom-container], .container').first().boundingBox();
   assert(bounds.x<=1&&bounds.x+bounds.width>=1279,`${puzzle}: horizontal blank space ${JSON.stringify(bounds)}`);
   assert(bounds.y<=1&&bounds.y+bounds.height>=799,`${puzzle}: vertical blank space ${JSON.stringify(bounds)}`);
   console.log('PASS',puzzle);
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
