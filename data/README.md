

Pulls `1m`, `5m`, `1h`,`1d` bar data from the BitMEX exchange and writes it to a JSON file.

You can scrape as much as you want, re: the entire historical dataset.

Specify the bar length, how many days' worth of data you want and the symbol.

For example:

```
$ node scrape 1h 14 XBTUSD
```

Pulls the last 14 days' worth of 1 hour bars for XBTUSD

