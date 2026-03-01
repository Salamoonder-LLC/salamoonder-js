import { Client, SalamoonderSession, APIError, MissingAPIKeyError, SessionCookies } from './client.js';
import { Tasks } from './tasks.js';
import { AkamaiWeb, AkamaiSBSD } from './utils/akamai.js';
import { Datadome } from './utils/datadome.js';
import { Kasada } from './utils/kasada.js';

export class Salamoonder {
    constructor(apiKey) {
        this._client = new SalamoonderSession(apiKey);
        this.task = new Tasks(this._client);
        this.akamai = new AkamaiWeb(this._client);
        this.akamai_sbsd = new AkamaiSBSD(this._client);
        this.datadome = new Datadome(this._client);
        this.kasada = new Kasada(this._client);
    }

    get(url, options = {}) { return this._client.get(url, options); }
    post(url, options = {}) { return this._client.post(url, options); }
    get session() { return this._client.session; }
}

export { Client, APIError, MissingAPIKeyError, Tasks };
export { SalamoonderSession, SessionCookies };
export { AkamaiWeb, AkamaiSBSD, Datadome, Kasada };
export default Salamoonder;
