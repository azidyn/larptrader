

// Simple simulated trading module for backtesting
// Allows you to create simulated paper trades 

class Backtester
{
    constructor() {

        this.fees = {
            on: true,
            taker: 0.075 / 100,         // BitMEX taker fees = 0.075%
            maker: 0.025 / 100,         // 
            side: 'makertaker'          // 'makertaker': one of each, 'maker': limit orders both sides, 'taker': market orders both sides
        };
        
        this.stopped = false;
        this.closed =  false;
        this.lost = false;
        this.won = false;
        this.even = false;

        this.balance = 1;
        this.trade = null;
        this.trades = [];

        this.dailywon = 0;
        this.dailylost = 0;
        this.dailytrades = 0;
        this.dailyeven = 0;

        this.lastbardate = null;

    }

    open( side, price, stop, risk, timestamp ) {

        this.dailytrades++;

        // Close any open trades
        if ( this.trade )
            this._close_position( price, timestamp, false );

        this.trade = {
            side: side,
            entry: price,
            stop: stop,
            risk: risk,
            size: stop ? this._size_by_stop_risk( risk, price, stop ) : ( this. balance * ( risk / 100 ) ) ,
            opentimestamp: timestamp,
            closetimestamp: null,
            result: { },
            meta: { }
        };

    }

    get lasttrade () {
        return this.trades.length ? this.trades[ this.trades.length -1 ] : null;
    }

    close( price, timestamp ) {

        if ( !this.trade ) 
            return null;

        this._close_position( price, timestamp, false );

    }

    tightenstop( price ) {

        if ( this.trade && this.trade.side == 'long' )
            this.trade.stop = Math.max( this.trade.stop, price );
        else if ( this.trade && this.trade.side == 'short' )
            this.trade.stop = Math.min( this.trade.stop, price );
            
    }

    // Check for stop outs etc.
    update( bar )  {

        // Test if this is new day or not to reset intraday statistics
        if ( this.lastbardate ) {

            let d = new Date( Date.parse( bar.opentimestamp ) );

            if ( !sameday( this.lastbardate, d )) {

                this.dailywon = 0;
                this.dailylost = 0;
                this.dailytrades = 0;
                this.dailyeven = 0;

                this.lastbardate = d;

            }

        }

        this.stopped = false;
        this.closed = false;
        this.lost = false;
        this.won = false;
        this.even = false;
            
        if ( !this.trade || !this.trade.stop )  
            return;
        
        if ( this.trade.side == 'long' )
        {
            if ( bar.low <= this.trade.stop )
                this._close_position( this.trade.stop, bar.closetimestamp, true );
        
        } else if ( this.trade.side == 'short' ) {

            if ( bar.high >= this.trade.stop ) {
                this._close_position( this.trade.stop, bar.closetimestamp, true );
            }
        
        }


    }

    _close_position( price, timestamp, stopped=false ) {
                        
        this.trade.closetimestamp = timestamp;
        this.trade.exit = price;

        let pnl = this._calc_pnl_xbt( this.trade.side, this.trade.entry, this.trade.exit, this.trade.size );
        
        let startbal = this.balance;

        this.balance += pnl;

        this.closed = true;
        this.stopped = stopped;
        this.won = pnl > 0;
        this.lost = pnl < 0;
        this.even = pnl == 0;

        if ( this.won ) this.dailywon++;
        if ( this.lost ) this.dailylost++;
        if ( this.even ) this.dailyeven++;

        this.trade.result = {
            stopped: stopped,
            exit: this.trade.exit,
            profit: pnl,
            percent: percent( startbal, this.balance ),
            balance: { before: startbal, after: this.balance }
        }

        this.trades.push( this.trade );

        this.trade = null;

    }

    _calc_pnl_xbt( side, entry, exit, size ) {

        let contracts = Math.round( size * entry );
        let exit1 = 1 / exit;
        let entry1 = 1 / entry;
        return  side == 'short' ? ( exit1 - entry1 ) * contracts : ( entry1 - exit1 ) * contracts; // == XBT pnl

    }

    _size_by_stop_risk( risk, entry, stop ) {
        let size_risk = this.balance * ( risk / 100 );
        let range = Math.abs( entry - stop );
        return entry * ( size_risk / range );
    }

}

// Javascript datetime support is retarded kek
const sameday = (first, second) =>
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate();

const percent = ( from, to ) => ((to - from) / from) * 100;

module.exports = Backtester;