import Wiki from "../lib/util/WikiParser.js";

console.log("ALL LINKS:")
console.log(await Wiki.fetchWikiLinks())

console.log("\nFILTERED LINKS:")
console.log(await Wiki.fetchMainWikiLinks())