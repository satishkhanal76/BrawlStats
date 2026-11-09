const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const csv = require('csvtojson');
const fetch = require('node-fetch');

const root = path.join(__dirname, '..');
const assets = path.join(root, 'public/assets');
const officialUrl = 'https://api.brawlstars.com/v1/brawlers';
const tables = [
    { file: 'characters', folder: 'brawler_portraits' },
    { file: 'gadgets', folder: 'gadgets', field: 'gadgets' },
    { file: 'star-powers', folder: 'star-powers', field: 'starPowers' }
];

function csvPath(table) {
    return `public/assets/csv/${table.file}.csv`;
}

async function loadTable(table) {
    const content = await fs.readFile(path.join(root, csvPath(table)), 'utf8');
    const rows = await csv().fromString(content);
    return { content, rows: new Map(rows.map(row => [Number(row.id), row])) };
}

async function getJson(url, headers) {
    const response = await fetch(url, { headers, timeout: 15000, redirect: 'error' });
    if (!response.ok) throw new Error(`Catalogue request failed (HTTP ${response.status})`);
    return response.json();
}

function getPage(data) {
    if (!Array.isArray(data?.items) || data.items.length === 0) {
        throw new Error('Expected a catalogue with a non-empty items array');
    }
    return data.items;
}

async function loadCatalogue(file) {
    const snapshot = process.env.BRAWL_CATALOGUE_URL;
    if (file || snapshot) {
        if (!file && new URL(snapshot).protocol !== 'https:') {
            throw new Error('BRAWL_CATALOGUE_URL must use HTTPS');
        }
        const payload = file ? JSON.parse(await fs.readFile(file, 'utf8')) : await getJson(snapshot);
        // The deployed Express proxy wraps the upstream JSON in a JSON string.
        const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (data?.paging?.cursors?.after) throw new Error('The snapshot must include every page');
        return getPage(data);
    }

    const token = process.env.BRAWL_API_TOKEN;
    if (!token) throw new Error('Provide a snapshot or set BRAWL_API_TOKEN');
    const items = [];
    const url = new URL(officialUrl);
    const seen = new Set();
    let after;
    do {
        const data = await getJson(url.toString(), { Authorization: `Bearer ${token}` });
        items.push(...getPage(data));
        after = data.paging?.cursors?.after;
        if (after) {
            if (seen.has(after)) throw new Error('The API returned a repeated catalogue cursor');
            seen.add(after);
            url.searchParams.set('after', after);
        }
    } while (after);
    return items;
}

function validateEntries(entries, label) {
    const ids = new Set();
    for (const entry of entries) {
        if (!Number.isSafeInteger(entry?.id) || entry.id <= 0 || ids.has(entry.id) ||
            typeof entry.name !== 'string' || !entry.name.trim() || /[\r\n]/.test(entry.name)) {
            throw new Error(`Invalid or duplicate entry in ${label}`);
        }
        ids.add(entry.id);
    }
}

function entriesFor(brawlers, table) {
    if (!table.field) return brawlers;
    return brawlers.flatMap(brawler => {
        const items = brawler[table.field];
        if (!Array.isArray(items)) throw new Error(`Missing ${table.field} for ${brawler.id}`);
        validateEntries(items, table.field);
        return items.map(item => ({ ...item, characterId: String(brawler.id) }));
    });
}

function imagePath(table, entry) {
    return table.field
        ? `assets/${table.folder}/${entry.id}.png`
        : entry.image_src?.replace(/^\.\//, '') || `assets/${table.folder}/${entry.id}.png`;
}

async function imageExists(image) {
    return (await fs.stat(path.join(root, 'public', image)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    }))?.isFile();
}

function csvLine(table, entry, current) {
    const name = `"${entry.name.replace(/"/g, '""')}"`;
    if (table.field) return [entry.id, name, entry.characterId].join(',');
    return [
        entry.id, name, current?.disabled, current?.arriving_soon, current?.arriving_time,
        `./${imagePath(table, { ...current, id: entry.id })}`, current?.rarity
    ].join(',');
}

async function planTable(table, entries, report) {
    const { content, rows } = await loadTable(table);
    const replacements = new Map();
    const additions = [];
    for (const entry of entries) {
        const current = rows.get(entry.id);
        if (!current) {
            additions.push(csvLine(table, entry));
            report.push(`- New ${table.file} entry ${entry.name} (${entry.id})`);
            if (!table.field) report.push(`- [ ] Set rarity for ${entry.name} (${entry.id})`);
        } else if (current.name !== entry.name ||
            (table.field && current.characterId !== entry.characterId)) {
            replacements.set(entry.id, csvLine(table, entry, current));
            report.push(`- Review updated metadata and artwork for ${entry.name} (${entry.id})`);
        }

        const image = imagePath(table, { ...current, id: entry.id });
        if (!await imageExists(image)) report.push(`- [ ] Add \`public/${image}\` for ${entry.name}`);
    }

    if (!replacements.size && !additions.length) return content;
    const newline = content.includes('\r\n') ? '\r\n' : '\n';
    const [header, ...lines] = content.trimEnd().split(/\r?\n/);
    if (lines.length !== rows.size || lines.some(line => !rows.has(Number(line.split(',')[0])))) {
        throw new Error(`Unexpected CSV layout in ${csvPath(table)}`);
    }
    return [header, ...lines.map(line => replacements.get(Number(line.split(',')[0])) ?? line),
        ...additions, ''].join(newline);
}

async function validate(base) {
    const rarities = await csv().fromFile(path.join(assets, 'csv/rarities.csv'));
    const validRarities = new Set(rarities.map(row => row.rarity));
    const missing = [];
    for (const table of tables) {
        const original = execFileSync('git', ['show', `${base}:${csvPath(table)}`], {
            cwd: root, encoding: 'utf8'
        });
        const existing = new Set((await csv().fromString(original)).map(row => row.id));
        const { rows } = await loadTable(table);
        for (const entry of rows.values()) {
            if (existing.has(entry.id)) continue;
            if (!table.field && !validRarities.has(entry.rarity)) {
                missing.push(`Set a valid rarity for ${entry.name} (${entry.id})`);
            }
            const image = imagePath(table, entry);
            if (!await imageExists(image)) missing.push(`Add public/${image}`);
        }
    }
    if (missing.length) throw new Error(missing.join('\n'));
    console.log('New catalogue entries have the required rarities and images.');
}

async function main() {
    const [option, argument] = process.argv.slice(2);
    if (option === '--validate' && argument) return validate(argument);
    if (option && option !== '--preview' && option !== '--write') {
        throw new Error('Usage: sync-brawlers [--preview|--write] [snapshot.json], or --validate <base>');
    }

    require('dotenv').config({ path: path.join(root, '.env') });
    const brawlers = await loadCatalogue(argument);
    validateEntries(brawlers, 'brawlers');
    const report = [];
    const planned = [];
    for (const table of tables) {
        const entries = entriesFor(brawlers, table);
        validateEntries(entries, table.file);
        planned.push(await planTable(table, entries, report));
    }

    if (option === '--write') {
        for (const [index, table] of tables.entries()) {
            const file = path.join(root, csvPath(table));
            if (planned[index] === await fs.readFile(file, 'utf8')) continue;
            const temporary = `${file}.${process.pid}.tmp`;
            await fs.writeFile(temporary, planned[index], { flag: 'wx' });
            await fs.rename(temporary, file);
        }
    }

    console.log(report.length ? report.join('\n') : 'Catalogue is up to date.');
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
