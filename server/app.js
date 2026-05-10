require('dotenv').config();
const { response, request } = require('express');
const express = require('express');
const path = require('path');
const app = express();
const csvtojson = require('csvtojson');
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
