/*
    example_bitmex_orderbook.js
    
        Pulls the testnet L2 orderbook to 5 levels.
        
*/

const BitMEX = require('./src/exchange/BitMEX');
const config = require('./config');

if ( !config.key.testnet.id ) { 
    console.warn(`No API key set in config.js`);
    process.exit( 1 );
}

// Note: you don't need a key for some bitmex functions
let bitmex = new BitMEX({ livenet: false, id: config.key.testnet.id, secret: config.key.testnet.secret });

(async()=>{

    let lob = await bitmex.lob( 'XBTUSD', 5 )
    console.log( lob );


})();