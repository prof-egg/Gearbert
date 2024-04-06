/******************************************************************************
 *  Dependencies: discord.js, Debug.ts, Util.ts
 *
 *  EventHandler - Static class to load and handle event listeners.
 *  EventFile - Represents an event file as an object.
 *  TEventFileData - Acts as typesafety when performing a `require()` on a file.
 *  IEventFunc - Acts as typesafety for event file functions.
 *  IEventBuildData - Acts as typesafety for event file `eventData` object.
 *
 ******************************************************************************/

import Discord, { Events } from "discord.js"
import fs from "fs"
import path from "node:path"
import Debug, { EColorEscape } from "../util/Debug.js"
import Util from "../util/Util.js";

const loggerID = path.parse(import.meta.url).base

/**
 * The `EventHandler` class is a static class meant for handling discord client events.
 * It uses a `Discord.Collection` as its backing data structure for storage and
 * retrieval of `EventFile` objects.
 * @see EventHandler.loadEventFolder
 * @see EventHandler.refreshEventRegistry
 * @see EventHandler.cacheData
 * @see EventFile
 */
export default class EventHandler {

    // Dependency injection
    private static client: Discord.Client

    // <key: Discord.Events, value: EventFile> 
    private static eventsCollection: Discord.Collection<Events, EventFile<keyof Discord.ClientEvents>> = new Discord.Collection();

    /**
     * Recursively finds all .ts files in the specified 
     * folder and attempts to load them as events.
     * **DOES NOT** work when folder path or any recursive 
     * folder path contains a period.
     * @param {string} folderPath Path to the folder you of files you want to recursively load
     */
    public static loadEventFolder(folderPath: string): Promise<void> {
        return new Promise(async (resolve) => {
            // load js files from folder into an array
            try {
                const paths = fs.readdirSync(folderPath)
                var folders = paths.filter(f => {return !f.includes(".")});
                var jsfiles = paths.filter(f => {return f.split(".").pop() === "js"});
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
                    const sucessfulLoad = await this.loadEventFile(`${folderPath}/${file}`)
                    if (sucessfulLoad) filesLoaded++
                }
                Debug.log(`Loaded ${filesLoaded} events!`, loggerID)
            }
            
            // Recurse on any folders found
            for (let i = 0; i < folders.length; i++) {
                const path = `${folderPath}/${folders[i]}`
                await this.loadEventFolder(path)
            }

            resolve()
        })
    }

    /**
     * Attempts to laod and store file data as an `EventFile` object. 
     * @param {string} eventFilePath The path to the file you want to load
     * @returns `true` if loaded successfully; `false` otherwise
     */
    public static loadEventFile(eventFilePath: string): Promise<boolean> {
        return new Promise(async (resolve) => {

            this.validateClientCache()

            // Require the file data and store it into the fileData variable
            try { 
                const filePath = `file://${process.cwd()}/${eventFilePath}`;
                var eventFileData: TEventFileData<any> = await import(filePath)
            } catch (e) {
                Debug.logError(e as string, loggerID)
                console.log(e)
                return resolve(false)
            }

            const fileName = path.parse(eventFilePath).base

            // If file has any obvious setup errors log it and return out of function
            if (eventFileData.eventFunction === undefined)   { Debug.logError(`${fileName} is missing eventFunction export`, loggerID); resolve(false) }
            if (eventFileData.eventData === undefined)       { Debug.logError(`${fileName} is missing eventData export`, loggerID); resolve(false) }
            if (eventFileData.eventData.event === undefined) { Debug.logError(`${fileName} is missing .event property in eventData`, loggerID); resolve(false) }
            if (eventFileData.eventData.once === undefined)  { Debug.logError(`${fileName} is missing .once property in eventData`, loggerID); resolve(false) }

            // If event has already been loaded log warning
            if (this.eventsCollection.has(eventFileData.eventData.event)) {
                Debug.logWarning(`An event file with the event "${eventFileData.eventData.event}" has already been loaded`, loggerID)
                resolve(false) 
            }
        
            // Load event function and tags into their respective collections, using the event name as the key
            const event = new EventFile(eventFileData, fileName)
            this.eventsCollection.set(eventFileData.eventData.event, event);
            event.listen(this.client) // activate listener

            // Return true for sucessful loading
            resolve(true)
        })
    }

    /**
     * Attempts to retrieve an `EventFile` instance.
     * @param {Discord.Events} event the client event you want to search for
     * @returns `EventFile` if successful; `undefined` otherwise
     */
    public static getEvent(event: Discord.Events): EventFile<keyof Discord.ClientEvents> | undefined {
        return this.eventsCollection.get(event)
    }

    /**
     * Caches client instance.
     * @param {Discord.Client} client your discord client instance
     */
    public static cacheClient(client: Discord.Client): void { 
        this.client = client 
    }

    /**
     * Checks if a client instance has been cached.
     * @returns `true` if a client instance has been cached; `false` otherwise
     */
    public static isClientCached(): boolean {
        return this.client !== undefined
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
}

// To anyone reading im sorry for the spaghetti mess of generics
// It was discord's fault not mine :(

/**
 * The `EventFile` class represents an instance of the data found in 
 * an event file.
 * The `listen()` function will either call `client.on()` or `client.once()`
 * which will then *execute* the event function upon trigger.
 */
export class EventFile<Event extends keyof Discord.ClientEvents> {
    
    private function: IEventFunc<keyof Discord.ClientEvents>
    private eventData: IEventBuildData<Event>
    private fileName: string // used as the Debug loggerID for the event

    /**
     * Creates a new `EventFile` instance.
     * @param {TEventFileData<Event>} fileData the file data returned from *requiring* a js event file
     * @param {string} fileName the Debug `loggerID` for the event
     */
    constructor(fileData: TEventFileData<Event>, fileName: string) {
        this.function = fileData.eventFunction
        this.eventData = fileData.eventData
        this.fileName = fileName
    }

    /**
     * Calls either `client.on()` or `client.once()` based on the 
     * `once` and `event` properties in the stored `eventData`
     * @param {Discord.Client} client - your discord client instace
     */
    public listen(client: Discord.Client): void {
        if (this.eventData.once) 
            client.once(this.eventData.event, (...args: Discord.ClientEvents[Event]) => {return this.execute(client, ...args)})
         else 
            client.on(this.eventData.event, (...args: Discord.ClientEvents[Event]) => {return this.execute(client, ...args)})
        
    }

    /**
     * Manually call the event function instead of relying on the `listen()` method.
     * @param {Discord.Client} client - your discord client instace
     * @param args {Discord.ClientEvents[Event]} the callback args from the client event
     */
    public execute(client: Discord.Client, ...args: Discord.ClientEvents[Event]): void {
        this.function(client, this.fileName, ...args)
    }

    public get eventBuildData() { return this.eventData }
    public get loggerID() { return this.fileName }
}

/**
 * A type that acts as typesafety when performing a `require()` on an event file.
 */
export type TEventFileData<Event extends keyof Discord.ClientEvents> = {
    eventFunction: IEventFunc<keyof Discord.ClientEvents>,
    eventData: IEventBuildData<Event>
}

/**
 * An interface that acts as typesafety when building an `eventFunction()` method in an event file.
 */
export interface IEventFunc<Event extends keyof Discord.ClientEvents> {
    (client:Discord.Client, loggerID: string, ...args: Discord.ClientEvents[Event]): Discord.Awaitable<void>
}

/**
 * An interface that acts as typesafety when building the `eventData` object in an event file.
 */
export interface IEventBuildData<Event extends keyof Discord.ClientEvents> {
    event: Event
    once: boolean
}