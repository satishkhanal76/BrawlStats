const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { response, request } = require('express');
const express = require('express');
const app = express();
const csvtojson = require('csvtojson');

const fs = require('fs');
const multer = require('multer');

//my imports
const Player = require('./classes/Player.js');
const API = require('./classes/Api.js');
const {
    prepareGitPublisher,
    publishBrawlerUpdate,
    saveBrawlerUpdate,
    validateBrawlerUpdate
} = require('./services/brawlerUpdate.js');

const AUTO_PUBLISH_BRAWLER_UPDATES = process.env.AUTO_PUBLISH_BRAWLER_UPDATES !== 'false';

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${port}`);
});
app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html', 'htm'] }));


//serves when the client requests for player information
app.get("/api/player/:tag", async (request, response) => {
    let tag = request.params.tag
        .replace("%23", "")
        .replace("#", "")
        .toUpperCase();
    
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
        console.log("Brawl Stars API failed. Using fallback player data.", error.message);

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

let adminUpdateInProgress = false;

// Keep the shared Git index isolated while an update is being saved and published.
app.post(
    '/api/admin/brawler',
    adminRateLimit,
    upload.fields([
        { name: 'portrait', maxCount: 1 },
        { name: 'gadget1Image', maxCount: 1 },
        { name: 'gadget2Image', maxCount: 1 },
        { name: 'starPower1Image', maxCount: 1 },
        { name: 'starPower2Image', maxCount: 1 },
        { name: 'hyperchargeImage', maxCount: 1 }
    ]),
    async (request, response) => {
        if (!process.env.ADMIN_PASSWORD || request.body.password !== process.env.ADMIN_PASSWORD) {
            response.status(401).json({
                error: true,
                reason: 'Invalid password'
            });
            return;
        }

        if (adminUpdateInProgress) {
            response.status(409).json({
                error: true,
                reason: 'Another brawler update is in progress. Try again shortly.'
            });
            return;
        }

        adminUpdateInProgress = true;
        let filesSaved = false;
        try {
            validateBrawlerUpdate(request.body, request.files);
            if (AUTO_PUBLISH_BRAWLER_UPDATES) {
                await prepareGitPublisher();
            }

            const changedFiles = saveBrawlerUpdate(request.body, request.files);
            filesSaved = true;
            const result = AUTO_PUBLISH_BRAWLER_UPDATES
                ? await publishBrawlerUpdate(changedFiles)
                : null;

            response.json({
                success: true,
                message: !AUTO_PUBLISH_BRAWLER_UPDATES
                    ? 'Brawler updated successfully. Automatic Git publishing is disabled.'
                    : result.commitHash
                        ? `Brawler updated and pushed to GitHub (${result.commitHash}).`
                        : 'Brawler data is up to date; no commit was needed.'
            });
        }
        catch(error) {
            if (!error.statusCode) console.error(error);

            const reason = error.statusCode
                ? error.message
                : error.committed
                    ? 'Brawler data was saved and committed locally, but pushing to GitHub failed. Check the server logs.'
                    : filesSaved
                        ? 'Brawler data was saved on the server, but the automatic commit failed. Check the server logs.'
                        : error.message;

            response.status(error.statusCode || 500).json({
                error: true,
                reason
            });
        }
        finally {
            adminUpdateInProgress = false;
        }
    }
);
