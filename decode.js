var ProtoBuf = require("protobufjs");
var fs = require("fs");
var util = require("util");
var request = require('sync-request');

var args = process.argv.slice(2);

if (args.length < 2) {
    console.log("usage: node decoder.js {REQUEST_DUMP} {RESPONSE_DUMP} [show location 0|1]");
    process.exit(-1);
}

var builder = ProtoBuf.loadProtoFile("PokemonGo.proto");
var root = builder.build();
var request_envelop = root.RequestEnvelop.decode(fs.readFileSync(args[0]));
var response_envelop = root.ResponseEnvelop.decode(fs.readFileSync(args[1]));
var request_direction = ProtoBuf.Reflect.Enum.getName(root.Direction, request_envelop.direction);
var response_direction = ProtoBuf.Reflect.Enum.getName(root.Direction, response_envelop.direction);
var methods = [];

var showLocation = args[2] == 1 ? true : false;

if (request_envelop.request_id + "" != response_envelop.response_id + "") {
    console.log("Request and respond ID are different");
    console.log("You have to use the same pair of request/response dump");
    console.log("[+] Request ID:  " + request_envelop.request_id);
    console.log("[+] Response ID: " + response_envelop.response_id);
    process.exit(-1);
}

if (request_direction != "REQUEST") {
    console.log("Invalid request direction: " + request_direction + "(" + request_envelop.direction + ")");
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

if (showLocation) {
    var map = request("GET", "http://maps.googleapis.com/maps/api/geocode/json?latlng="+request_envelop.latitude+","+request_envelop.longitude+"&sensor=false");
    var location = JSON.parse(map.getBody('utf8')).results[0].formatted_address;
    console.log("[+] Location: " + location);
} else {
    console.log("[+] Latitude: " + request_envelop.latitude);
    console.log("[+] Longitude: " + request_envelop.longitude);
}

if (request_envelop.auth_info) console.log("[+] Auth Provider: " + request_envelop.auth_info.provider);

console.log("");

if (response_envelop.direction != 2) { // maybe this is not direction
    console.log("Invalid response direction: " + response_direction + " (" + response_envelop.direction + ")");
    process.exit(-1);
}

console.log("=== RESPONSE ===");
console.log("[+] Response ID: " + response_envelop.response_id);

if (response_envelop.api_url) console.log("[+] API URL: " + response_envelop.api_url);

console.log("");

for (var i = 0; i < methods.length; i++) {
    var method = methods[i]
    var payload = response_envelop.responses[i].payload.toBuffer();

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
        console.log("\t\tHair: " + client_player.PlayerAvatar.Hair);
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

    if (method == "GET_INVENTORY") {
        var inventory = root.InventoryDelta.decode(payload);

        var player = undefined;
        var pokemons = [];
        var eggs = [];
        var items = [];

        inventory.InventoryItems.forEach(function(inventory_item) {
            if (inventory_item.Item) {
                if (inventory_item.Item.Pokemon) {
                    if (inventory_item.Item.Pokemon.PokemonId) {
                        var pokemon_name = ProtoBuf.Reflect.Enum.getName(root.PokemonName, inventory_item.Item.Pokemon.PokemonId);
                        pokemons.push(pokemon_name);
                    }

                    if (inventory_item.Item.Pokemon.IsEgg && inventory_item.Item.Pokemon.IsEgg == true) {
                        var additional_info = "";

                        if (inventory_item.Item.Pokemon.EggIncubatorId) {
                            additional_info = "in incubator"
                        }
                        eggs.push("Egg (" + inventory_item.Item.Pokemon.EggKmWalkedTarget + " Km) " + additional_info);
                    }
                }

                if (inventory_item.Item.PlayerStats) {
                    player = inventory_item.Item.PlayerStats;
                }

                if (inventory_item.Item.Item) {
                    var item_name = ProtoBuf.Reflect.Enum.getName(root.ItemEnum, inventory_item.Item.Item.Item);
                    items.push(item_name + " (x" + inventory_item.Item.Item.Count + ")");
                }
            }
        });

        if (player) {
            console.log("\tPlayer:");
            console.log("\t\tLevel: " + player.Level);
            console.log("\t\tExp: " + player.Experience + "/" + player.NextLevelExp);
            console.log("\t\tStats:");
            console.log("\t\t\tKm walked: " + player.KmWalked);
            console.log("\t\t\tPokemon encountered: " + player.NumPokemonEncountered);
            console.log("\t\t\tPokemon captured: " + player.NumPokemonCaptured);
            console.log("\t\t\tUnique Pokedex entries: " + player.NumUniquePokedexEntries);
            console.log("\t\t\tPokeStop visited: " + player.PokeStopVisits);
            console.log("\t\t\tPokeball trhown: " + player.NumberOfPokeballThrown);
        }

        console.log("\tPokemons:");
        pokemons.forEach(function(pokemon) {
            console.log("\t\t" + pokemon);
        });

        console.log("\tEggs:");
        eggs.forEach(function(egg) {
            console.log("\t\t" + egg);
        });

        console.log("\tItems:");
        items.forEach(function(item) {
            console.log("\t\t" + item);
        });
    }

    if (method == "DOWNLOAD_SETTINGS") {
        console.log("\tHash: " + payload.toString());
        var settings = root.GlobalSettings.decode(response_envelop.responses[i].settings.toBuffer());
        console.log("\tSettings: \n");
        console.log(settings);
    }

    console.log("");
}
