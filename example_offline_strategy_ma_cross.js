
/*
    Pretty much exactly the same as `example_live_strategy_ma_cross.js` except uses historical 
    offline data from a file instead of pulling directly from the exchange.
    Oh and uses daily bars with an MA30 instead.

*/



// const LiveFeed      = require('./src/feed/Live');
const DiskFeed      = require('./src/feed/Offline');
const Backtester    = require('./src/Backtester');
const fs            = require('fs');
const Indicators    = require('technicalindicators');

const MAX_HISTORICAL_BARS = 1000;

// Settings for your backtest/trading
const RESOLUTION = '1d';                // '1m', '5m', '1h', '1d'
const RUN_LIVE = true;                 // enable live trading or not
const HISTORICAL_BARS = 1000;           // how many bars to download before running live/backtest (max 1000)

// Daily bars
const filename = __dirname + '/data/XBTUSD-1d.json';

if ( !fs.existsSync( filename ) ) {
    console.log(`\nERROR: File missing ${filename}.\nGo to ./data/ folder and run: node scrape 1d 1000 XBTUSD\n`);
    process.exit(1);
}

// Data
const feed = new DiskFeed( filename );

// 'Backtest' the incoming data, can be used for Live or Offline bars
const larp = new Backtester();

larp.fees.on = true;
larp.fees.mode = 'makertaker';

let series = [];

// Simple moving average, length/period of 30
let sma = new (Indicators['SMA'])({ period: 30, values: [] }) ;

// Helper to get the `index`th element of an array counting backwards from the final element 
// e.g. prev( arr, 0 ) gets the last element of arr[] instead of the first 
const prev = ( array, index ) => array.length ? array[ (array.length - 1) - index ] : null; 


// This function called everytime a new bar closes 
// including historical data. check the `.live` property of `bar` to see if old bar or new
// `bar`:       the current bar which just closed
// `series`:    list of all bars we've received, including the most recent one
function onclose( bar, series )
{
    /*
        
        Absolutely terrible trading strategy based on simple moving average cross
        Do not trade this unless you insist on being poor.

    */

    // Get the previous bar
    let prevbar = prev( series, 1 );

    // Get the simple moving avg value for this bar's close
    let sma30 = sma.nextValue( bar.close );

    if ( !prevbar )
        return;

    // If price crossing down the 60 SMA, short
    if ( prevbar.close >= sma30 && bar.close < sma30 ) {

        if ( bar.live )
            console.log( `(live) ${ bar.closetimestamp} SHORT | ${bar.close}` );

        // side, price, stop, risk, time 
        larp.open( 'short', bar.close, null, 100, bar.closetimestamp );

    }

    // If price crossing up the 60 SMA, long
    if ( prevbar.close < sma30 && bar.close >= sma30 ) {

        if ( bar.live) 
            console.log( `(live) ${ bar.closetimestamp}  LONG | ${bar.close}` );

        larp.open( 'long', bar.close, null, 100, bar.closetimestamp );

    }
 
    if ( larp.closed ) 
        console.log( `${bar.closetimestamp} => ${larp.lasttrade.side} \t[ ${larp.won ? 'won' : (larp.lost ? 'lost' : 'even')} ] \t${larp.lasttrade.result.percent.toFixed(2)}% | Balance: ${larp.balance} XBT` );
    

}


// Required system bootup boilerplate code 
(async()=>{

    feed.on('terminate', b => {

        console.log('Finished. Result: ');

        console.log( larp.result )

        // Uncomment below to see all the trades
        // console.log( larp.trades )

    });

    feed.on('bar', b => {

        // Save the incoming bars in case we need them 
        series.push( b );

        // Limit memory usage 
        series = series.slice( -MAX_HISTORICAL_BARS );

        // fs.writeFileSync( './bars5m.json', JSON.stringify( series ) );

        // Update pnl calculation thing
        if ( larp ) larp.update( b );

        // Call the user strategy code
        onclose( b, series );

    } );

    // `resolution`:    (optional, default='5m' ) bar length; '1m', '5m', '1h', '1d'
    // `warmup`:        (optional) request N bars of historical data to get our system started or just backtest
    // `offline`:       (optional) just terminate after sending the historical bars ( no live processing )
    await feed.start({ resolution: RESOLUTION, warmup: HISTORICAL_BARS, offline: !RUN_LIVE });

    
})();


// Utility functions

// Returns milliseconds since midnight 
const hms = date => ( Object.prototype.toString.call(date) === '[object Date]' ? date.getTime() : date ) % ( 1000 * 60 * 60 * 24 );


// Calculate percentage change between two numbers
const percent = ( from, to ) => ((to - from) / from) * 100;
