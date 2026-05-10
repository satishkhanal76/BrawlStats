
import { Element } from "./built_in_classes/Element.js";

export default class Item {
    constructor(item){
        this._paramObj = item;
        this._id = item.id;
        this._name = item.name;
        this._imageSrc = item.imageSrc || item.image_src;
        this._element = new Element({type: "div", class: "item"});
        this._imageElement = new Element({type: "div", class: "item-img", parent: this._element});
        this._nameElement = new Element({type: "p", class: "item-name", parent: this._element});
        this._unlocked = item.unlocked || false;
    }

    populateDOM(){
        this._imageElement.element.style.backgroundImage = `url('${this.imageSrc}')`;
        this._nameElement.text = this.name;
        this._element.element.classList.toggle("unlocked", this.unlocked);
        this._element.element.classList.toggle("locked", !this.unlocked);
    }

    create(){
        this.populateDOM();
        return this._element;
    }

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

    get imageSrc(){
        return this._imageSrc;
    }
    set imageSrc(imageSrc){
        this._imageSrc = imageSrc;
    }

    get unlocked(){
        return this._unlocked;
    }
    set unlocked(unlocked){
        this._unlocked = unlocked;
    }

    get element(){
        return this._element;
    }
    set element(element){
        this._element = element;
    }
}