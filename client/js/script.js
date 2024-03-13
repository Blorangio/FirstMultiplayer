let gameStart = false;

let canvas = document.getElementById("mainCanvas");
let paint = canvas.getContext("2d");

let width = 200;
let height = 60;

paint.strokeRect(500-width/2, 562/2-height/2, width, height);
paint.font = "48px serif";
paint.textAlign="center";
paint.fillText("START", 500, 562/2+48/3);

document.body.onmousedown = function() {
    let temp = gameStart;
    gameStart = true;
    if(gameStart!=temp) {
        startGame();
    }
}

function startGame() {
    let socket = io();
    let ID = "";

    let cameraX = 0;
    let cameraY = 0;

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

    let size = 160;

    function clearCanvas() {
        paint.clearRect(0, 0, 1000, 562);
        paint.fillStyle = "black";
        for(let i =-2;i<1000/size+2;i++) {
            for(let j=-1;j<562/size+2;j++) {
                if((i+j)%2==0) {
                    paint.fillRect(i*size+cameraX%(size*2), (j-1)*size+cameraY%(size*2), size, size);
                }
            }
        }
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
}