
import { Element } from "./built_in_classes/Element.js";

export default class Item {
    constructor(item){
        this._id = item.id;
        this._name = item.name;
        this._imageSrc = item.imageSrc || item.image_src;
        this._unlocked = item.unlocked || false;

        this._element = new Element({ type: "button", attributes: { type: "button", class: "item" } });
        this._imageElement = new Element({ type: "span", class: "item-img", parent: this._element });
        this._nameElement = new Element({
            type: "span", attributes: { class: "item-name", "aria-hidden": "true" }, parent: this._element
        });

        this._icon = document.createElement("img");
        this._icon.alt = "";
        this._icon.loading = "lazy";
        this._icon.addEventListener("error", () => {
            this._icon.hidden = true;
            this._imageElement.text = item.iconFallback || "?";
        });
        this._imageElement.element.append(this._icon);

        const button = this._element.element;
        button.addEventListener("click", () => button.focus({ preventScroll: true }));
        button.addEventListener("keydown", (event) => {
            if (event.key === "Escape") button.blur();
        });
    }

    populateDOM(){
        if (this._icon.getAttribute("src") !== this.imageSrc) {
            this._icon.hidden = false;
            this._imageElement.text = "";
            this._icon.src = this.imageSrc;
        }
        this._nameElement.text = this.name;
        this._element.element.setAttribute("aria-label", `${this.name}, ${this.unlocked ? "unlocked" : "locked"}`);
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