PokemonGo Decoder
=================

This is NodeJS app to decode PokemonGo request/response  
You can dump traffic with mitmproxy by pressing `b` on request or response view

#### !!! WARNING !!!

Request dump is used to determine response payload, so use the same dump pair.

## Usage

```
npm install
node decode.js {REQUEST_DUMP_FILE} {RESPONSE_DUMP_FILE}
```

[Result example](result_example)

## Based on
- [tejado/pokemongo-api-demo](https://github.com/tejado/pokemongo-api-demo)
- [bettse/mitmdump_decoder](https://github.com/bettse/mitmdump_decoder)
- [pkre/protocol](https://github.com/pkre/protocol)

Thanks to  [/r/pokemongodev](https://www.reddit.com/r/pokemongodev)
