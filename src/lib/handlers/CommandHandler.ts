/******************************************************************************
 *  Dependencies: discord.js, Debug.ts, Util.ts, clientconfig.json
 *
 *  CommandHandler - Static class to load and execute slash commands.
 *  SlashCommandFile - Represents a slash command file as an object with some qol attributes.
 *  TSlashCommandFileData - Acts as typesafety when performing a `require()` on a file.
 *  ISlashCommandFunc - Acts as typesafety for slash command file functions.
 *  ECommandTags - Identifiers used to tag and manage slash command files.
 * 
 ******************************************************************************/

import Discord, { REST, Routes } from "discord.js"
import fs from "fs"
import path from "node:path"
import Debug, { EColorEscape } from "../util/Debug.js"
import Util from "../util/Util.js";
import clientconfig from "../../config/client.json" assert { type: 'json' }

const loggerID = path.parse(import.meta.url).base

/**
 * The `CommandHandler` class is a static class meant for handling slash commands.
 * It uses a `Discord.Collection` as its backing data structure for storage and
 * retrieval of `SlashCommandFile` objects.
 * @see CommandHandler.loadSlashCommandFolder
 * @see CommandHandler.refreshSlashCommandRegistry
 * @see CommandHandler.cacheData
 * @see SlashCommandFile
 */
export default class CommandHandler {

    // Dependency injections
    private static client: Discord.Client
    private static clientToken: string
    private static rest: REST

    // <key: commandName, value: SlashCommandFile> 
    private static slashCommandsCollection: Discord.Collection<string, SlashCommandFile> = new Discord.Collection();

    /**
     * Recursively finds all .ts files in the specified 
     * folder and attempts to load them as slash commands.
     * **DOES NOT** work when folder path or any recursive 
     * folder path contains a period.
     * @param {string} folderPath Path to the folder you of files you want to recursively load
     */
    public static loadSlashCommandFolder(folderPath: string): Promise<void> {
        return new Promise(async (resolve) => {

            // load js files from folder into an array
            try {
                const paths = fs.readdirSync(folderPath)
                var folders = paths.filter(f => { return !f.includes(".") });
                var jsfiles = paths.filter(f => { return f.split(".").pop() === "js" });
            } catch (e) {
                Debug.logError(e as string, loggerID)
                console.log(e)
                return resolve()
            }

            // load files in jsfiles array if any
            if (jsfiles.length > 0) {
                const folderName = Util.extractFolderName(folderPath);
                let filesLoaded = 0;
                Debug.log(`Loading ${jsfiles.length} files from ${folderName}...`, loggerID, EColorEscape.YellowFG)
                for (let i = 0; i < jsfiles.length; i++) {
                    const file = jsfiles[i]
                    const sucessfulLoad = await this.loadSlashCommandFile(`${folderPath}/${file}`)
                    if (sucessfulLoad) filesLoaded++
                }
                Debug.log(`Loaded ${filesLoaded} commands!`, loggerID)
            }

            // Recurse on any folders found
            for (let i = 0; i < folders.length; i++) {
                const path = `${folderPath}/${folders[i]}`
                await this.loadSlashCommandFolder(path)
            }

            resolve()
        })
    }

    /**
     * Attempts to laod and store file data as a `SlashCommandFile` object. 
     * @param {string} slashCmdFilePath The path to the file you want to load
     * @returns `true` if loaded successfully; `false` otherwise
     */
    public static loadSlashCommandFile(slashCmdFilePath: string): Promise<boolean> {
        return new Promise(async (resolve) => {

            try { // Import the file data and store it into the fileData variable
                const filePath = `file://${process.cwd()}/${slashCmdFilePath}`
                var slashCmdFileData: TSlashCommandFileData = await import(filePath)
            } catch (e) {
                Debug.logError(e as string, loggerID)
                console.log(e)
                return resolve(false)
            }

            const fileName = path.parse(slashCmdFilePath).base

            // If file has any obvious setup errors log it and return out of function
            if (slashCmdFileData.commandFunction === undefined) { Debug.logError(`${fileName} is missing commandFunction export`, loggerID); return false }
            if (slashCmdFileData.buildData === undefined) { Debug.logError(`${fileName} is missing buildData export`, loggerID); return false }
            if (slashCmdFileData.buildData.name === undefined) { Debug.logError(`${fileName} is missing .name property in buildData`, loggerID); return false }
            if (slashCmdFileData.buildData.description === undefined) { Debug.logError(`${fileName} is missing .description property in buildData`, loggerID); return false }
            if (slashCmdFileData.tags === undefined || !Array.isArray(slashCmdFileData.tags)) { Debug.logError(`${fileName} is missing tags export`, loggerID); return false }

            // If command has already been loaded log warning
            if (this.slashCommandsCollection.has(slashCmdFileData.buildData.name)) {
                Debug.logWarning(`A slash cmd function with the name "${slashCmdFileData.buildData.name}" has already been loaded`, loggerID)
                resolve(false)
            }

            // Load command function and tags into their respective collections, using the command name as the key
            const slashCommand = new SlashCommandFile(slashCmdFileData, fileName)
            this.slashCommandsCollection.set(slashCmdFileData.buildData.name, slashCommand);

            // Return true for sucessful loading
            resolve(true)
        })
    }

