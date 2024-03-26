import http from "http"

export function keepAlive() {
    http.createServer((req, res) => {
        res.write("I'm alive")
        res.end()
    }).listen(8080)
}
keepAlive()