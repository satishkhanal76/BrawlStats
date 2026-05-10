const fetch = require('node-fetch');

module.exports = class API {
    constructor(url = "") {
        this.BRAWL_API_TOKEN = process.env.BRAWL_API_TOKEN;
        this.url = url;
    }

    async postData() {
        const response = await fetch(this.url, {
            method: 'GET', // *GET, POST, PUT, DELETE, etc.
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.BRAWL_API_TOKEN}`
            }
        });
        return response.json();

    };

}