import { Client, GatewayIntentBits} from "discord.js";
import * as dotenv from "dotenv";
import EventHandler from "./lib/handlers/EventHandler.js";
import Debug  from "./lib/util/Debug.js";
import path from "node:path"
import { loadKeepAlive } from "./scripts/keepAlive.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const loggerID = path.parse(__filename).base

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
    EventHandler.loadEventFolder("dist/events")
}
start()