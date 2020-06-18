

// ********* ATTENTION *********
//  
// First requires generation of bar data file go to ./data/ folder and run: node scrape 1h 14 XBTUSD
//
// See data/README.md for more instructions, probably
// 
// ******************************


// Offline feed of bars
const DiskFeed  = require('./src/feed/Offline');

const filename = `${__dirname}/data/XBTUSD-1d.json`;

let feed;

try { 
     feed = new DiskFeed( filename );
} catch  {
    console.log( `ERROR: Couldn't open file ${filename}. Use 'scrape.js' in the ./data/ folder to generate this file!`);
    process.exit();
}

function onclose( bar )
{

    console.log( bar );

}


// Required system bootup boilerplate code 
(async()=>{

    feed.on('bar', b => {

        // Call the user strategy code
        onclose( b );

    } );

    feed.start(); 
    
})();
