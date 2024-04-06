import { Events } from "discord.js"
import CommandHandler from "../lib/handlers/CommandHandler.js"
import { IEventFunc } from "../lib/handlers/EventHandler.js"
import Debug from "../lib/util/Debug.js"
import messageConfig from "../config/messages.json"
import clientconfig from "../config/client.json"

const eventType = Events.ClientReady

const eventFunction: IEventFunc<typeof eventType> = async (client, loggerID, readyClient) => {
    CommandHandler.cacheData(readyClient)
    CommandHandler.loadSlashCommandFolder("dist/commands")
    readyClient.user.setActivity(messageConfig.clientPresence);
    Debug.logImportant(`${clientconfig.name} is online!`, loggerID)
}

const eventData = {
    event: eventType,
    once: true
}

export { eventFunction, eventData }