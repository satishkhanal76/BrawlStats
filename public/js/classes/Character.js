import { Element } from "./built_in_classes/Element.js";
import Item from "./Item.js";
export class Character {
    /**
     * Creates a Charater class that stores the data of a character
     * @param {object} character The character object with all of the data
     */
    constructor(character){
        this._paramObj = character;

        this._id = character.id;
        this._name = character.name;
        this._disabled = character.disabled;
        this._arriving_soon = character.arriving_soon;
        this._arriving_time = character.arriving_time;
        this._image_src = character.image_src;
        this._gadgets = this.#createItems(character.gadgets, "gadgets");
        this._starPowers = this.#createItems(character.starPowers, "star-powers");


        //come back to rarity object
        this._rarity = character.rarity;

        
        //character dom element 
        this._element = new Element({type: "div", attributes: {class: "character", id: this.id, name: this.name}});
        this._characterPotraitElement = new Element({type: "div", class: "character-potrait-container", parent: this._element});
        this._imageElement = new Element({type: "div", class: "character_img", parent: this._characterPotraitElement});
        this._nameElement = new Element({type: "div", class: "character-name", parent: this._characterPotraitElement});
        
        this._characterDetailsElement = new Element({type: "div", class: "character-details", parent: this._element, addType: "append"});
    }
    

    #createItems(items, filePath){
        if (!items) return [];
        return items.map((item) => new Item({...item, imageSrc: `./assets/${filePath}/${item.id}.png`}));
    }

    populateDOM(){
        if(this._rarity?.isBgImg){
            this._characterPotraitElement.element.style.backgroundImage = `url('${this._rarity.background}')`;
        }else{
            this._characterPotraitElement.element.style.backgroundColor = this._rarity?.background || "#777";
        }

        this._imageElement.element.style.backgroundImage = `url('${this._image_src}')`;
        this._nameElement.text = this.name.toUpperCase();

        this._gadgets.forEach((gadget) => {
            this._characterDetailsElement.append(gadget.create());
        });

        this._starPowers.forEach((starPower) => {
            this._characterDetailsElement.append(starPower.create());
        });
    }

    create(){
        this.populateDOM();
        return this._element;
    }

    /* Getters and Setters for Class properties */
    get id(){
        return this._id;
    }
    set id(id){
        this._id = id;
    }

    get name(){
        return this._name;
    }
    set name(name){
        this._name = name;
    }

    get disabled(){
        return this._disabled;
    }
    set disabled(disabled){
        this._disabled = disabled;
    }

    get arriving_soon(){
        return this._arriving_soon;
    }
    set arriving_soon(arriving_soon){
        this._arriving_soon = arriving_soon;
    }

    get arriving_time(){
        return this._arriving_time;
    }
    set arriving_time(arriving_time){
        this._arriving_time = arriving_time;
    }

    get image_src(){
        return this._image_src;
    }
    set image_src(image_src){
        this._image_src = image_src;
    }

    get element(){
        return this._element;
    }
    set element(element){
        this._element = element;
    }

        get gadgets(){
        return this._gadgets;
    }
    set gadgets(gadgets){
        this._gadgets = gadgets;
    }

    get starPowers(){
        return this._starPowers;
    }
    set starPowers(starPowers){
        this._starPowers = starPowers;
    }

}