    /**
     * Uses the command data that has been loaded into the `CommandHandler`
     * to *refresh* guild slash commands. 
     * This involves **adding** new commands if needed, **deleting** old commands
     * if needed, and **overwriting** old commands if needed.
     * @param {string} clientToken the login token for your discord client
     * @throws `TypeError` if called with no `clientToken` passed and a client when `Discord.Client<true>` has not been cached
     * @throws `DiscordAPIError` if invalid login token is provided
     * @see CommandHandler.cacheData
     */
    public static async refreshSlashCommandRegistry(clientToken?: string) {

        if (clientToken) {
            var rest = new REST().setToken("clientToken")
        } else {
            this.validateTokenCache()
            clientToken = this.clientToken
            this.validateRestCache()
            var rest = this.rest
        }

        try {

            // Get an array of slash command build datas
            const slashCommands = this.slashCommandsCollection.values()
            const commandBodies: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody[] = []
            for (const command of slashCommands)
                commandBodies.push(command.commandBuildData)

            Debug.logStartup(`Refreshing ${commandBodies.length} application (/) commands...`, loggerID)

            // The put method is used to fully refresh all commands in the guild with the current set
            // Route methods return API 
            const data = await rest.put(
                Routes.applicationGuildCommands(clientconfig.id, clientconfig.homeGuild.id),
                { body: commandBodies },
            );

            Debug.log(`Successfully refreshed ${commandBodies.length} application (/) commands!`, loggerID, EColorEscape.CyanFG)

        } catch (error) {
            Debug.logError(error as string, loggerID)
            console.log(error)
        }
    }

    /**
     * Attempts to retrieve a `SlashCommandFile` instance and call the
     * `execute()` method.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @returns `true` if executed successfully; `false` otherwise
     */
    public static executeSlashCommand(interaction: Discord.ChatInputCommandInteraction): boolean {
        this.validateClientCache()
        const command = this.getSlashCommand(interaction)
        if (!command) {
            Debug.logError(`Failed to execute command: ${interaction.commandName}`, loggerID)
            return false
        }

        command.execute(interaction, this.client)
        return true
    }

    /**
     * Caches `client` instance. Caches a `clientToken` string and 
     * `rest` object if `Discord.Client<true>` which is checked
     * with `client.isReady()`.
     * @param {Discord.Client} client your discord client instance
     */
    public static cacheData(client: Discord.Client): void {
        this.client = client
        if (client.isReady()) {
            this.clientToken = client.token
            this.rest = new REST().setToken(client.token)
        }
    }

    /**
     * Attempts to retrieve a `SlashCommandFile` instance.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @returns `SlashCommandFile` if successful; `undefined` otherwise
     */
    public static getSlashCommand(interaction: Discord.ChatInputCommandInteraction): SlashCommandFile | undefined {
        return this.slashCommandsCollection.get(interaction.commandName)
    }

    /**
     * Checks if a client instance has been cached.
     * @returns `true` if a client instance has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public static isClientCached(): boolean {
        return this.client !== undefined
    }

    /**
     * Checks if a client token has been cached.
     * @returns `true` if a client token has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public static isTokenCached(): boolean {
        return this.clientToken !== undefined
    }

    /**
     * Checks if a rest object has been cached.
     * @returns `true` if a rest object has been cached; `false` otherwise
     * @see CommandHandler.cacheData
     */
    public static isRestCached(): boolean {
        return this.rest !== undefined
    }

