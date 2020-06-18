
/*

    example-live-indicators.js

    Pulls a bunch of historical data and sits waiting for new bars
    applying the indicators and displaying their output throughout.


*/


const fs            = require('fs');
const LiveFeed      = require('./src/feed/Live');
// const DiskFeed      = require('./src/feed/Offline');
const Indicators    = require('technicalindicators');


// Settings for your backtest/trading
const RESOLUTION = '1h';               // '1m', '5m', '1h', '1d'
const RUN_LIVE = true;                 // enable live feed or not (system waits for each new bar)
const HISTORICAL_BARS = 100;            // how many bars to download before running live/backtest (max 1000)
const MAX_HISTORICAL_BARS = 1000;

// const feed = new DiskFeed(__dirname+'/data/XBTUSD-1d.json');
const dp = value => value ? Number( value.toFixed(2) ) : null;

const feed = new LiveFeed();

let series = [];

console.log(`Pulling the last ${HISTORICAL_BARS} bars and then waiting for new data. Press CTRL+C to terminate.`);

// From here: https://github.com/anandanand84/technicalindicators
// Uncomment to see available indicators:
// console.log(Indicators.AvailableIndicators);

let SMA = new (Indicators['SMA'])({ period: 30, values: [] }) ;
let RSI = new (Indicators['RSI'])({ period: 14, values: [] }) ;
let ATR = new (Indicators['ATR'])({ period: 14, high: [], low: [], close: [] }) ;
let BBANDS = new (Indicators['BollingerBands'])({ period: 14, stdDev: 2, values: [] }) ;


function onclose( bar )
{

    /* 
    *
    *   Your bags-to-riches strategy code goes here 
    *
    */
    
    let atr = ATR.nextValue({ high: bar.high, low: bar.low, close: bar.close });
    let rsi = RSI.nextValue( bar.close )
    let sma = SMA.nextValue( bar.close );
    let bbands = BBANDS.nextValue( bar.close ) || {};

    console.log(`${bar.closetimestamp} | close=${bar.close} atr=${dp(atr)} rsi=${dp(rsi)} sma30=${dp(sma)} bbands_up=${dp(bbands.upper)} bbands_low=${dp(bbands.lower)} bbands_mid=${dp(bbands.middle)}`)


}






// Required system bootup boilerplate code 
(async()=>{

    feed.on('live', () => console.log('* Running live. Waiting for the current bar to close.') );

    feed.on('bar', b => {

        series.push( b );

        // Limit memory usage 
        series = series.slice( -MAX_HISTORICAL_BARS );

        // Call the user strategy code
        onclose( b );

    } );

    // `resolution`:    (optional, default='5m' ) bar length; '1m', '5m', '1h', '1d'
    // `warmup`:        (optional) request N bars of historical data to get our system started or just backtest
    // `offline`:       (optional) just terminate after sending the historical bars ( no live processing )
    await feed.start({ resolution: RESOLUTION, warmup: HISTORICAL_BARS, offline: !RUN_LIVE });

    
})();


