import * as dotenv from "dotenv";
import CommandHandler from "../lib/handlers/CommandHandler";

// NOTE: See scripts/keepAlive.ts for layout info

export function refreshCommands() {
    dotenv.config();
    CommandHandler.loadSlashCommandFolder("dist/commands")
    CommandHandler.refreshSlashCommandRegistry(process.env.CLIENT_LOGIN_TOKEN)
}

export function loadRefreshCommands(){}

refreshCommands()