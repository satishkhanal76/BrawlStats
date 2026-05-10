import { Characters } from "./Characters.js";
import { ArrayList } from "./built_in_classes/ArrayList.js";
import { Element } from "./built_in_classes/Element.js";
import { PlayerCharacter } from "./character_classes/PlayerCharacter.js";

export class PlayerCharacters extends Characters {
    /**
     * Creates a Player Charaters class that stores all of Player Character classes
     * @param {object} characters The characters data in an array(Optional)
     */
    constructor(characters) {
        super();
        this._paramObj = characters;



        this._unlockedCharacters = new ArrayList();
        this._remainingCharacters = new ArrayList();
        this._arrivingCharacters = new ArrayList();

        //count of the characters
        this._totalUnlocked;
        this._totalRemaining;
        this._totalArriving;
        this._totalPossible;

        //characters DOM
        this._unlockedCharactersElement = new Element({type: "div", class: "characters-unlocked-container", parent: this.element});
        this._remainingCharactersElement = new Element({type: "div", class: "characters-remaining-container", parent: this.element});
        this._arrivingCharactersElement = new Element({type: "div", class: "characters-arriving-container", parent: this.element});
        this._unlockedTitleElement = new Element({type: "div", class: "characters-unlocked-title", parent: this._unlockedCharactersElement});
        this._remainingTitleElement = new Element({type: "div", class: "characters-remaining-title", parent: this._remainingCharactersElement});
        this._arrivingTitleElement = new Element({type: "div", class: "characters-arriving-title", parent: this._arrivingCharactersElement});
        this._unlockedElement = new Element({type: "div", class: "characters-unlocked", parent: this._unlockedCharactersElement});
        this._remainingElement = new Element({type: "div", class: "characters-remaining", parent: this._remainingCharactersElement});
        this._arrivingElement = new Element({type: "div", class: "characters-arriving", parent: this._arrivingCharactersElement});
    }

    addToDOM() {
        this.addTitles();
        this._unlockedCharacters.forEach(character => {
            this._unlockedElement.append(character.create());
            
        });
        this._remainingCharacters.forEach(character => {
            this._remainingElement.append(character.create());
        });
        this._arrivingCharacters.forEach(character => {
            this._arrivingElement.append(character.create());
        });
        return this._element;
    }

    addTitles() {
        if(this._unlockedCharacters.length !== 0){
            this._unlockedTitleElement.text = `Unlocked Brawlers (${this._totalUnlocked}/ ${this._totalPossible})`;
        }

        if(this._remainingCharacters.length !== 0){
            this._remainingTitleElement.text = `Remaining Brawlers (${this._totalRemaining})`;
        }

        if(this._arrivingCharacters.length !== 0){
            this._arrivingTitleElement.text = `Arriving Brawlers (${this._totalArriving})`;
        }
    }
    
    populateArrays() {
        super.populateArrays();

        this._unlockedCharacters = new ArrayList();
        this._remainingCharacters = new ArrayList();
        this._arrivingCharacters = new ArrayList();

        const playerCharacterMap = new Map(
            this._paramObj.map((playerCharacter) => [String(playerCharacter.id), playerCharacter])
        );

        this._characters.forEach((char) => {
            const playerCharacter = playerCharacterMap.get(String(char.id));

            if (!playerCharacter) {
                this._remainingCharacters.push(char);
                return;
            }

            const object = {
                ...char._paramObj,
                ...playerCharacter,
                gadgets: this.#markUnlockedItems(char._paramObj.gadgets, playerCharacter.gadgets),
                starPowers: this.#markUnlockedItems(char._paramObj.starPowers, playerCharacter.starPowers)
            };

            const character = new PlayerCharacter(object);
            this._unlockedCharacters.push(character);
        });

        this.arrivingCheck();
        this.calculateTotals();
}

    #markUnlockedItems(allItems, unlockedItems) {
        if (!allItems) return [];
        if (!unlockedItems) return allItems.map((item) => ({...item, unlocked: false}));

        return allItems.map((item) => {
            const isUnlocked = unlockedItems.some((unlockedItem) => unlockedItem.id == item.id);
            return {...item, unlocked: isUnlocked};
        });
    }

    arrivingCheck() {
        //need to loop backwards (When removing element the loop skips over an element)
        for (var i = this._remainingCharacters.length - 1; i >= 0; i--) {
            const character = this._remainingCharacters[i];

            if (!this.#isStillArriving(character)) continue;

            this._arrivingCharacters.push(character);
            this._remainingCharacters.remove(character);
        }
    }

    #isStillArriving(character) {
        if (!character.arriving_soon) return false;
        if (!character.arriving_time) return true;

        const arrivingTimestamp = Number(character.arriving_time);
        const arrivingTime = arrivingTimestamp < 10000000000
            ? arrivingTimestamp * 1000
            : arrivingTimestamp;

        if (Number.isNaN(arrivingTime)) return true;

        return arrivingTime > Date.now();
    }
    calculateTotals() {
        super.calculateTotals();
        this._totalUnlocked = this._unlockedCharacters.length;
        this._totalRemaining = this._remainingCharacters.length;
        this._totalArriving = this._arrivingCharacters.length;
        this._totalPossible = this._totalUnlocked + this._totalRemaining;
    }


    get totalUnlocked() {
        return this._totalUnlocked;
    }
    get totalPossible() {
        return this._totalPossible;
    }
    get totalRemaining() {
        return this._totalRemaining;
    }
    get totalArriving() {
        return this._totalArriving;
    }
    set paramObj(obj) {
        this._paramObj = obj;
    }
}

// const characters = new PlayerCharacters();
// characters.load();



// async function loadPlayer(tag) {
//     tag = tag.replace("#", "");
//     const player = new Api(`/api/player/${tag}`);
//     const data = await player.get();

//     const characterObj = await data.brawlers;
//     characters.paramObj = await characterObj;
//     //can only run these characters methods after the data is received from the server
//     await characters.loaded().then(() => {
//         characters.populateArrays();
//         characters.addToDOM();
//         document.body.append(characters.element.element);
//     })
// }

//  loadPlayer("#82jjvprul");
