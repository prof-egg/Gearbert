import * as dotenv from "dotenv";
import CommandHandler from "../lib/handlers/CommandHandler";

dotenv.config();
CommandHandler.loadSlashCommandFolder("dist/commands")
CommandHandler.refreshSlashCommandRegistry(process.env.CLIENT_LOGIN_TOKEN)