/*
    
    example_live_strategy_ma_cross.js

        Demonstrates how to take historical data, run it through some strategy logic and 'backtest' its performance and 
        then continue to monitor a live price feed and apply the same strategy and backtest logic 

        So, a bit like a backtest followed by a forward test.

*/


const LiveFeed      = require('./src/feed/Live');
const Backtester    = require('./src/Backtester');
const Indicators    = require('technicalindicators');

const MAX_HISTORICAL_BARS = 1000;

// Settings for your backtest/trading
const RESOLUTION = '1h';                // '1m', '5m', '1h', '1d'
const RUN_LIVE = true;                  // enable live feed 
const HISTORICAL_BARS = 1000;           // how many bars to download before running live/backtest (max 1000)


// Data
const feed = new LiveFeed();

// 'Backtest' the incoming data, can be used for Live or Offline bars
const larp = new Backtester();

larp.fees.on = true;
larp.fees.mode = 'makertaker';

let series = [];

// Simple moving average, length/period of 60
let sma = new (Indicators['SMA'])({ period: 60, values: [] }) ;


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
    let sma60 = sma.nextValue( bar.close );

    if ( !prevbar )
        return;

    // If price crossing down the 60 SMA, short
    if ( prevbar.close >= sma60 && bar.close < sma60 ) {

        if ( bar.live )
            console.log( `(live) ${ bar.closetimestamp} SHORT | ${bar.close}` );

        // side, price, stop, risk, time 
        larp.open( 'short', bar.close, null, 100, bar.closetimestamp );

    }

    // If price crossing up the 60 SMA, long
    if ( prevbar.close < sma60 && bar.close >= sma60 ) {

        if ( bar.live) 
            console.log( `(live) ${ bar.closetimestamp}  LONG | ${bar.close}` );

        larp.open( 'long', bar.close, null, 100, bar.closetimestamp );

    }
 
    if ( larp.closed ) 
        console.log( `${bar.closetimestamp} => ${larp.lasttrade.side} [ ${larp.won ? 'won' : (larp.lost ? 'lost' : 'even')} ] ${larp.lasttrade.result.percent.toFixed(2)}% | Balance: ${larp.balance} XBT` );
    

}


// Required system bootup boilerplate code 
(async()=>{

    feed.on('live', () => console.log('* Running live. Waiting for the current bar to close.') );
    
    feed.on('terminate', b => {

        console.log('Terminated. Change    RUN_LIVE = true    to continue waiting for new data.');

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