    /***************************************************************************
    * Validators
    ***************************************************************************/
    private static validateClientCache(): void {
        if (!this.isClientCached()) {
            const errorMsg = "Tried to use function that requires cached discord client without first caching discord client"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
    }

    private static validateTokenCache(): void {
        if (!this.isTokenCached()) {
            const errorMsg = "Tried to use function that requires cached client token without first caching client token"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
    }

    private static validateRestCache(): void {
        if (!this.isRestCached()) {
            const errorMsg = "Tried to use function that requires cached rest object without first caching rest object"
            Debug.logError(errorMsg, loggerID)
            throw new TypeError(errorMsg)
        }
    }
}

/**
 * The `SlashCommandFile` class represents an instance of the data found in 
 * a slash command file with a couple of quality of life additions.
 * The `exectue()` function will execute the main function specified in the 
 * command file.
 * The `hasTag()` and `hasTags()` methods check the command tag data for
 * one or more "tags" respectively.
 */
export class SlashCommandFile {

    private function: ISlashCommandFunc;
    private buildData: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody;
    private tags: ECommandTags[];
    private fileName: string // used as the Debug loggerID for the command

    /**
     * Creates a new `SlashCommandFile` instance.
     * @param {TSlashCommandFileData} fileData the file data returned from *requiring* a js slash command file
     * @param {string} fileName the Debug `loggerID` for the command
     */
    public constructor(fileData: TSlashCommandFileData, fileName: string) {
        this.function = fileData.commandFunction
        this.buildData = fileData.buildData
        this.tags = fileData.tags
        this.fileName = fileName
    }

    /**
     * Executes the command function specified in the command file.
     * @param {Discord.ChatInputCommandInteraction} interaction the interaction object generated by an end user
     * @param {Discord.Client} client your discord client instance
     */
    public execute(interaction: Discord.ChatInputCommandInteraction, client: Discord.Client): void {
        this.function(interaction, interaction.options as Discord.CommandInteractionOptionResolver, client, this.fileName)
    }

    /**
     * Checks if the command has been tagged with `tag`.
     * @param {ECommandTags} tag the tag you want to check for
     * @returns `true` if the `tag` exists on the command; `false` otherwise
     */
    public hasTag(tag: ECommandTags): boolean {

        for (let i = 0; i < this.tags.length; i++)
            if (this.tags[i] == tag) return true

        return false
    }

    /**
     * Checks if the command has been tagged with `tags`.
     * @param tags an array of tags you want to check for
     * @returns `true` if the `tags` exists on the command; `false` otherwise
     */
    public hasTags(tags: ECommandTags[]): boolean {

        // Rewrite so its not O(n^2)
        for (let i = 0; i < this.tags.length; i++)
            if (!this.hasTag(tags[i])) return false

        return true
    }

    public get commandBuildData() { return this.buildData }
    public get loggerID() { return this.fileName }
}

/**
 * A type that acts as typesafety when performing a `require()` on a slash command file.
 */
export type TSlashCommandFileData = {
    commandFunction: ISlashCommandFunc,
    buildData: Discord.RESTPostAPIChatInputApplicationCommandsJSONBody,
    tags: ECommandTags[],
}

/**
 * An interface that acts as typesafety when building a `commandFunction()` method in a slash command file.
 */
export interface ISlashCommandFunc {
    (interaction: Discord.ChatInputCommandInteraction, options: Discord.CommandInteractionOptionResolver, client: Discord.Client, loggerID: string): void
}

/**
 * Identifiers used to tag and manage slash command files.
 * Commands tagged with `ECommandTags.Complete` will be treated as readily available,
 * whereas commands tagged with `ECommandTags.Incomplete` can only be used by those who
 * have the specified testing role.
 * `ECommandTags.Utility` is a tag that represents the style of command being implemented.
 * As of the time this being written, `ECommandTags.Utility` is the only tag of its kind.
 * Tags allows for the ability to sort and handle certain commands differently automatically 
 * based on the tags in the file.
 */
export enum ECommandTags {
    Utility,
    Complete,
    Incomplete,
}