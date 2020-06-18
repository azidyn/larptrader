
# larptrader
Algorithmic backtesting and live trading system; simple setup, config and out-of-the-box exchange support 

This is a rudimentary example of _one way_ to write a price action based algorithmic trading platform. So, let's say "educational purposes", perhaps will inspire
someone to write their own or maybe submit a PR, fork, etc whatever.

Absolutely zero error checking or support (feel free to post a gh issue though!)

Have fun. Get rich, kid.

### Features and Capabilities
- Backtesting, forward testing and live trading on BitMEX out-of-the-box
- Zero latency from the exchange
- No database required
- Almost zero configuration ( `config.js` requires a testnet API key to trade on BitMEX )
- Backtester calculates fees (optional), inverse contract PnL math, and sizes position by stop/risk.
- Simple architecture, easy to fork add your own ideas or pull in other types of data
- Can backtest a strategy using offline or historical data. And then continue running immediately so you can forward test it too.

### Installation

```
git clone https://github.com/azidyn/larptrader.git
cd larptrader
npm install
```

### Run the examples

Start with this one:

```
node example_live_minimal
```

Description of behaviour inside the source file.

### Scraping data

Some of the examples require offline data to be scraped first, to do this there is a script inside the `/data` folder, read the README.md file there, it's pretty easy and quick to use.

### Indicators
**Larptrader** uses this great TA library: https://github.com/anandanand84/technicalindicators
Examples on how to use the indicators are provided in `example_live_indicators.js`


### Placing a backtest trade
```js
    const Backtester    = require('./src/Backtester');
    const larp = new Backtester();

    // With a stop, sizing by percent risk
    larp.open( 'long', open_price, stop_price, account_risk_in_percent, timestamp );

    // Without a stop, using 100% account balance
    larp.open( 'long', open_price, null, 100, timestamp );

```

Show backtest results, very basic statistics 
```js
    console.log( larp.result );
```

### Limitations / Suggested Improvements

- Only supports limited bar resolution as that is what BitMEX provides. So suggest an aggregation layer between the Live/Offline feeds and your script.
Should be quite simple to implement 4H bars by aggregating the 1H feed.

- Add other exchange data feeds

- Expand the backtest statistics, calc drawdown etc.