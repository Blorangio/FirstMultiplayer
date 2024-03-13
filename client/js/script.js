let socket = io();
let ID = "";

let players = [];

function decode(str) {
    let arr = str.split(",");
    for(let i in arr) {
        arr[i] = arr[i].split(":");
    }
    return arr;
}

socket.on("init", function(data) {
    ID = data.msg;
});

let canvas = document.getElementById("mainCanvas");
let paint = canvas.getContext("2d");

function clearCanvas() {
    paint.clearRect(0, 0, 1000, 562);
}

let up = false;
let down = false;
let left = false;
let right = false;

document.body.onkeydown = function(e, event) {
    if(e.keyCode == 68 || e.keyCode == 39) {
        right = true;
    } else if(e.keyCode == 87 || e.keyCode == 38) {
        up = true;
    } else if(e.keyCode == 83 || e.keyCode == 40) {
        down = true;
    } else if(e.keyCode == 65 || e.keyCode == 37) {
        left = true;
    }
}

document.body.onkeyup = function(e, event) {
    if(e.keyCode == 68 || e.keyCode == 39) {
        right = false;
    } else if(e.keyCode == 87 || e.keyCode == 38) {
        up = false;
    } else if(e.keyCode == 83 || e.keyCode == 40) {
        down = false;
    } else if(e.keyCode == 65 || e.keyCode == 37) {
        left = false;
    }
}

let cameraX = 0;
let cameraY = 0;

socket.on("playerData", function(data) {
    players = decode(data.msg);
    for(let i in players) {
        if(i==parseInt(ID)) {
            cameraX = 500-players[i][1];
            cameraY = 562/2-players[i][2];
        }
    }
    clearCanvas();
    paint.fillStyle = "orange";
    for(let i in players) {
        paint.fillRect(parseInt(players[i][1])-25+cameraX, parseInt(players[i][2])-25+cameraY, 50, 50);
    }
    socket.emit("data", {
        UP:up,
        DOWN:down,
        LEFT:left,
        RIGHT:right
    });
});