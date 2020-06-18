
const EventEmitter = require('../EventEmitter');

class DiskFeed extends EventEmitter
{
    constructor( file ) {

        super();

        this.data = require( file );

    }

    start( options ) {

        let bars = this.data;

        options = options || {};

        if ( options.warmup )
            bars = this.data.slice( -options.warmup );

        for ( let bar of bars )
            this.emit( 'bar', bar );

    }


}

module.exports = DiskFeed;
