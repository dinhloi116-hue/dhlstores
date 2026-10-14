import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {dirname,join} from 'node:path';
import {checkGithubVersion,compareVersions,GITHUB_REPO,GITHUB_BRANCH} from '../lib/update-check.mjs';
const base=dirname(dirname(fileURLToPath(import.meta.url)));
const manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
test('version comparator correctly handles semantic three-part versions',()=>{assert.equal(compareVersions('0.3.0','0.4.0'),1);assert.equal(compareVersions('0.4.0','0.4.0'),0);assert.equal(compareVersions('0.5.0','0.4.0'),-1);assert.throws(()=>compareVersions('bad','0.4.0'))});
test('Git update check accepts only matching official public extension identity',async()=>{
 const remote={...manifest,version:'0.6.1'};
 const mock=async url=>{assert.match(url,/api\.github\.com/);return new Response(JSON.stringify({type:'file',encoding:'base64',content:Buffer.from(JSON.stringify(remote)).toString('base64')}),{status:200})};
 const v=await checkGithubVersion(manifest,mock);assert.equal(v.updateAvailable,true);assert.equal(v.latestVersion,'0.6.1');assert.match(v.repoUrl,/dhl-product-factory/);
 await assert.rejects(()=>checkGithubVersion(manifest,async()=>new Response(JSON.stringify({type:'file',encoding:'base64',content:Buffer.from(JSON.stringify({...remote,key:'different'})).toString('base64')}),{status:200})),/không khớp/);
 assert.equal(GITHUB_REPO,'dinhloi116-hue/dhlstores');assert.equal(GITHUB_BRANCH,'feature/dhl-product-factory-mvp-20261012');
});
test('local offline updater and source identity included',async()=>{
 const updater=await readFile(join(base,'cap-nhat-tu-git.ps1'),'utf8');
 const launcher=await readFile(join(base,'CAP-NHAT-TOOL.cmd'),'utf8');
 assert.match(updater,/Get-ExtensionId/);assert.match(updater,/\$Remote\.oauth2\.client_id/);assert.match(updater,/raw\.githubusercontent\.com/);
 assert.match(updater,/\$Backup/);assert.match(launcher,/cap-nhat-tu-git.ps1/);
 const html=await readFile(join(base,'panel.html'),'utf8');assert.match(html,/id="checkGitUpdate"/);assert.match(html,/id="updateFromGit"/);
 const s=await readFile(join(base,'background.js'),'utf8');assert.match(s,/github-update-check/);
 assert.ok(manifest.host_permissions.includes('https://api.github.com/*'));
});
