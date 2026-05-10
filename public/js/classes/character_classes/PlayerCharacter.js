import { Element } from "../built_in_classes/Element.js";
import { Character } from "../Character.js";

export class PlayerCharacter extends Character {
    /**
     * Creates a Charater class that stores the data of a character
     * @param {object} character The character object with all of the data
     */
    constructor(character) {
        super(character);
        this._power = character.power;
        this._trophies = character.trophies;
        this._highestTrophies = character.highestTrophies;
        this._currentWinStreak = character.currentWinStreak;
        this._maxWinStreak = character.maxWinStreak;
        this._prestigeLevel = character.prestigeLevel;

        this._powerElement = new Element({type: "p", class: "power", parent: this._characterPotraitElement});

        //unlocked character dom elements

        this._trophiesElement = new Element({type: "p", class: "trophies", parent: this._characterDetailsElement});
        this._highestTrophiesElement = new Element({type: "p", class: "highest-trophies", parent: this._characterDetailsElement});
        this._currentWinStreakElement = new Element({type: "p", class: "current-win-streak", parent: this._characterDetailsElement});
        this._maxWinStreakElement = new Element({type: "p", class: "max-win-streak", parent: this._characterDetailsElement});
        this._prestigeLevelElement = new Element({type: "p", class: "prestige-level", parent: this._characterDetailsElement});
    }

    populateDOM(){
        super.populateDOM();

        this._powerElement.text = (`Power: ${this.power}`);

        this._trophiesElement.text = (`Trophies: ${this.trophies}`);
        this._highestTrophiesElement.text = (`Highest Trophies: ${this.highestTrophies}`);
        this._currentWinStreakElement.text = (`Current Win Streak: ${this.currentWinStreak}`);
        this._maxWinStreakElement.text = (`Max Win Streak: ${this.maxWinStreak}`);
        this._prestigeLevelElement.text = (`Prestige Level: ${this.prestigeLevel}`);
    }

    
    create(){
        super.create();
        this.populateDOM();
        return this._element;
    }

    //getter and setters
    get trophies() {
        return this._trophies;
    }
    set trophies(trophies) {
        this._trophies = trophies;
    }
    get power() {
        return this._power;
    }
    set power(power) {
        this._power = power;
    }
    get highestTrophies() {
        return this._highestTrophies;
    }
    set highestTrophies(highestTrophies) {
        this._highestTrophies = highestTrophies;
    }
    get currentWinStreak() {
        return this._currentWinStreak;
    }
    set currentWinStreak(currentWinStreak) {
        this._currentWinStreak = currentWinStreak;
    }
    get maxWinStreak() {
        return this._maxWinStreak;
    }
    set maxWinStreak(maxWinStreak) {
        this._maxWinStreak = maxWinStreak;
    }
    get prestigeLevel() {
        return this._prestigeLevel;
    }
    set prestigeLevel(prestigeLevel) {
        this._prestigeLevel = prestigeLevel;
    }
}