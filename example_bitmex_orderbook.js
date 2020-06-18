

const BitMEX = require('./BitMEX');
const config = require('./config');

let bitmex = new BitMEX({ livenet: false, id: config.key.testnet.id, secret: config.key.testnet.secret });

(async()=>{

    let lob = await bitmex.lob( 'XBTUSD', 5 )

    console.log( lob );


})();