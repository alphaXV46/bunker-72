import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const qa = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(qa, '../../..');
const checks = ['verify_assets','verify_phase_a','verify_phase_b','verify_phase_c','verify_phase_d','verify_phase_e','verify_phase_f','verify_release'];
const results = [];
for (const check of checks) {
  const result = spawnSync(process.execPath, [`scripts/${check}.mjs`], { cwd: root, encoding: 'utf8', timeout: 120000 });
  fs.writeFileSync(path.join(qa, `${check}.log`), `${result.stdout || ''}${result.stderr || ''}${result.error || ''}`);
  results.push({ check, exitCode: result.status });
  console.log(check, result.status === 0 ? 'PASS' : 'FAIL');
}
const build = spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm run build'], { cwd: root, encoding: 'utf8', timeout: 120000 });
fs.writeFileSync(path.join(qa, 'build.log'), `${build.stdout || ''}${build.stderr || ''}${build.error || ''}`);
results.push({ check: 'npm run build', exitCode: build.status });
// Preserve the exact dirty dist/index.html saved before this pass, not HEAD.
fs.copyFileSync(path.join(qa,'dist-index.before.html'), path.join(root,'dist/index.html'));
const diff = spawnSync('git',['diff','--check'],{cwd:root,encoding:'utf8'});
fs.writeFileSync(path.join(qa,'diff-check.log'),`${diff.stdout || ''}${diff.stderr || ''}`);
results.push({check:'git diff --check',exitCode:diff.status});
const before = JSON.parse(fs.readFileSync(path.join(qa,'story.before.json')));
const after = JSON.parse(fs.readFileSync(path.join(root,'src/data/story.json')));
const mappings=[];
for(const id of Object.keys(before.scenes)) {
  if(before.scenes[id].background!==after.scenes[id].background) mappings.push({id,before:before.scenes[id].background,after:after.scenes[id].background});
  delete before.scenes[id].background;
  delete after.scenes[id].background;
}
results.push({check:'story changes limited to background mappings',exitCode:JSON.stringify(before)===JSON.stringify(after)?0:1});
fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify({results,mappings},null,2));
console.log(JSON.stringify(results,null,2));
process.exitCode=results.some(r=>r.exitCode!==0)?1:0;
