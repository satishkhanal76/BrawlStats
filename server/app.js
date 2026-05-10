require('dotenv').config();
const { response, request } = require('express');
const express = require('express');
const path = require('path');
const app = express();
const csvtojson = require('csvtojson');

const fs = require('fs');
const multer = require('multer');

//my imports
const Player = require('./classes/Player.js');
const API = require('./classes/Api.js');


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
});
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html', 'htm'] }));


//serves when the client requests for player information
app.get("/api/player/:tag", async (request, response) => {
    let tag = request.params.tag;
    
    const url = `https://api.brawlstars.com/v1/players/%23${tag}`;
    const api = new API(url);

    let data;

    try {
        data = await api.postData();

        // Brawl Stars API error response
        if (data.reason || data.message || data.type) {
            throw new Error(data.reason || data.message || "Brawl Stars API Error");
        }

        const player = new Player(data);
        player.isFallbackData = false;

        response.json(JSON.stringify(player));
    }
    catch(error) {
        console.log("Brawl Stars API failed. Using fallback player data.");

        try {
            const fallbackPath = path.join(
                __dirname,
                "../public/assets/json/default-player.json"
            );

            const fs = require("fs");
            const fallbackData = JSON.parse(fs.readFileSync(
                fallbackPath,
                "utf8"
            ));

            const fallbackFileStats = fs.statSync(fallbackPath);
            const fallbackPlayer = JSON.parse(JSON.stringify(new Player(fallbackData)));

            // Use the snapshot file time instead of pretending the fallback data was fetched now.
            fallbackPlayer.backUpTime = fallbackData.backUpTime || fallbackFileStats.mtimeMs;
            fallbackPlayer.isFallbackData = true;
            fallbackPlayer.fallbackReason = error.message || "Could not load player data";

            response.json(JSON.stringify(fallbackPlayer));
        }
        catch(fallbackError) {
            response.status(500).json({
                error: true,
                reason: "Unable to load fallback player data"
            });
        }
    }
});


app.get("/api/csv/:filename", (request, response) => {
    const fileName = request.params.filename;
    const csvpath = path.join(__dirname, `../public/assets/csv/${fileName}.csv`);
    csvtojson({
        checkType: true
    }).fromFile(csvpath).then((json) => {
        response.json(JSON.stringify(json));
    }).catch(error => {
        response.status(404).send({ error });
    });

});

app.get("/api/csv/csv_logic/:filename", (request, response) => {
    const fileName = request.params.filename;
    const csvpath = path.join(__dirname, `../public/assets/csv/csv_logic/${fileName}.csv`);

    csvtojson({
        checkType: true
    }).fromFile(csvpath).then((json) => {
        response.json(JSON.stringify(json));
    });
});

app.get("/api/brawlers", async (request, response) => {
    const url = `https://api.brawlstars.com/v1/brawlers`;
    const api = new API(url);

    //get the list of brawlers from brawl stars api
    const data = await api.postData();

    // get the brawlers array from the data
    const csvpath = path.join(__dirname, `../public/assets/csv/characters.csv`);
    const csvData = await csvtojson({
        checkType: true
    }).fromFile(csvpath);

    const res = data["items"].map(brawler => {
        let csvBrawler = csvData.find(o => o.Id == brawler.id);
        if (csvBrawler) {
            return {...brawler, ...csvBrawler };
        }
        return brawler;
    });

    response.json(JSON.stringify(res));

});

app.get("/bs/:api_url", async (request, response) => {
    const api_url = request.params.api_url;
    const url = `https://api.brawlstars.com/v1/${api_url}`;
    const api = new API(url);

    const data = await api.postData();
    response.json(JSON.stringify(data));
});




/* =========================================
   ADMIN UPDATE ROUTES
========================================= */


const upload = multer({ storage: multer.memoryStorage() });

const adminRateLimitMap = new Map();
const ADMIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const ADMIN_RATE_LIMIT_MAX_REQUESTS = 5;

function adminRateLimit(request, response, next) {
    const ip = request.ip || request.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const current = adminRateLimitMap.get(ip) || {
        count: 0,
        resetAt: now + ADMIN_RATE_LIMIT_WINDOW_MS
    };

    if (now > current.resetAt) {
        current.count = 0;
        current.resetAt = now + ADMIN_RATE_LIMIT_WINDOW_MS;
    }

    current.count++;
    adminRateLimitMap.set(ip, current);

    if (current.count > ADMIN_RATE_LIMIT_MAX_REQUESTS) {
        response.status(429).json({
            error: true,
            reason: 'Too many admin update attempts. Try again later.'
        });
        return;
    }

    next();
}

