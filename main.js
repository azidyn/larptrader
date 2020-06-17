
const LiveFeed      = require('./src/feed/Live');
const DiskFeed      = require('./src/feed/Offline');
const Backtester    = require('./src/Backtester');
const fs            = require('fs');

const MAX_HISTORICAL_BARS = 1000;

const feed = new LiveFeed();
// const feed = new DiskFeed( `${__dirname}/bars5m.json` );
const larp = new Backtester();

let series = [];

// This function called everytime a new bar closes 
// including historical data. check the `.live` property of `bar` to see if old bar or new
// `bar`:       the current bar which just closed
// `series`:    list of all bars we've received, including the most recent one
function onclose( bar, series )
{


    /* Your code here */

    console.log( bar );
}



(async()=>{

    feed.on('bar', b => {

        // Save the incoming bars in case we need them 
        series.push( b );

        // Limit memory usage 
        series = series.slice( -MAX_HISTORICAL_BARS );

        // fs.writeFileSync( './bars5m.json', JSON.stringify( series ) );

        // Update pnl calculation thing
        larp.update( b );

        // Call the user strategy code
        onclose( b, series );
        
    } );

    // `resolution`:    (optional, default='5m' ) bar length; '1m', '5m', '1h', '1d'
    // `warmup`:        (optional) request N bars of historical data to get our system started or just backtest
    // `offline`:       (optional) just terminate after sending the historical bars ( no live processing )
    await feed.start({ resolution: '1h', warmup: 500, offline: true });

    
})();


// Returns milliseconds since midnight 
const hms = date => ( Object.prototype.toString.call(date) === '[object Date]' ? date.getTime() : date ) % ( 1000 * 60 * 60 * 24 );

// Helper to get the `index`th element of an array counting backwards from the final element 
// e.g. prev( arr, 0 ) gets the last element of arr[] instead of the first 
const prev = ( array, index ) => array.length ? array[ (array.length - 1) - index ] : null; 

const percent = ( from, to ) => ((to - from) / from) * 100;
