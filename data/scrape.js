
/* 
    scrape.js

        Pull historical bar/candlestick data from BitMEX 

        usage: node scrape <resolution> <number_of_days_of_data> <symbol>

        All parameters are optional

        example:

        >> node scrape 1h 30 XBTUSD

        .... pulls the last 30 days of 1 hour bar data for XBTUSD 

        Put in a really huge number of days to scrape all historical data
        Warning: will take a long time for 1minute bars!

        Zero error checking performed re: parameter input and api response.

*/

const fetch = require('node-fetch');
const fs    = require('fs');

const RESOLUTIONS = {
    '1m': 1 * 1000 * 60,
    '5m': 5 * 1000 * 60,
    '1h': 60 * 1000 * 60,
    '1d': 24 * 60 * 1000 * 60
};


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

    let page_start = start;

    for (;;) {
        
        let url = `https://www.bitmex.com/api/v1/trade/bucketed?binSize=${resolution}&partial=false&symbol=${symbol}&count=${MAX_PAGE_SIZE}&reverse=false&startTime=${encodeURI(page_start.toISOString())}`;

        console.log(`Requesting: ${url}`);
        
        let res = await fetch( url );
        let bars = await res.json();

        if ( !bars.length ) {
            console.log(`No data returned.`);
            process.exit(1);
        }

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

        page_start = new Date( Date.parse( bars[ bars.length - 1 ].closetimestamp ) + res_ms );

        if ( page_start.getTime() > Date.now() ) 
            break;

        // Add a request delay to avoid Arthur bitchslap
        await delay( 2500 );
            
    }


})();

