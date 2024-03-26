import * as dotenv from "dotenv";
import CommandHandler from "../lib/handlers/CommandHandler";

export function refreshCommands() {
    dotenv.config();
    CommandHandler.loadSlashCommandFolder("dist/commands")
    CommandHandler.refreshSlashCommandRegistry(process.env.CLIENT_LOGIN_TOKEN)
}
refreshCommands()