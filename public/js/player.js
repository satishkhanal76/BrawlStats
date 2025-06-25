import { Api } from "./classes/Api.js";
import { PlayerCharacters } from "./classes/PlayerCharacters.js";
let api;
let player;

function updatePlayer(tag) {
    api.get().then(data => {
       console.log(data)

       player = new PlayerCharacters(data.brawlers);
       player.addToDOM();
        // api.getMilestones().then(milestones => {
        //     player.loadBrawlerMilestones(milestones);
        //     player.loadPlayer(data);
        //     player.brawlers.sortByRarity();
        // });
    });
}

function checkUrl() {
    const curretUrl = window.location.href;
    const splitUrl = curretUrl.split("/player/");

    const playerTag = splitUrl[1];
    if (playerTag) {
        updatePlayer(playerTag);
    }
};


//form submit
const playerForm = document.getElementById("playerSearchForm");
const tag = document.getElementById("tag");

playerForm.addEventListener("submit", event => {
    event.preventDefault();
    let tag = document.getElementById("tag").value;
    console.log(tag)
    api = new Api(`/api/player/${tag}`);
    updatePlayer();
});
// form submit complete

//get the characters and their rarities
api.getCharaters().then(characters => {
    api.getRarities().then(rarities => {
            player.loadGeneralBrawlers(characters, rarities);
            //player.addBrawlersToDom();
    });
});

//check and request if a player tag exist in the url
checkUrl();

