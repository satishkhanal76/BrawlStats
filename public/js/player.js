import { Api } from "./classes/Api.js";
import { PlayerCharacters } from "./classes/PlayerCharacters.js";
import { PlayerInfo } from "./classes/player_info_classes/PlayerInfo.js";

let player;

async function updatePlayer(tag) {
    const api = new Api(`./api/player/${tag}`);

    console.log(api);

    const playerData = await api.get();

    if (playerData.isFallbackData) {

    alert(

        `Could not load player data. Using fallback snapshot instead.\n(${playerData.fallbackReason})`

    );

}
    const playerInfo = new PlayerInfo(playerData);
    console.log(playerData);
    const playerCharacters = new PlayerCharacters(playerData.brawlers);
    playerCharacters.load();
    await playerCharacters.loaded();

    playerCharacters.populateArrays();
    playerCharacters.addToDOM();

    document.getElementById('main-content').append(playerInfo.create().element);
    document.getElementById('main-content').append(playerCharacters.element.element);

}

function checkUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerTag = urlParams.get('tag').replace('%23', '').replace('#', '');

    if (playerTag) {
        updatePlayer(playerTag);
    }else {
        alert('No player tag provided in URL');
    }
};

//check and request if a player tag exist in the url
checkUrl();
