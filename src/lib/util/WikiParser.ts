import cheerio, { CheerioAPI } from "cheerio"
import Discord from "discord.js"
import Debug from "./Debug.js"
import path from "node:path"

const loggerID = path.parse(import.meta.url).base

export default class Wiki {

    public static readonly ROOT_DIR = "https://stargroundwiki.miraheze.org"
    public static readonly MAIN_PAGE = "https://stargroundwiki.miraheze.org/wiki/Main_Page"

    // public tables: WikiTable[] = []
    public readonly fullTitle: string
    public readonly title: string
    public readonly link: string
    public readonly text: string

    private tables: WikiTable[]
    private $: CheerioAPI

    public constructor(link: string, title: string, cheerio: CheerioAPI) {
        this.link = link
        this.title = title
        this.$ = cheerio
        this.fullTitle = this.$("title").text()
        this.text = this.$("p").first().text()

        // PARSE TABLES
        this.tables = this.parseTables()
    }


    public getTables(): WikiTable[] {
        return [...this.tables]
    }

    /***************************************************************************
    * Public static methods
    ***************************************************************************/
    public static async fetchMainWikiLinks(): Promise<string[] | undefined>  {
        
        // Regular expression to match strings starting with '/wiki/' and no additional query parameters or fragments
        // - \/wiki\/: Matches the literal string "/wiki/".
        // - [^?#]+: This part matches one or more characters that are not ? (question mark) or # (hash/fragment), or : (colon). 
        // This ensures that the regex pattern matches strings that don't have any query parameters or fragments after "/wiki/".
        // - $: End-of-input anchor.
        const wikiRegex = /\/wiki\/[^?#:]+$/;
       
        const links = await this.fetchWikiLinks()
        return links?.filter((link) => link && wikiRegex.test(link))
    }

    public static async fetchWikiLinks(): Promise<string[] | undefined>  {

        const html = await this.handleFetch(this.MAIN_PAGE)
        if (!html) return undefined // error should be logged by handleFetch()

        const $ = cheerio.load(html);

        // Find all <a> tags (links) on the page
        const allLinks = $('a[href]');

        // console.log(allLinks)
        // Regular expression to match strings starting with '/wiki/' and no additional query parameters or fragments
        // ^: Start-of-input anchor.
        // \/wiki\/: Matches the literal string "/wiki/".
        const wikiRegex = /^\/wiki\//;

        // Extract valid wiki links using regex
        // Note: the root link (aka the ROOT_DIR) is not included in any links returned
        const wikiLinks = allLinks.toArray()
            // Chat gpt wrote this one idk what it does ¯\_(ツ)_/¯
            .map(link => $(link).attr('href') ?? "Error")
            // Filter out links that dont match the regex
            .filter(href => href && wikiRegex.test(href))
            // Add the root link infront of the returned wiki sublink
            .map((link) => this.ROOT_DIR + link)

        if (!wikiLinks) return undefined

        // Clean up the links (remove duplicate entries)
        const cleanedLinks = [...new Set<string>(wikiLinks)];

        return cleanedLinks
    }

    public static async parseWikiContent(link: string) {
        const html = await this.handleFetch(link)
        if (!html)
            throw new TypeError("Invalid link")
        const $ = cheerio.load(html)
        // Get base directory of link (which happens 
        // to be the title of the page as well)
        const title = path.parse(link).base
        return new Wiki(link, title, $)
    }

    public static async fetchMainWikiLinksAsParsed(): Promise<Wiki[]>  {
        const links = await this.fetchMainWikiLinks() ?? [this.ROOT_DIR]

        // Map each link to an asynchronous operation (parsing)
        const parsedPromises = links.map(link => this.parseWikiContent(link));

        const parsedResults = await Promise.all(parsedPromises);
        return parsedResults;
    }

    /***************************************************************************
    * Helper methods
    ***************************************************************************/
    /** Cheerio object must be already loaded for this method to work*/
    private parseTables() {
        // Select the table headers (column names)
        const headers = this.$("table th").map((index, element) => {
            return this.$(element).text().trim(); // Trim whitespace and newlines
        }).get();
        
        // Select the table rows (data rows)
        const dataRows = this.$("table tr").map((index, element) => {
            return this.$(element)
            .find("td")
            .map((i, el) => this.$(el).text().trim()) // Trim whitespace and newlines
            .get();
        }).get();
        
        // Unflatted the 1d array of data to a 2d array
        let stuff = this.to2DArray(dataRows, headers.length) as string[][]
        stuff.unshift(headers)

        return [new WikiTable("", stuff)]
    }

    private static async handleFetch(link: string): Promise<string | null> {
        const res = await fetch(link)
        if (!res.ok) {
            Debug.logError(`Fetch error: ${res.statusText}`, loggerID)
            return null
        }
        return res.text()
    }

    private async handleFetch(link: string): Promise<string | null> {
        const res = await fetch(link)
        if (!res.ok) {
            Debug.logError(`Fetch error: ${res.statusText}`, loggerID)
            return null
        }
        return res.text()
    }
    
    private to2DArray(flatArray: Array<(number | string | boolean | object)>, n: number): (string | number | boolean | object)[][] {
        const twoDArray = [];
        for (let i = 0; i < flatArray.length; i += n) {
            const subArray = [];

            for (let j = 0; j < n; j++)
                if (flatArray[i + j] !== undefined)
                    subArray.push(flatArray[i + j]);

            twoDArray.push(subArray);
        }
        return twoDArray;
    }
}

class WikiTable {

