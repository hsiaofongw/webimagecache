const serverEndPoint = "";
const apiEndPoint = {
    "log": "/api/hello"
};

function getJWT() {
    if ("jwt" in window.localStorage) {
        if (window.localStorage["jwt"]) {
            return window.localStorage["jwt"];
        }
    }

    return "";
}

function updateJWT(jwt) {
    window.localStorage["jwt"] = jwt;
}

function tick() {
    // fetch(serverEndPoint+apiEndPoint.log, {
    //     "method": "POST",
    //     "body": JSON.stringify({
    //         "jwt": getJWT()
    //     }),
    //     "headers": {
    //         "Content-Type": "application/json"
    //     }
    // }).then(d => d.jwt).then(jwt => updateJWT(jwt))
    // .catch(e => console.log(e));
}

const period = 4000;

window.setInterval(
    () => tick(),
    period
)