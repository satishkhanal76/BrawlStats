const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const repositoryRoot = path.resolve(__dirname, '../..');
const upgradesFile = path.join(repositoryRoot, 'public/assets/json/brawler-upgrades.json');
const hyperchargeFolder = path.join(repositoryRoot, 'public/assets/hypercharges');
const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');

function runGit(args) {
    return execFileAsync('git', args, { cwd: repositoryRoot });
}

function createRequestError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function prepareHyperchargeUpdate(body, image) {
    const id = body.hyperchargeId;
    const name = typeof body.hyperchargeName === 'string' ? body.hyperchargeName.trim() : '';
    if (!id && !name && !image) return {};

    if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        return { error: 'Enter a valid Hypercharge ID.' };
    }
    if (image && !image.buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
        return { error: 'Choose a PNG image for the Hypercharge.' };
    }

    const catalogue = JSON.parse(fs.readFileSync(upgradesFile, 'utf8'));
    const brawler = catalogue[body.brawlerId] ?? {};
    const itemId = Number(id);
    const belongsToAnotherBrawler = Object.entries(catalogue).some(([brawlerId, upgrades]) =>
        brawlerId !== body.brawlerId && upgrades.hyperCharges?.some(item => item.id === itemId));
    if (belongsToAnotherBrawler) return { error: 'That Hypercharge ID belongs to another brawler.' };

    const existing = brawler.hyperCharges?.find(item => item.id === itemId);
    if (!name && !existing) return { error: 'Enter a name for the new Hypercharge.' };

    catalogue[body.brawlerId] = {
        ...brawler,
        hyperCharges: [{ id: itemId, name: name || existing.name }]
    };

    return { catalogue, itemId };
}

function validateBrawlerUpdate(body, files = {}) {
    const {
        brawlerId,
        gadget1Id,
        gadget2Id,
        starPower1Id,
        starPower2Id
    } = body;

    if (!/^\d+$/.test(String(brawlerId || ''))) {
        throw createRequestError('Brawler ID must contain digits only.');
    }

    const optionalIds = [gadget1Id, gadget2Id, starPower1Id, starPower2Id];
    if (optionalIds.some(id => id && !/^\d+$/.test(String(id)))) {
        throw createRequestError('Gadget and Star Power IDs must contain digits only.');
    }

    const uploadedImages = [
        [files.gadget1Image?.[0], gadget1Id],
        [files.gadget2Image?.[0], gadget2Id],
        [files.starPower1Image?.[0], starPower1Id],
        [files.starPower2Image?.[0], starPower2Id]
    ];
    if (uploadedImages.some(([file, id]) => file && !id)) {
        throw createRequestError('Each gadget or Star Power image requires its matching ID.');
    }

    const hypercharge = prepareHyperchargeUpdate(body, files.hyperchargeImage?.[0]);
    if (hypercharge.error) throw createRequestError(hypercharge.error);
    return hypercharge;
}

function upsertCSVRow(filePath, id, row) {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    const [header, ...rows] = content.split('\n');
    const rowString = row.join(',');
    let updated = false;

    const newRows = rows.map(existingRow => {
        const existingId = existingRow.split(',')[0].trim();
        if (String(existingId) !== String(id)) return existingRow;

        updated = true;
        return rowString;
    });

    if (!updated) newRows.push(rowString);
    fs.writeFileSync(filePath, [header, ...newRows].join('\n') + '\n');
}

function saveImage(file, outputPath) {
    if (file) fs.writeFileSync(outputPath, file.buffer);
}

