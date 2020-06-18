
/*

    example_bitmex_trading.js

    Shows how to execute a trade on BitMEX

    Note that the bar feed comes from the real/live BitMEX not testnet

    Do *** N O T *** trade this on anything but a testnet account with 1 contract.

*/


const LiveFeed      = require('./src/feed/Live');
const BitMEX        = require('./exchange/BitMEX');
const config        = require('./config');

if ( !config.key.testnet.id ) {
    console.warn(`No testnet API key set in config.js`);
    process.exit( 1 );
}
    
// Settings for your backtest/trading
const RESOLUTION = '5m';               // '1m', '5m', '1h', '1d'
const RUN_LIVE = true;                 // enable live feed or not (system waits for each new bar)
const TRADE_LIVE = true;               // enable live trading on the exchange
const HISTORICAL_BARS = 10;            // how many bars to download before running live/backtest (max 1000)
const MAX_HISTORICAL_BARS = 1000;

const feed = new LiveFeed();
const bitmex = new BitMEX({ livenet: false, id: config.key.testnet.id, secret: config.key.testnet.secret });

let series = [];

async function onclose( bar ) { // <== Note this function needs to be declaredd async to trade on the exchange

    let green = bar.close > bar.open;
    let red = bar.close < bar.open;
    let flat = bar.close == bar.open;

    // !!!!!!!!!!!!! IMPORTANT !!!!!!!!!!!!!
    // Make sure bar.live == true before trying to place orders otherwise the historical data will be traded 
    // and BitMEX will ban your account for placing too many orders

    if ( bar.live && TRADE_LIVE  ) {

        // Long every green bar
        if ( green ) {

            await bitmex.marketclose( 'XBTUSD' );
            await bitmex.marketorder( 'XBTUSD', 'Buy', 1 );

            console.log( `BUY 1 contract @ ${bar.close}` );

        }

        // Short every red bar
        if ( red ) {

            await bitmex.marketclose( 'XBTUSD' );
            await bitmex.marketorder( 'XBTUSD', 'Sell', 1 );

            console.log( `SELL 1 contract @ ${bar.close}` );

        }
    
    } else {

        console.log( `${ bar.live ? 'LIVE => ' :'' }${bar.opentimestamp} open=${bar.open} high=${bar.high} low=${bar.low} close=${bar.close}`);

    }
    
    

}






// Required system bootup boilerplate code 
(async()=>{

    feed.on('live', () => console.log('* Running live. Waiting for the current bar to close. Press CTRL+C to terminate.') );

    feed.on('bar', async b => {

        series.push( b );

        // Limit memory usage 
        series = series.slice( -MAX_HISTORICAL_BARS );

        // Write incoming data to disk if you wish
        //fs.writeFileSync( './bars.json', JSON.stringify( series ) );

        // Call the user strategy code
        await onclose( b );   // <== Note need to await this call if trading live

    } );

    // `resolution`:    (optional, default='5m' ) bar length; '1m', '5m', '1h', '1d'
    // `warmup`:        (optional) request N bars of historical data to get our system started or just backtest
    // `offline`:       (optional) just terminate after sending the historical bars ( no live processing )
    await feed.start({ resolution: RESOLUTION, warmup: HISTORICAL_BARS, offline: !RUN_LIVE });

    
})();
