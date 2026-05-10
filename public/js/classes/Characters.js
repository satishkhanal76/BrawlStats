import { ArrayList } from "./built_in_classes/ArrayList.js";
import { Element } from "./built_in_classes/Element.js";
import { Api } from "./Api.js";
import { Character } from "./Character.js";

export class Characters {
    /**
     * Creates a Charaters class that stores all of Character classes
     * 
     */
    constructor() {
        //keeps track of all of the requests promises
        this._promises = new ArrayList();
        //apis to get all of the characters and rarity
        this._api = new Api("./api/csv/characters");
        this._rarityApi = new Api("./api/csv/rarities");
        this._gadgetsApi = new Api("./api/csv/gadgets");
        this._starPowersApi = new Api("./api/csv/star-powers");

        this._characters = new ArrayList();
        this._total;

        //characters DOM element
        this._element = new Element({ type: "div", class: "characters" });
        this._charactersTitle = new Element({ type: "div", class: "characters-title", parent: this._element });
        this._charactersElement = new Element({ type: "div", class: "characters-all", parent: this._element });
    }

    load() {
        //check if calls were made
        this._promises.push(this._api.get());
        this._promises.push(this._rarityApi.get());
        this._promises.push(this._gadgetsApi.get());
        this._promises.push(this._starPowersApi.get());
        return Promise.all(this._promises);
    }

    /**
     * @returns A promise after all the promises in this class have been fulfilled or rejected
     */
    loaded() {
        return Promise.all(this._promises);
    }

    /**
     * @param 
     * @returns 
     */
    populateArrays() {
        this._api.response.forEach(characterObj => {
            let rarity = this.getRarity(characterObj);//get the rarity 
            characterObj.rarity = rarity; //add rarity object to the character object
            characterObj.gadgets = this.getCharacterGadgets(characterObj.id);
            characterObj.starPowers = this.getCharacterStarPowers(characterObj.id);

            let character = new Character(characterObj);
            this._characters.push(character);
        });

        this.disabledCheck();
        this.calculateTotals();
    }
    disabledCheck() {
        //need to loop backwards (When removing element the loop skips over an element)
        for (var i = this._characters.length - 1; i >= 0; i--) {
            let character = this._characters[i];
            if (character.disabled) {
                this._characters.remove(character);
            }
        }
    }
    

    addToDOM() {
        this.addTitles();
        this._characters.forEach(character => {
            this._charactersElement.append(character.create());
        });
    }

    addTitles() {
        if (this._characters.length !== 0) {
            this._charactersTitle.text = `Brawlers (${this._total})`;
        }
    }

    getRarity(character) {
        return this._rarityApi.response.find(o => o.rarity == character.rarity);
    }

    getCharacterGadgets(characterId) {
        return this._gadgetsApi.response
            .filter((gadget) => gadget.characterId == characterId)
            .map((gadget) => ({
                ...gadget,
                image_src: `./assets/gadgets/${gadget.id}.png`
            }));
    }

    getCharacterStarPowers(characterId) {
        return this._starPowersApi.response
            .filter((starPower) => starPower.characterId == characterId)
            .map((starPower) => ({
                ...starPower,
                image_src: `./assets/star-powers/${starPower.id}.png`
            }));
    }

    calculateTotals() {
        this._total = this._characters.length;
    }
    get element() {
        return this._element;
    }

    set element(element) {
        this._element = element;
    }
    get characters() {
        return this._characters;
    }

    set characters(characters) {
        this._characters = characters;
    }
}
