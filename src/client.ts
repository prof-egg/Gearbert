import Discord, { Client, Events, GatewayIntentBits} from "discord.js";
import * as dotenv from "dotenv";
import EventHandler from "./lib/handlers/EventHandler.js";
import Debug  from "./lib/util/Debug.js";
import path from "node:path"
import { loadKeepAlive } from "./scripts/keepAlive.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const loggerID = path.parse(import.meta.url).base

async function start() {

    // Thing to keep render server online
    loadKeepAlive()

    // Configure enviroment variables
    dotenv.config();

    // Login
    Debug.logStartup("starting client...", loggerID)
    await client.login(process.env.CLIENT_LOGIN_TOKEN);
    
    // Load events
    EventHandler.cacheClient(client)
    await EventHandler.loadEventFolder("dist/events")
    
    // Trigger the "ready" event manually because we await the login first and then
    // load the events. So the event listener activates after the "ready" event has been
    // broadcasted. We wouldn't have to do this if we loaded the events first, but
    // I like the logs better this way.
    EventHandler.getEvent(Events.ClientReady)?.execute(client, client as Discord.Client<true>)
}
start()