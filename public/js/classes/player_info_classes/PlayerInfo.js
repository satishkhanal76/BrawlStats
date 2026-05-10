import { Element } from "../built_in_classes/Element.js";
import { PlayerInfoStat } from "./PlayerInfoStat.js";

export class PlayerInfo {
    constructor(playerData) {
        this._playerData = playerData;

        this._element = new Element({type: "section", class: "player-info"});
        this._headerElement = new Element({type: "div", class: "player-info-header", parent: this._element});
        this._nameElement = new Element({type: "h1", class: "player-name", parent: this._headerElement});
        this._tagElement = new Element({type: "p", class: "player-tag", parent: this._headerElement});
        this._statsElement = new Element({type: "div", class: "player-info-stats", parent: this._element});
    }

    populateDOM() {
        this._nameElement.text = this._playerData.name;
        this._nameElement.element.style.color = `#${this._playerData.nameColor.replace('0x', '')}` || "#fff";
        this._tagElement.text = this._playerData.tag;

        this.#addStat("Trophies", this._playerData.trophies);
        this.#addStat("Highest Trophies", this._playerData.highestTrophies);
        this.#addStat("XP Level", this._playerData.expLevel);
        this.#addStat("3v3 Victories", this._playerData["teamVictories"]);
        this.#addStat("Solo Victories", this._playerData.soloVictories);
        this.#addStat("Duo Victories", this._playerData.duoVictories);
        this.#addStat("Last Updated", this.#formatBackupTime(this._playerData.backUpTime));

        if (this._playerData.club?.name) {
            this.#addStat("Club", this._playerData.club.name);
        }
    }

    #addStat(label, value) {
        const stat = new PlayerInfoStat(label, value);
        this._statsElement.append(stat.create());
    }

    #formatBackupTime(backUpTime) {
        if (!backUpTime) return "--";

        const milliseconds = Number(backUpTime);
        const date = new Date(milliseconds);

        if (Number.isNaN(date.getTime())) return "--";

        return date.toLocaleString();
    }

    create() {
        this.populateDOM();
        return this._element;
    }
}