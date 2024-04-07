import Discord, { Client, Events, GatewayIntentBits} from "discord.js";
import * as dotenv from "dotenv";
import EventHandler from "./lib/handlers/EventHandler.js";
import Debug  from "./lib/util/Debug.js";
import path from "node:path"
import { loadKeepAlive } from "./scripts/keepAlive.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const loggerID = path.parse(import.meta.url).base

async function start() {

    // Broadcast start message
    Debug.logStartup("starting client...", loggerID)

    // Thing to keep render server online
    loadKeepAlive()

    // Configure enviroment variables
    dotenv.config();
    
    // Load events
    EventHandler.cacheClient(client)
    await EventHandler.loadEventFolder("dist/events")

    // Login
    await client.login(process.env.CLIENT_LOGIN_TOKEN);
}
start()