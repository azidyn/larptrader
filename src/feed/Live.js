
//
// Live.js 
//           Emits live data and optionally requests recent historical bars first, too.
//

const fetch = require('node-fetch');
const EventEmitter = require('../EventEmitter');
const present = require('present');
const fetch2 = require('./RobustRequest');

const BITMEX_BINS = {
    '1m': 1 * 1000 * 60,
    '5m': 5 * 1000 * 60,
    '1h': 60 * 1000 * 60,
    '1d': 24 * 60 * 1000 * 60
};

const LATENCY = 250;
const DEF_RESOLUTION = 5 * 1000 * 60;
const DEF_QUARTER_RES = DEF_RESOLUTION >> 2;
const DEF_BIN = '5m';
const DEF_SYMBOL = 'XBTUSD';
const LAG_WARNING = false;
const MAX_TRADES = 200; 
const TRADE_COLS = JSON.stringify(["timestamp","size", "price"]);
const API_URL = 'https://www.bitmex.com/api/v1/';

const POLL_DELAY = 2500;                // ms
const MAX_USER_LATENCY = 15 * 1000;     // If user module takes >= 15 seconds, abort system, assuming sys doesn't hang!
const SAFETY_TIME = 5 * 1000;           // ms
const SAFETY_TIME_WARMUP = 20 * 1000;   // ms  Note that user requests times to BitMEX etc must not exceed this figure. Can be increased but very cautiously. No more than 35s I'd say.


class Feed extends EventEmitter
{
    constructor() {

        super();

        this.opentime = 0;
        this.initialized = false;
        this.resolution = DEF_RESOLUTION;
        this.resolution4 = DEF_QUARTER_RES;
        this.bin = DEF_BIN;

    }

    async start( options ) {

        if ( options.resolution ) {
            this.resolution  = BITMEX_BINS[ options.resolution ];
            this.resolution4 = this.resolution >> 2;
            this.bin = options.resolution;
        }

        let now = Date.now();
        let remaining = (this.resolution - ( now % this.resolution )) - LATENCY;
        let showninfo = false;

        let warmup = options.warmup;

        // Make sure we've got plenty time to boot up, in case warmup bars required (below)
        if ( remaining < ( warmup ? SAFETY_TIME_WARMUP : SAFETY_TIME ) ) {
            console.log(`Insufficient remaining time to safely boot, try again after this bar closes in ${(remaining / 1000)<<0} seconds`);
            return false;
        }

        // The live bar we're going to push next once it's closed
        this.opentime = now - ( now % this.resolution );

        // Was a warmup (history) requested?
        let numbars = Math.min( 1000, warmup );

        // Pull it in...
        if ( numbars ) {

            let res, warmupbars;

            // The most recently closed bar we're looking for from bucketed trades endpoint
            let previousopentime = this.opentime - this.resolution;

            // BitMEX latency when publishing complete bars is E N O R M O U S
            // need to wait around 10 - 20 seconds after close until available, poll for it here:
            // This is only needed once at startup, when running live we use a bit of a hack for instant bar close data
            for ( let t=0; t<20; t++ )
            {
                warmupbars = await fetch2(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=false&symbol=${DEF_SYMBOL}&count=1&reverse=true`);

                // res = await fetch(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=false&symbol=${DEF_SYMBOL}&count=1&reverse=true`);
                // warmupbars = await res.json();

                if ( options.offline || ms( warmupbars[0].timestamp ) - this.resolution == previousopentime )
                    break; // we're good
 
                if ( ! showninfo ) {
                    console.log(`Waiting for BitMEX to publish latest data...`);
                    showninfo = true;
                }

                await delay( POLL_DELAY );
            }

            // res = await fetch(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=false&symbol=${DEF_SYMBOL}&count=${numbars}&reverse=true`);
            // warmupbars = await res.json();
            warmupbars = await fetch2(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=false&symbol=${DEF_SYMBOL}&count=${numbars}&reverse=true`);

            warmupbars.reverse();

            for ( let w of warmupbars ) {

                let ts = ms( w.timestamp );
                w.live = false;
                w.openepoch = ts - this.resolution;
                w.opentimestamp = dt( w.openepoch);
                w.closetimestamp = w.timestamp;
                w.retrievedtimestamp = w.closetimestamp;                
                delete w.timestamp;

                this.emit( 'bar', w );
            }

            this.emit('live');
        
        }

        // Recalculate in case warmup took ages...
        now = Date.now();
        remaining = (this.resolution - ( now % this.resolution )) - LATENCY;

        if ( !options.offline )
            setTimeout( (this.stream).bind(this), remaining );
        else
            this.emit('terminate');
        

    }

    async stream() {

        let n = Date.now();

        if ( LAG_WARNING && n > this.opentime + this.resolution ) {
            console.warn(`Warning: poll is lagging by ${n - ( this.opentime + this.resolution )}ms`)
        }
        
        let res;
        // let res = await fetch(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=true&symbol=${DEF_SYMBOL}&count=2&reverse=true`);
        // let bars = await res.json();
        let bars = await fetch2(`${API_URL}/trade/bucketed?binSize=${this.bin}&partial=true&symbol=${DEF_SYMBOL}&count=2&reverse=true`);
    
        let url = `${API_URL}/trade?symbol=${DEF_SYMBOL}&columns=${TRADE_COLS}&count=${MAX_TRADES}&reverse=true`
        
        // res = await fetch(encodeURI( url ));
        let trades = await fetch2(encodeURI( url ));
        // let trades = await res.json();
    
        // Filter trades within the bar boundary we're looking at rn
        trades = trades.filter( t => ms(t.timestamp) >= this.opentime && ms(t.timestamp) < this.opentime + this.resolution );
        let prices = trades.map( t => t.price );
    
        // Get pertinent price statistics from the last few trades
        let trade_highest = Math.max( ...prices );
        let trade_lowest = Math.min( ...prices );
        let trade_close = prices[0];
    
        let bar =  ms( bars[0].timestamp) - this.resolution != this.opentime ? bars[1] : bars[0];
    
        bar.opentimestamp = dt( this.opentime );
        
        // Patch bar with last-millisecond trades data
        bar.high = Math.max( bar.high, trade_highest );
        bar.low = Math.min( bar.low, trade_lowest );
        bar.close = trade_close;
    
        let { open, high, low, close, volume } = bar;
    
        let retrieved = dt( Date.now() );

        let writetodisk = {
            live: true,
            openepoch: this.opentime,
            opentimestamp: bar.opentimestamp,
            closetimestamp: bar.timestamp,
            retrievedtimestamp: retrieved,
            open, high, low, close, volume,        
        };
        
        let p = present();
        
        // This call potentially locks the thread so set the timer after. 
        this.emit( 'bar', writetodisk );

        if ( present() - p > MAX_USER_LATENCY ) {
            console.log(`Script processing time exceeded safe tolerance of ${MAX_USER_LATENCY}ms`);
            process.exit(1);
        }
        
        this.opentime += this.resolution;

        let now = Date.now();
        let remaining = (this.resolution - ( now % this.resolution )) - LATENCY;

        // Check previous boundary 
        if ( remaining < this.resolution4 ) remaining += this.resolution;

        // Reset a setTimeout each time to mitigate setInterval() drift 
        setTimeout( (this.stream).bind(this), remaining );
        
    }


}

module.exports = Feed;

function ms( dt )
{
    return Date.parse( dt );
}

function dt( ms )
{
    return (new Date(ms)).toISOString()
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }