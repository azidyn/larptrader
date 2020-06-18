/*

    example_bitmex_place_order.js
    
        Basic demo of how to market out/in a position
        
*/



const BitMEX = require('./src/exchange/BitMEX');
const config = require('./config');

if ( !config.key.testnet.id )
    console.warn(`No API key set in config.js`);

// Note: you don't need a key for some bitmex functions
let bitmex = new BitMEX({ livenet: false, id: config.key.testnet.id, secret: config.key.testnet.secret });

(async()=>{

    // Market close any open position
    await bitmex.marketclose('XBTUSD');

    // Market buy 1 contract
    let result = await bitmex.marketorder( 'XBTUSD', 'Buy', 1 )

    console.log( result );


})();