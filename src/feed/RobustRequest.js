
// Continuously attempts to fetch a url 

const fetch = require('node-fetch');

const INITIAL_RETRY_DELAY = 500; // ms
const BACK_OFF_SCALE = 1.5;
const BACK_OFF_START = 3;    
const MAX_DELAY = 15000; // 15 seconds
const MAX_ATTEMPTS = 20;

module.exports = async url => {

    let wait = INITIAL_RETRY_DELAY;
    let attempt = 0;

    for (;;) {
        try { 

            attempt++;
            
            let r = await fetch( url );
            return await r.json();

        } catch ( e ) {

            console.log(`${(new Date()).toISOString()} Retrying ${url}...`);

            await delay( wait<<0 );

            if ( attempt >= BACK_OFF_START ) 
                wait *= BACK_OFF_SCALE;
                        
            if ( wait > MAX_DELAY || attempt >= MAX_ATTEMPTS) 
                throw `Request failed after ${attempt} attempts with ${wait} back off delay. Unable to recover. ` + e;

        }
    }

}



function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}