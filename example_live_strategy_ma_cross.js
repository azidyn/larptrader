
const LiveFeed      = require('./src/feed/Live');
const Backtester    = require('./src/Backtester');
const fs            = require('fs');
const Indicators    = require('technicalindicators');

// Uncomment to see available indicators:
// console.log( Indicators.AvailableIndicators )

const MAX_HISTORICAL_BARS = 1000;

// Settings for your backtest/trading
const RESOLUTION = '1h';                // '1m', '5m', '1h', '1d'
const RUN_LIVE = false;                 // enable live trading or not
const HISTORICAL_BARS = 1000;           // how many bars to download before running live/backtest (max 1000)


const feed = new LiveFeed();

// 
const larp = new Backtester();

larp.fees.on = true;
larp.fees.side = 'makertaker';

let series = [];

// Simple moving average, length/period of 10 
let sma = new (Indicators['SMA'])({ period: 60, values: [] }) ;


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

    if ( !prevbar )
        return;

    // Get the simple moving avg value for this bar's close
    let sma60 = sma.nextValue( bar.close );

    // If price crossing down the 60 SMA, short
    if ( prevbar.close >= sma60 && bar.close < sma60 ) {

        if ( bar.live )
            console.log( `(live) ${ bar.closetimestamp} SHORT | ${bar.close}` );

        larp.open( 'short', bar.close, null, 100, bar.closetimestamp );

    }

    // If price crossing up the 60 SMA, long
    if ( prevbar.close < sma60 && bar.close >= sma60 ) {

        if ( bar.live) 
            console.log( `(live) ${ bar.closetimestamp}  LONG | ${bar.close}` );

        larp.open( 'long', bar.close, null, 100, bar.closetimestamp );

    }
 
    if ( larp.closed ) 
        console.log( `=> ${larp.lasttrade.side} [ ${larp.won ? 'won' : (larp.lost ? 'lost' : 'even')} ] ${larp.lasttrade.result.percent.toFixed(2)}% | Balance: ${larp.balance} XBT` );
    

}


// Required system bootup boilerplate code 
(async()=>{

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

// Helper to get the `index`th element of an array counting backwards from the final element 
// e.g. prev( arr, 0 ) gets the last element of arr[] instead of the first 
const prev = ( array, index ) => array.length ? array[ (array.length - 1) - index ] : null; 

// Calculate percentage change between two numbers
const percent = ( from, to ) => ((to - from) / from) * 100;
