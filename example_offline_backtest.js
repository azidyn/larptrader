

// Offline feed of bars from a JSON file - generate this file with ./data/scrape.js
const DiskFeed  = require('./src/feed/Offline');

const filename = `${__dirname}/data/XBTUSD-1h.json`;

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

    await feed.start();
    
})();
