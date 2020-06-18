
const fetch = require('node-fetch');
const fs    = require('fs');

const RESOLUTIONS = {
    '1m': 1 * 1000 * 60,
    '5m': 5 * 1000 * 60,
    '1h': 60 * 1000 * 60,
    '1d': 24 * 60 * 1000 * 60
};

/* 

    Pull historical bar/candlestick data from BitMEX 

    usage: node scrape <resolution> <number_of_days_of_data> <symbol>

    All parameters are optional

    example:

    >> node scrape 1h 30 XBTUSD

    .... pulls the last 30 days of 1 hour bar data for XBTUSD 

*/

// options 1m, 5m, 1h, 1d
const resolution = process.argv[2] || '1h';

// Whatever 
const days = Number(process.argv[3]) || 14;

const symbol = process.argv[4] || 'XBTUSD';

const from = ( Date.now() - RESOLUTIONS['1d'] * days );
const start = new Date( from - ( from % RESOLUTIONS[ resolution ] ) );

console.log(`usage: node scrape <resolution> <number_of_days_of_data>`);
console.log(`Scraping ${days} days of ${resolution} bar data starting ${start.toISOString()} [UTC]`);

const delay = ms => new Promise( resolve => setTimeout( resolve, ms ));

let historical = [];

let filename = `./${symbol}-${resolution}.json`;

(async()=>{

    const MAX_PAGE_SIZE = 1000;
    const res_ms = RESOLUTIONS[ resolution ];
    const now = new Date();

    let page_start = start;

    for (;;) {
        
        let url = `https://www.bitmex.com/api/v1/trade/bucketed?binSize=${resolution}&partial=false&symbol=${symbol}&count=${MAX_PAGE_SIZE}&reverse=false&startTime=${encodeURI(page_start.toISOString())}`;
        
        let res = await fetch( url );
        let bars = await res.json();

        console.log(`Requesting: ${url}`);
        console.log(`=> Scraped ${bars.length} bars. Adding to '${filename}'. Sleeping 2.5 seconds...\n`);

        // Clarify timestamps
        for ( let b of bars ) {
            b.openepoch = Date.parse( b.timestamp ) - res_ms;
            b.opentimestamp = (new Date( b.openepoch )).toISOString() ; // Bitmex `timestamp` is the slightly unconventional CLOSE time of the bar
            b.closetimestamp = b.timestamp;
            b.retrievedtimestamp = b.timestamp;
            delete b.timestamp;
        }

        historical = historical.concat( bars );

        fs.writeFileSync( filename, JSON.stringify( historical ) );

        await delay( 2500 );

        page_start = new Date( page_start.getTime() + ( MAX_PAGE_SIZE * res_ms ) );

        if ( page_start.getTime() > now.getTime() ) 
            break;
 
    }


})();

