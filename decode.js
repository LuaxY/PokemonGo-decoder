var ProtoBuf = require("protobufjs");
var fs = require("fs");
var util = require("util");
var request = require('sync-request');

var args = process.argv.slice(2);

if (args.length < 2) {
    console.log("usage: node decoder.js {REQUEST_DUMP} {RESPONSE_DUMP}");
    process.exit(-1);
}

var builder = ProtoBuf.loadProtoFile("PokemonGo.proto");
var root = builder.build();
var request_envelop = root.RequestEnvelop.decode(fs.readFileSync(args[0]));
var response_envelop = root.ResponseEnvelop.decode(fs.readFileSync(args[1]));
var methods = [];

if (request_envelop.request_id + "" != response_envelop.response_id + "") {
    console.log("Request and respond ID are different");
    console.log("You have to use the same pair of request/response dump");
    console.log("[+] Request ID:  " + request_envelop.request_id);
    console.log("[+] Response ID: " + response_envelop.response_id);
    process.exit(-1);
}

console.log("=== REQUEST ===");
console.log("[+] Request ID: " + request_envelop.request_id);
console.log("[+] Requests:");

request_envelop.requests.forEach(function(request) {
    var method = ProtoBuf.Reflect.Enum.getName(root.Method, request.method);
    methods.push(method);
    console.log("\t- " + method);
})

var map = request("GET", "http://maps.googleapis.com/maps/api/geocode/json?latlng="+request_envelop.latitude+","+request_envelop.longitude+"&sensor=false");
var location = JSON.parse(map.getBody('utf8')).results[0].formatted_address;
//var location = "";

console.log("[+] Location: " + location);

if (request_envelop.auth_info) console.log("[+] Auth Provider: " + request_envelop.auth_info.provider);

console.log("");

console.log("=== RESPONSE ===");
console.log("[+] Response ID: " + response_envelop.response_id);

if (response_envelop.api_url) console.log("[+] API URL: " + response_envelop.api_url);

console.log("");

for (var i = 0; i < methods.length; i++) {
    var method = methods[i]
    var payload = response_envelop.payloads[i].payload;

    console.log("[+] Response: " + method);

    if (method == "GET_PLAYER") {
        var client_player = root.ClientPlayer.decode(payload);
        var sexe = ProtoBuf.Reflect.Enum.getName(root.Sexe, client_player.PlayerAvatar.Sexe);

        console.log("\tName: " + client_player.Name);
        console.log("\tCreation: " + client_player.CreationTimeMs);
        console.log("\tTeam: " + client_player.Team);
        console.log("\tPlayerAvatar:");
        console.log("\t\tSexe: " + sexe);
        console.log("\t\tSkin: " + client_player.PlayerAvatar.Skin);
        console.log("\t\tsHair: " + client_player.PlayerAvatar.Hair);
        console.log("\t\tShirt: " + client_player.PlayerAvatar.Shirt);
        console.log("\t\tPants: " + client_player.PlayerAvatar.Pants);
        console.log("\t\tHat: " + client_player.PlayerAvatar.Hat);
        console.log("\t\tShoes: " + client_player.PlayerAvatar.Shoes);
        console.log("\t\tEyes: " + client_player.PlayerAvatar.Eyes);
        console.log("\t\tBackpack: " + client_player.PlayerAvatar.Backpack);
        console.log("\tMax Pokemon Storage: " + client_player.MaxPokemonStorage);
        console.log("\tMax Item Storage: " + client_player.MaxItemStorage);
        console.log("\tCurrency Balance:");

        client_player.CurrencyBalance.forEach(function(currency) {
            console.log("\t\t" + currency.CurrencyName + ": " + currency.Amount);
        });
    }

    console.log("");
}
