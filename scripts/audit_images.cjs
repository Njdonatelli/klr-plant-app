const xlsx = require('xlsx');
const path = require('path');
const https = require('https');
const http = require('http');

const excelPath = path.resolve(__dirname, '..', '.robot', '2608251400_KLR_plant_master_catalog.xlsx');
const workbook = xlsx.readFile(excelPath);
const sheet = workbook.Sheets['All Plants'];
const data = xlsx.utils.sheet_to_json(sheet);

function checkUrl(url) {
    return new Promise((resolve) => {
        if (!url) return resolve({ ok: false, error: 'empty' });
        if (url === 'no image' || url === 'pending' || url === 'Pending') return resolve({ ok: false, error: 'no image string' });
        
        try {
            const parsed = new URL(url);
            const lib = parsed.protocol === 'https:' ? https : http;
            const req = lib.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
                if (res.statusCode === 405 || res.statusCode === 403) {
                    // some servers block HEAD, try GET with abort
                    const getReq = lib.request(url, { method: 'GET', timeout: 5000 }, (getRes) => {
                        getRes.resume(); // consume data
                        resolve({ ok: getRes.statusCode >= 200 && getRes.statusCode < 400, status: getRes.statusCode });
                        getReq.destroy();
                    });
                    getReq.on('error', (err) => resolve({ ok: false, error: err.message }));
                    getReq.on('timeout', () => { getReq.destroy(); resolve({ ok: false, error: 'timeout' }); });
                    getReq.end();
                } else {
                    resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
                }
            });
            req.on('error', (err) => resolve({ ok: false, error: err.message }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ ok: false, error: 'timeout' });
            });
            req.end();
        } catch (e) {
            resolve({ ok: false, error: 'invalid url' });
        }
    });
}

async function audit() {
    const results = {
        total: data.length,
        noImageAvailable: 0,
        linkBroken: 0,
        backupNotLoaded: 0,
        backupBroken: 0,
        otherIssue: 0,
        good: 0,
        issues: []
    };

    console.log(`Starting audit of ${data.length} plants...`);
    
    // Batch processing
    const batchSize = 25; // smaller batch size to avoid socket exhaustion
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await Promise.all(batch.map(async (row) => {
            const commonName = row['common name'];
            const imgUrl = row['image url'] ? row['image url'].toString().trim() : null;
            const backupUrl = row['gbif photo url'] ? row['gbif photo url'].toString().trim() : null;

            if (!imgUrl && !backupUrl) {
                results.noImageAvailable++;
                results.issues.push({ name: commonName, issue: 'no image is available', detail: 'Both URLs are empty' });
                return;
            }
            if (imgUrl === 'no image' && !backupUrl) {
                results.noImageAvailable++;
                results.issues.push({ name: commonName, issue: 'no image is available', detail: 'Main says no image, no backup' });
                return;
            }

            const [imgRes, backupRes] = await Promise.all([
                checkUrl(imgUrl),
                checkUrl(backupUrl)
            ]);

            if (imgUrl && imgUrl !== 'no image' && imgUrl !== 'Pending' && !imgRes.ok) {
                if (!backupUrl) {
                    results.linkBroken++;
                    results.issues.push({ name: commonName, issue: 'link is broken', detail: `Main link broken (${imgRes.status || imgRes.error}), no backup` });
                } else if (backupRes.ok) {
                    results.backupNotLoaded++;
                    results.issues.push({ name: commonName, issue: 'backup links are not being loaded', detail: `Main link broken, backup works but not used` });
                } else {
                    results.backupBroken++;
                    results.issues.push({ name: commonName, issue: 'backup link is broken', detail: `Main link broken, backup also broken (${backupRes.status || backupRes.error})` });
                }
            } else if (!imgUrl || imgUrl === 'no image' || imgUrl === 'Pending') {
                 if (backupUrl && backupRes.ok) {
                     results.backupNotLoaded++;
                     results.issues.push({ name: commonName, issue: 'backup links are not being loaded', detail: `No main link, backup works but not used` });
                 } else if (backupUrl && !backupRes.ok) {
                     results.backupBroken++;
                     results.issues.push({ name: commonName, issue: 'backup link is broken', detail: `No main link, backup exists but is broken` });
                 }
            } else if (imgRes.ok) {
                results.good++;
            } else {
                results.otherIssue++;
                results.issues.push({ name: commonName, issue: 'other issue', detail: `imgRes: ${JSON.stringify(imgRes)}` });
            }
        }));
        if (i % 100 === 0) console.log(`Processed ${i} / ${data.length}...`);
    }

    const fs = require('fs');
    fs.writeFileSync(path.resolve(__dirname, '..', 'audit_results.json'), JSON.stringify(results, null, 2));
    console.log('Done! Wrote audit_results.json');
}

audit();