function upsertCSVRow(filePath, id, row) {
    let content = fs.readFileSync(filePath, 'utf8').trim();
    const lines = content.split('\n');

    const header = lines[0];
    const rows = lines.slice(1);

    const rowString = row.join(',');

    let updated = false;

    const newRows = rows.map(existingRow => {
        const existingId = existingRow.split(',')[0].trim();

        if (String(existingId) === String(id)) {
            updated = true;
            return rowString;
        }

        return existingRow;
    });

    if (!updated) {
        newRows.push(rowString);
    }

    fs.writeFileSync(filePath, [header, ...newRows].join('\n') + '\n');
}

function saveImage(file, outputPath) {
    if (!file) return;
    fs.writeFileSync(outputPath, file.buffer);
}

app.post(
    '/api/admin/brawler',
    adminRateLimit,
    upload.fields([
        { name: 'portrait', maxCount: 1 },
        { name: 'gadget1Image', maxCount: 1 },
        { name: 'gadget2Image', maxCount: 1 },
        { name: 'starPower1Image', maxCount: 1 },
        { name: 'starPower2Image', maxCount: 1 }
    ]),
    async (request, response) => {
        try {
            if (request.body.password !== process.env.ADMIN_PASSWORD) {
                response.status(401).json({
                    error: true,
                    reason: 'Invalid password'
                });
                return;
            }

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
            } = request.body;

            const csvFolder = path.join(__dirname, '../public/assets/csv');

            const charactersCSV = path.join(csvFolder, 'characters.csv');
            const gadgetsCSV = path.join(csvFolder, 'gadgets.csv');
            const starPowersCSV = path.join(csvFolder, 'star-powers.csv');

            upsertCSVRow(charactersCSV, brawlerId, [
                brawlerId,
                ` ${brawlerName}`,
                disabled || '',
                arrivingSoon || '',
                arrivingTime || '',
                `./assets/brawler_portraits/${brawlerId}.png`,
                rarity
            ]);

            if (gadget1Id && gadget1Name) {
                upsertCSVRow(gadgetsCSV, gadget1Id, [
                    gadget1Id,
                    `"${gadget1Name}"`,
                    brawlerId
                ]);
            }

            if (gadget2Id && gadget2Name) {
                upsertCSVRow(gadgetsCSV, gadget2Id, [
                    gadget2Id,
                    `"${gadget2Name}"`,
                    brawlerId
                ]);
            }

            if (starPower1Id && starPower1Name) {
                upsertCSVRow(starPowersCSV, starPower1Id, [
                    starPower1Id,
                    `"${starPower1Name}"`,
                    brawlerId
                ]);
            }

            if (starPower2Id && starPower2Name) {
                upsertCSVRow(starPowersCSV, starPower2Id, [
                    starPower2Id,
                    `"${starPower2Name}"`,
                    brawlerId
                ]);
            }

            const portraitFolder = path.join(__dirname, '../public/assets/brawler_portraits');
            const gadgetsFolder = path.join(__dirname, '../public/assets/gadgets');
            const starPowersFolder = path.join(__dirname, '../public/assets/star-powers');

            saveImage(
                request.files?.portrait?.[0],
                path.join(portraitFolder, `${brawlerId}.png`)
            );

            saveImage(
                request.files?.gadget1Image?.[0],
                path.join(gadgetsFolder, `${gadget1Id}.png`)
            );

            saveImage(
                request.files?.gadget2Image?.[0],
                path.join(gadgetsFolder, `${gadget2Id}.png`)
            );

            saveImage(
                request.files?.starPower1Image?.[0],
                path.join(starPowersFolder, `${starPower1Id}.png`)
            );

            saveImage(
                request.files?.starPower2Image?.[0],
                path.join(starPowersFolder, `${starPower2Id}.png`)
            );

            response.json({
                success: true,
                message: 'Brawler updated successfully'
            });
        }
        catch(error) {
            console.error(error);

            response.status(500).json({
                error: true,
                reason: error.message
            });
        }
    }
);