function saveBrawlerUpdate(body, files = {}) {
    const hypercharge = validateBrawlerUpdate(body, files);

    const {
        brawlerId,
        brawlerName,
        rarity,
        disabled,
        arrivingSoon,
        arrivingTime,
        gadget1Id,
        gadget1Name,
        gadget2Id,
        gadget2Name,
        starPower1Id,
        starPower1Name,
        starPower2Id,
        starPower2Name
    } = body;

    const publicFolder = path.join(repositoryRoot, 'public/assets');
    const csvFolder = path.join(publicFolder, 'csv');
    const charactersCSV = path.join(csvFolder, 'characters.csv');
    const gadgetsCSV = path.join(csvFolder, 'gadgets.csv');
    const starPowersCSV = path.join(csvFolder, 'star-powers.csv');
    const changedFiles = [charactersCSV];

    upsertCSVRow(charactersCSV, brawlerId, [
        brawlerId,
        ` ${brawlerName}`,
        disabled || '',
        arrivingSoon || '',
        arrivingTime || '',
        `./assets/brawler_portraits/${brawlerId}.png`,
        rarity
    ]);

    const upsertItem = (filePath, id, name) => {
        if (!id || !name) return;
        if (!changedFiles.includes(filePath)) changedFiles.push(filePath);
        upsertCSVRow(filePath, id, [id, `"${name}"`, brawlerId]);
    };

    upsertItem(gadgetsCSV, gadget1Id, gadget1Name);
    upsertItem(gadgetsCSV, gadget2Id, gadget2Name);
    upsertItem(starPowersCSV, starPower1Id, starPower1Name);
    upsertItem(starPowersCSV, starPower2Id, starPower2Name);

    const portraitFolder = path.join(publicFolder, 'brawler_portraits');
    const gadgetsFolder = path.join(publicFolder, 'gadgets');
    const starPowersFolder = path.join(publicFolder, 'star-powers');
    const images = [
        [files.portrait?.[0], portraitFolder, brawlerId],
        [files.gadget1Image?.[0], gadgetsFolder, gadget1Id],
        [files.gadget2Image?.[0], gadgetsFolder, gadget2Id],
        [files.starPower1Image?.[0], starPowersFolder, starPower1Id],
        [files.starPower2Image?.[0], starPowersFolder, starPower2Id]
    ];

    for (const [file, folder, id] of images) {
        if (!file) continue;
        const imagePath = path.join(folder, `${id}.png`);
        saveImage(file, imagePath);
        changedFiles.push(imagePath);
    }

    if (hypercharge.catalogue) {
        const image = files.hyperchargeImage?.[0];
        if (image) {
            const imagePath = path.join(hyperchargeFolder, `${hypercharge.itemId}.png`);
            saveImage(image, imagePath);
            changedFiles.push(imagePath);
        }

        const temporary = `${upgradesFile}.${process.pid}.tmp`;
        const entries = Object.entries(hypercharge.catalogue).map(([id, upgrades]) =>
            `    "${id}": ${JSON.stringify(upgrades)}`);
        fs.writeFileSync(temporary, `{\n${entries.join(',\n')}\n}\n`);
        fs.renameSync(temporary, upgradesFile);
        changedFiles.push(upgradesFile);
    }

    return [...new Set(changedFiles)];
}

async function prepareGitPublisher() {
    // Do not let the web update accidentally include work staged by a developer or deploy script.
    const stagedChanges = await runGit(['diff', '--cached', '--name-only']);
    if (stagedChanges.stdout.trim()) {
        throw new Error('The repository has already-staged changes. Commit or unstage them before updating brawler data.');
    }

    await runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
    await runGit(['var', 'GIT_AUTHOR_IDENT']);
    await runGit(['var', 'GIT_COMMITTER_IDENT']);
}

function repositoryRelativePaths(filePaths) {
    return [...new Set(filePaths)].map(filePath =>
        path.relative(repositoryRoot, filePath).split(path.sep).join('/')
    );
}

async function publishBrawlerUpdate(filePaths) {
    const gitPaths = repositoryRelativePaths(filePaths);
    let committed = false;

    try {
        await runGit(['add', '--', ...gitPaths]);

        const stagedChanges = await runGit(['diff', '--cached', '--name-only']);
        if (!stagedChanges.stdout.trim()) return { commitHash: null };

        await runGit(['commit', '-m', 'Update brawler data']);
        committed = true;

        const { stdout } = await runGit(['rev-parse', '--short', 'HEAD']);
        await runGit(['push']);

        return { commitHash: stdout.trim() };
    }
    catch(error) {
        if (!committed) {
            try {
                await runGit(['reset', '--', ...gitPaths]);
            }
            catch(resetError) {
                console.error('Unable to unstage brawler update files:', resetError);
            }
        }

        error.committed = committed;
        throw error;
    }
}

module.exports = {
    prepareGitPublisher,
    publishBrawlerUpdate,
    saveBrawlerUpdate,
    validateBrawlerUpdate
};