    private title: string
    private headers: string[]
    private body: string[][]
    private table: string[][]

    public readonly rows: number
    public readonly columns: number
    /**Discord embeds (and possibly regular bot messages) normalize
     * whitespace, so this will not look pretty in an embed.*/
    public readonly asString: string 
    /** @example
     * const parsedWiki = await Wiki.fetchMainWikiLinksAsParsed()[0]
     * const firstTable = parsedWiki.getTables()[0]
     * const embed = new Discord.EmbedBuilder()
     *     .addFields(...firstTable.asDiscordEmbedFields)
     */
    public readonly asDiscordEmbedFields: Discord.RestOrArray<Discord.APIEmbedField>

    public constructor(title: string, table: string[][]) {
        this.validate2dArray(table)
        this.title = title
        this.table = table
        this.headers = table[0]
        this.rows = table.length
        this.columns = table[0].length
        this.body = [...table]
        this.body.shift()

        this.asString = this.toString();
        this.asDiscordEmbedFields = this.toDiscordEmbedFields();
    }

    // NOTE: Discord embeds normalize whitespace apparently so using this is no go
    private toString() {
        let result = "";
        const maxLengths = Array.from({ length: this.table[0].length }, () => 0);
        const border = () => "+" + maxLengths.map(len => "-".repeat(len + 2)).join("+") + "+"

        // Find maximum length for each column
        for (let i = 0; i < this.table.length; i++) {
            for (let j = 0; j < this.table[i].length; j++) {
                maxLengths[j] = Math.max(maxLengths[j], this.table[i][j].length);
            }
        }

        // Add top border
        result += border + "\n";

        // Add rows with content and borders
        for (let i = 0; i < this.table.length; i++) {
            result += "| ";
            for (let j = 0; j < this.table[i].length; j++) {
                const cell = this.table[i][j].padEnd(maxLengths[j]);
                result += cell + " | ";
            }
            result += "\n";

            // Add horizontal border between rows
            if (i < this.table.length - 1) {
                result += border + "\n";
            }
        }

        // Add bottom border
        result += border;

        return result;
    }

    /**Requirs `this.headers` and `this.body` to be laoded first*/
    private toDiscordEmbedFields(): Discord.RestOrArray<Discord.APIEmbedField> {

        const fields: Discord.RestOrArray<Discord.APIEmbedField> = []

        for (let headerIndex = 0; headerIndex < this.headers.length; headerIndex++) {
            // One table uses one field per column, in the event of two tables being
            // sent in the same embed message the field of the set not being inline should
            // put this set on another row
            const inline = (headerIndex == 0) ? false : true

            const field: Discord.APIEmbedField = { name: this.headers[headerIndex], value: "", inline }

            for (let rowIndex = 0; rowIndex < this.body.length; rowIndex++)
                field.value += this.body[rowIndex][headerIndex] + "\n"

            fields.push(field)
        }

        return fields
    }

    /***************************************************************************
    * Validators
    ***************************************************************************/
    private validate2dArray(array2d: (number | string | boolean | object)[][]): void {

    }
}