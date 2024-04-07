import * as dotenv from "dotenv";
import CommandHandler from "../lib/handlers/CommandHandler.js";

// NOTE: See scripts/keepAlive.ts for layout info

export function refreshCommands(): Promise<void> {
    return new Promise(async (resolve) => {
        dotenv.config();
        await CommandHandler.loadSlashCommandFolder("dist/commands")
        await CommandHandler.refreshSlashCommandRegistry(process.env.CLIENT_LOGIN_TOKEN)
        resolve()
    })
}

export function loadRefreshCommands(){}

refreshCommands()