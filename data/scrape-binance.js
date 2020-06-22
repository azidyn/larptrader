
/* 
    scrape.js

        Pull historical bar/candlestick data from =>>>> BINANCE _FUTURES_  <<<<<=

        NOTE:   NOT FULLY TESTED but seems ok
                should be adaptable easily to the spot api 

        usage: node scrape-binance <resolution> <number_of_days_of_data> <symbol>

        All parameters are optional

        example:

        >> node scrape 1h 30 BTCUSDT

        .... pulls the last 30 days of 1 hour bar data for BTCUSDT 

        Put in a really huge number of days to scrape all historical data
        Warning: will take a long time for 1minute bars!

        Zero error checking performed re: parameter input and api response.

*/

const fetch = require('node-fetch');
const fs    = require('fs');


// Note binance has many more ready made resolutions available: https://binance-docs.github.io/apidocs/futures/en/#public-endpoints-info
// just add them to this dictionary
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

const symbol = process.argv[4] || 'BTCUSDT';

const from = ( Date.now() - RESOLUTIONS['1d'] * days );
const start = new Date( from - ( from % RESOLUTIONS[ resolution ] ) );

console.log(`usage: node scrape <resolution> <number_of_days_of_data>`);
console.log(`Scraping ${days} days of ${resolution} bar data starting ${start.toISOString()} [UTC]`);

const delay = ms => new Promise( resolve => setTimeout( resolve, ms ));

let historical = [];

let filename = `./Binance-${symbol}-${resolution}.json`;

(async()=>{

    const MAX_PAGE_SIZE = 1500;
    const res_ms = RESOLUTIONS[ resolution ];

    let page_start = start.getTime();

    for (;;) {

        
        let url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${resolution}&startTime=${page_start}&limit=${MAX_PAGE_SIZE}`

        console.log(`Requesting: ${url}`);
        
        let res = await fetch( url );
        let bars = await res.json();

        if ( !bars.length ) {
            console.log(`No data returned.`);
            process.exit(1);
        }

        console.log(`=> Scraped ${bars.length} bars. Adding to '${filename}'. Sleeping 2.5 seconds...\n`);

        // 1499040000000,      // Open time     0
        // "0.01634790",       // Open          1
        // "0.80000000",       // High          2
        // "0.01575800",       // Low           3
        // "0.01577100",       // Close         4
        // "148976.11427815",  // Volume        5
        // 1499644799999,      // Close time    6
        // "2434.19055334",    // Quote asset volume
        // 308,                // Number of trades
        // "1756.87402397",    // Taker buy base asset volume
        // "28.46694368",      // Taker buy quote asset volume
        // "17928899.62484339" // Ignore.

        bars = bars.map( b => ({
            openepoch: b[0],
            opentimestamp: (new Date(b[0])).toISOString(),
            closetimestamp: (new Date(b[6])).toISOString(),
            retrievedtimestamp: (new Date(b[6])).toISOString(),
            open: b[1], high: b[2], low: b[3], close: b[4], volume: b[5],
        }))


        historical = historical.concat( bars );

        fs.writeFileSync( filename, JSON.stringify( historical ) );

        page_start = ( bars[ bars.length-1 ].openepoch ) + res_ms;


        // Add a request delay to avoid CZ bitchslap
        await delay( 2500 );
            
    }


})();

