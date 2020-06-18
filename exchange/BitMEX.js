
const crypto = require('crypto');
const fetch = require('node-fetch');

const XBt_TO_XBT = 1 / 100000000;

/*

  Note this module is pretty old and should be restructured. 



To help improve responsiveness during high-load periods, the BitMEX trading engine will begin load-shedding when requests reach a 
  critical queue depth. When this happens, you will quickly receive a 503 status code with the 
  JSON payload {"error": {"message": "The system is currently overloaded. Please try again later.", "name": "HTTPError"}}. 
  The request will not have reached the engine, and you should retry after at least 500 milliseconds.

*/

const ROUND_USD = 5;

const API_PATH = '/api/v1';

class BitMEXRest
{
  constructor( opts )
  {
    this.url = opts.livenet ? 'https://www.bitmex.com' : 'https://testnet.bitmex.com';
    
    this.key = opts.id;
    this.secret = opts.secret;
    
  }

  async lob( symbol, depth )
  {
    let verb  = 'GET';
    let path  = `${API_PATH}/orderBook/L2?symbol=${symbol}&depth=${depth}`;
    let sbody = '';
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header(verb, path, 0, sbody),      
      method: verb,
    };

    let res = await fetch( url, req );

    return await this.handle_response( res );
     
  }


  async instrument(symbol)
  {
    let body = {};

    let verb  = 'GET';
    let path  = `${API_PATH}/instrument?symbol=${symbol}&count=1`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header(verb, path, 0, sbody),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, reqopts );

    return await this.handle_response( res );
 
  }

  async size(symbol, pcbalance=0.98, leverage=1)
  {
    let i = symbol == 'XBTUSD' ? 'xbt' : symbol;
    let balance = await this.balance();
    let ins = await this.instrument(i);
    let xbt = (balance.availableMargin * XBt_TO_XBT) * pcbalance;

    let usd = xbt * ins.lastPrice;
    let num = (((usd - (usd % ROUND_USD)) * leverage)) <<0;

    return Math.max(num, 0);
  }

  async balance()
  {
    let body  = {};

    let verb  = 'GET';
    let path  = `${API_PATH}/user/margin`;    
    let sbody = '';
    let url   = `${this.url}${path}`;

    const reqopts = {
      headers: this._header(verb, path, 0, sbody),
      method: verb
    };

    let res = await fetch( url, reqopts );

    return await this.handle_response( res );
  
  }

  async postonly( symbol, quantity, price, side, opts={} )
  {
    let body = {
        ordType:    'Limit',
        execInst:   'ParticipateDoNotInitiate', 
        symbol:     symbol,
        price: price,
        side: side,
        orderQty: quantity
    };

    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body)
    const url = `${this.url}${path}`;

    const reqopts = {
      method: verb,
      headers: this._header( verb, path, 0, sbody ),
      body: sbody,      
    }

    let res = await fetch( url, reqopts );

    return await this.handle_response( res );

  }

  async limit( symbol, quantity, price, side, opts={} )
  {
    let body = {
        ordType:    'Limit',
        symbol:     symbol,
        price: price,
        side: side,
        orderQty: quantity
    };

    Object.assign( body, opts );

    let verb    = 'POST';
    let path    = `${API_PATH}/order`;
    let sbody   = JSON.stringify(body)
    let url     = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };
    
    let res = await fetch( url, req )

    return await this.handle_response( res );

  }


  async marketclose( symbol, opts={}  )
  {
    
    let position = await this.position( symbol );
  
    if ( !position.isOpen )      
      return null;
    
    let body = {
        ordType:    'Market',
        execInst:   'Close', 
        symbol:     symbol,
        orderQty: -position.currentQty
    };

    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, req )

    return await this.handle_response( res );

  }    

  async marketstop( symbol, price, side, opts={} )
  {
    let execInst = ['Close'];
    
    // Add any additional exec instructions. e.g. bitmex accepts execInst like: 'Close,MarkPrice' 
    if ( opts.execInst )
    {
      if ( Array.isArray( opts.execInst ))
        for ( let e of opts.execInst ) execInst.push( e )

      delete opts.execInst;
    }

    let body = {
        ordType:    'Stop',
        execInst:   execInst.join(','), 
        symbol:     symbol,
        stopPx: price,
        side: side,
    };

    
    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, req )

    return await this.handle_response( res );

  }  

  async tpmarket( symbol, price, side, quantity, opts={} )
  {
    let execInst = ['Close'];
    
    // Add any additional exec instructions. e.g. bitmex accepts execInst like: 'Close,MarkPrice' 
    if ( opts.execInst )
    {
      if ( Array.isArray( opts.execInst ))
        for ( let e of opts.execInst ) execInst.push( e )

      delete opts.execInst;
    }

    let body = {
        ordType:    'MarketIfTouched',
        execInst:   execInst.join(','), 
        symbol:     symbol,
        stopPx: price,
        orderQty: quantity,
        // price: price,
        // side: side,
    };

    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, req )

    return await this.handle_response( res );

  }  


  async leverage( symbol, leverage=0, opts={} )
  {    

    let body = {
        symbol: symbol,
        leverage: leverage
    };

    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/position/leverage`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, req );
    return await this.handle_response( res );

  } 


  async marketorder( symbol, side, quantity, opts={} )
  {    

    let body = {
        ordType:    'Market',
        symbol:     symbol,
        side:       side,
        orderQty:   quantity
    };

    Object.assign( body, opts );

    let verb  = 'POST';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body);
    let url   = `${this.url}${path}`;

    const req = {
      headers: this._header( verb, path, 0, sbody ),      
      method: verb,
      body: sbody
    };

    let res = await fetch( url, req );
    return await this.handle_response( res );

  }  

  async cancelorders( symbol, opts={} )
  {
    let body = {
        symbol: symbol
    };

    Object.assign( body, opts );

    let verb  = 'DELETE';
    let path  = `${API_PATH}/order/all`;
    let sbody = JSON.stringify(body);
    const url = `${this.url}${path}`;

    const reqopts = {
      method: verb,
      headers: this._header( verb, path, 0, sbody ),
      body: sbody,      
    }

    let res = await fetch( url, reqopts );

    return await this.handle_response( res );

  }

  async cancelsingleorder( clOrdID, orderID, opts={} )
  {
    let body = {};
    
    if ( clOrdID ) 
      body.clOrdID = clOrdID;
    else
      body.orderID = orderID;

    Object.assign( body, opts );

    let verb  = 'DELETE';
    let path  = `${API_PATH}/order`;
    let sbody = JSON.stringify(body);
    const url = `${this.url}${path}`;

    const reqopts = {
      method: verb,
      headers: this._header( verb, path, 0, sbody ),
      body: sbody,      
    }

    let res = await fetch( url, reqopts );

    return await this.handle_response( res );

  }



  // async position(symbol, action, params)
  // {
  //   let body = {};
  //   switch(action)
  //   {
  //     case 'close':
  //       body = {symbol:symbol, execInst:'Close', ordType:"Market"};
  //       break;
  //     case 'open':
  //       body = {symbol:symbol, ordType:'Market'};
  //       Object.assign(body, params);
  //       break;
  //     case 'get':
  //       return await this._get_position(symbol);
  //       break;

  //   }

  //   let verb = 'POST';
  //   let path = `${API_PATH}/order`;

  //   let sbody = JSON.stringify(body)

  //   const req = {
  //     headers: this._header(verb, path, 0, sbody),
  //     url:`${this.url}${path}`,
  //     method: verb,
  //     body: sbody
  //   };

  //   let res = await request(req);
  //   let o = JSON.parse(res);
  //   if (Array.isArray(o))
  //     if (o.length == 1)
  //       o = o[0]
  //     else if (o.length == 0) o = {error: `Nothing returned for ${symbol}`}

  //   return o;
  // }

  async position( sym )
  {
    let f = {
      symbol: sym,
    };    

    // let filter = encodeURIComponent(`filter={"symbol":"${sym}"}`)
    let filter = `filter=` + encodeURIComponent( `${ JSON.stringify( f )}` );

    let verb = 'GET';
    let path = `${API_PATH}/position?${filter}`;
    let url = `${this.url}${path}`;

    const req = {
      headers: this._header(verb, path, 0, ''),
      method: verb
    };

    let res = await fetch( url, req );

    return await this.handle_response( res );

  }


  async openorders( sym )
  {
    let f = {
      symbol: sym,
      open: true
    };    

    // let filter = encodeURIComponent(`filter={"symbol":"${sym}"}`)
    let filter = `filter=` + encodeURIComponent( `${ JSON.stringify( f )}` );

    
    let verb = 'GET';
    let path = `${API_PATH}/order?${filter}`;
    let url = `${this.url}${path}`;

    const req = {
      headers: this._header(verb, path, 0, ''),
      method: verb
    };

    let res = await fetch( url, req );

    return await this.handle_response( res );

  }


  // When calling this, the fetch() API hasn't attempted to retrieve a response body
  // we are checking here to see if there's a status error first
  async handle_response( res )
  {
    // Not ok == http timeout, user blocked, bitmex overload etc 

    if ( not_ok( res.status ) )
    {
      
      let msg = 'Unknown error';

      try { 
        let p = await res.json();
        msg = p.error ? ( p.error.message || 'Unknown BitMEX API error status' ) : 'Unknown BitMEX API error'         
      } catch {
        msg = 'Unknown error (not a JSON response)';
      }

      //NOTE: This is the only source of exceptions thrown from this module.
      throw { http: res.status, message: msg };

      // throw new Error( msg );
      
    }

    let o = await res.json();      

    let rateLimit = res.headers.get('x-ratelimit-remaining');

    if ( Array.isArray( o ) )
      if (o.length == 1) o = o[0];      

    if ( !Array.isArray( o ))
      o.__META__RATELIMIT = rateLimit;

    return o;
  }


  

  _header(verb, path, expires=0, body='')
  {
    expires = expires || Math.round(new Date().getTime() / 1000) + 60;
    let signature = this._signature(verb, path, expires, body);
    //taken from bitmex api docs
    return {
      'content-type' : 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      // This example uses the 'expires' scheme. You can also use the 'nonce' scheme. See
      // https://www.bitmex.com/app/apiKeysUsage for more details.
      'api-expires': expires,
      'api-key': this.key,
      'api-signature': signature
    };
  }

  _signature(verb, path, expires=0, body={})
  {
    return crypto.createHmac('sha256', this.secret).update(verb + path + expires + body).digest('hex');
  }
}


module.exports = BitMEXRest;


function not_ok( http_status_code )
{

  if ( http_status_code < 200 || http_status_code > 202 )
    return true;
  
  return false;

}