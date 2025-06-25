import { Api } from "../Api.js";
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
        this._rank = character.rank;
        this._rankObj = character.rankObj;
        this._rankImg;
        this._milestonesObj = character.milestonesObj;
        this._progressStart;
        this._progress;
        this._progressEnd;


        this.calculateRankImg();
        this.calculateMilestone();
        //unlocked character dom elements
        this._firstElement = new Element({type: "div", class: "first", parent: this._element, addType: "prepend"});
        this._progressElement = new Element({type: "div", class: "progress", parent: this._firstElement});
        this._progressFillElement = new Element({type: "div", class: "progress-fill", parent: this._progressElement});
        this._trophiesElement = new Element({type: "div", class: "trophies", parent: this._progressElement});
        this._trophiesNumElement = new Element({type: "div", class: "trophies-num", parent: this._trophiesElement});

        this._rankContainerElement = new Element({type: "div", class: "rank-container", parent: this._firstElement});
        this._rankElement = new Element({type: "div", class: "rank", parent: this._rankContainerElement});
        this._rankTitleElement = new Element({type: "div", class: "rank-title", parent: this._rankElement});
        this._rankNumberElement = new Element({type: "div", class: "rank-number", parent: this._rankElement});
        this._rankImgElement = new Element({type: "div", class: "rank-img", parent: this._rankElement});
    }

    populateDOM(){
        super.populateDOM();

        this._progressFillElement.element.style.width = `${this.calculateProgressWidth()}%`;

        if(this._progressEnd !== null){
            this._trophiesNumElement.text = `${this.trophies} / ${this._progressEnd}`;
        }else{
            this._trophiesNumElement.text = `${this.trophies}`;
        }

        this._rankImgElement.element.style.backgroundImage = `url('${this._rankImg}')`;
        
        this._rankTitleElement.text = "RANK";
        this._rankNumberElement.text = this.rank;
    }

    
    create(){
        super.create();
        this.populateDOM();
        return this._element;
    }

    calculateRankImg() {
        this._rankObj.find(o => {
            
            let progressEnd = o.progressStart + o.progress;
            if (this._rank >= o.progressStart && this._rank <= progressEnd) {
                this._rankImg = o.img_src;
            }
        });
    }

    calculateMilestone() {
        if (this._milestonesObj) {
            this._progressStart = this._milestonesObj.ProgressStart;
            this._progress = this._milestonesObj.Progress;
            this._progressEnd = this._progressStart + this._progress;
        } else {
            //player at the max rank with this character
            this._progressEnd = null;
        }
    }
    calculateProgressWidth(){
        let currentProgress = this.trophies - this._progressStart;
        return (currentProgress / this._progress) * 100;
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
    get rank() {
        return this._rank;
    }
    set rank(rank) {
        this._rank = rank;
    }
    get highestTrophies() {
        return this._highestTrophies;
    }
    set highestTrophies(highestTrophies) {
        this._highestTrophies = highestTrophies;
    }
}