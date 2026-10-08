const fs=require('node:fs'),path=require('node:path');
const root=__dirname;
let code=fs.readFileSync(path.join(root,'worker.js'),'utf8');
code=code.replace("import {scheduleRequest,runScheduled,authorizedDevice} from './scheduler.js';",fs.readFileSync(path.join(root,'scheduler.js'),'utf8').replace(/export /g,''));
code=code.replace("import {TEST_HTML,TEST_SW,TEST_MANIFEST} from './test-assets.js';",fs.readFileSync(path.join(root,'test-assets.js'),'utf8').replace(/export /g,''));
const file=path.join(root,'worker-bundle.js');
if(process.argv.includes('--check')){if(fs.readFileSync(file,'utf8')!==code)throw Error('Worker bundle differs from canonical source');console.log('PASS canonical Worker bundle parity')}
else{fs.writeFileSync(file,code);console.log('Worker bundle generated from canonical modules')}
