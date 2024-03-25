import { Client, GatewayIntentBits} from "discord.js";
import * as dotenv from "dotenv";
import EventHandler from "./lib/handlers/EventHandler";
import Debug  from "./lib/util/Debug";
import path from "node:path"

// const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent] });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const loggerID = path.parse(__filename).base

async function start() {
    
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