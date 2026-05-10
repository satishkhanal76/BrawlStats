import { Element } from "../built_in_classes/Element.js";

export class PlayerInfoStat {
    constructor(label, value) {
        this._label = label;
        this._value = value;

        this._element = new Element({type: "div", class: "player-info-stat"});
        this._labelElement = new Element({type: "span", class: "player-info-stat-label", parent: this._element});
        this._valueElement = new Element({type: "span", class: "player-info-stat-value", parent: this._element});
    }

    populateDOM() {
        this._labelElement.text = this._label;
        this._valueElement.text = this._value ?? "--";
    }

    create() {
        this.populateDOM();
        return this._element;
    }
}