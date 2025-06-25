export class Api {
    /**
     * Use Api class to fetch data from the server
     * @param {object} url Link to the server route to fetch data from
     */
    constructor(url = "") {
        this._promise;
        this._url = decodeURI(url);
        this._response;
    }

    /**
     * get() fetches to the server using the url in the property
     * @returns Promise
     */
    get() {
        this._promise = new Promise(async (resolve, reject) => {
            fetch(this._url, {
                method: 'GET', // *GET, POST, PUT, DELETE, etc.
                headers: {
                    'Accept': 'application/json'
                }
            }).then(response => {
                if (response.status !== 200) {
                    return reject({error: true, response});
                } else {
                    return response.json();
                }
            }).then(data => {
                this._response = data;
                this.parse();
                return resolve(this._response);
            }).catch(err => {
                return reject(err);
            });
        });
        return this._promise;
    }

    parse() {
        this._response = JSON.parse(this._response);
        if (this._response instanceof Object) {
            return this._response;
        } else {
            this.parse();
        }
    }
    
    /**
     * @returns A promise after a call to the server was made
     */
    loaded(){
        return this._promise;
    }
    get url() {
        return this._url;
    }
    set url(url) {
        this._url = encodeURI(url);
    }

    get response() {
        return this._response;
    }
    set response(response) {
        this._response = response;
    }

    get promise() {
        return this._promise;
    }
    set promise(promise) {
        this._promise = promise;
    }

}