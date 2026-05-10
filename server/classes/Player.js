module.exports = class Player{
    constructor(profile = {}){
        this.updateTime();
        
        this.tag = profile.tag;
        this.name = profile.name;
        this.icon = profile.icon;
        this.nameColor = profile.nameColor;
        this.trophies = profile.trophies;
        this.expLevel = profile.expLevel;
        this.expPoints = profile.expPoints;
        this.highestTrophies = profile.highestTrophies;
        this.powerPlayPoints = profile.powerPlayPoints;
        this.highestPowerPlayPoints = profile.highestPowerPlayPoints;
        this.soloVictories = profile.soloVictories;
        this.duoVictories = profile.duoVictories;
        this.teamVictories = profile["3vs3Victories"];
        this.bestRoboRumble = profile.bestRoboRumbleTime;
        this.bestBigBrawler = profile.bestTimeAsBigBrawler;
        this.brawlers = profile.brawlers;
        this.club = profile.club;
        
    }
    updateTime(){
        this.backUpTime = Date.now();
    }
};