let socket = io();
let ID = "";

let cameraX = 0;
let cameraY = 0;

let players = [];

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(point) {
        this.x+=point.x;
        this.y+=point.y;
    }
    divide(num) {
        this.x /= num;
        this.y /= num;
    }
    multiply(num) {
        this.x *= num;
        this.y *= num;
    }
    subtract(point) {
        this.x -= point.x;
        this.y -= point.y;
    }
    length() {
        return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
    }
    normalize() {
        this.divide(this.length());
    }
    dotProduct(point) {
        return this.x * point.x + this.y * point.y;
    }
    distanceFrom(point) {
        return Math.sqrt(Math.pow(this.x-point.x, 2)+Math.pow(this.y-point.y, 2));
    }
}

class Map {
    constructor(mainEntrance, fireEscapes) {
        this.mainEntrance = mainEntrance;
        this.fireEscapes = fireEscapes;
    }
}

let maps = [new Map(new Point(200, 200), [new Point(400, 300), new Point(300, 400)])];
let map = new Map(new Point(0, 0), []);

function decode(str) {
    console.log(str);
    let arr = str.split(",");
    for(let i in arr) {
        arr[i] = arr[i].split(":");
    }
    return arr;
}

socket.on("init", function(data) {
    ID = data.msg;
    map = maps[parseInt(data.map)];
});

let canvas = document.getElementById("mainCanvas");
canvas.style.zIndex = "0";
let paint = canvas.getContext("2d");

let opacityCanvas = document.getElementById("opacityCanvas");
opacityCanvas.style.zIndex = "10";
let shadow = opacityCanvas.getContext("2d");

let size = 160;

let doorWidth = 20;
let doorHeight = 100;

function clearCanvas() {
    paint.clearRect(0, 0, 1000, 562);
    paint.fillStyle = "black";
    //Default background
    for(let i =-2;i<1000/size+2;i++) {
        for(let j=-1;j<562/size+4;j++) {
            if((i+j)%2==0) {
                paint.fillRect(i*size+cameraX%(size*2), (j-1)*size+cameraY%(size*2), size, size);
            }
        }
    }
    //render the doors from the map
    if(players[parseInt(ID)][3]=="0") {
        paint.fillStyle = "red";
        paint.fillRect(cameraX + map.mainEntrance.x, cameraY + map.mainEntrance.y, doorWidth, doorHeight);
        for(let i in map.fireEscapes) {
            paint.fillRect(cameraX + map.fireEscapes[i].x, cameraY + map.fireEscapes[i].y, doorWidth, doorHeight);
        }
    } else {
        for(let i in dungeon) {
            for(let j in dungeon[i]) {
                loadRoom(new Point(i, j));
            }
        }
    }
}

function addLight(ctx, intsy, amb, xStart, yStart, rStart, xEnd, yEnd, rEnd, xOff, yOff) {
    xOff = xOff || 0;
    yOff = yOff || 0;
    var g = ctx.createRadialGradient(xStart, yStart, rStart, xEnd, yEnd, rEnd);
    g.addColorStop(1, 'rgba(0,0,0,' + (1 - intsy) + ')');
    g.addColorStop(0, amb);
    ctx.fillStyle = g;
    //ctx.fillRect(xStart - rEnd + xOff, yStart - rEnd + yOff, xEnd + rEnd, yEnd + rEnd);
    ctx.fillRect(0, 0, 1000, 562);
}

let up = false;
let down = false;
let left = false;
let right = false;
let collect = false;

document.body.onkeydown = function(e, event) {
    if(e.keyCode == 68 || e.keyCode == 39) {
        right = true;
    } else if(e.keyCode == 87 || e.keyCode == 38) {
        up = true;
    } else if(e.keyCode == 83 || e.keyCode == 40) {
        down = true;
    } else if(e.keyCode == 65 || e.keyCode == 37) {
        left = true;
    } else if(e.keyCode == 69 || e.keyCode == 96) {
        collect = true;
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
    } else if(e.keyCode == 69 || e.keyCode == 96) {
        collect = false;
    }
}

let distance = 200;

function close() {
    if(map.mainEntrance.distanceFrom(new Point(parseInt(players[parseInt(ID)][1])+25+10, parseInt(players[parseInt(ID)][2])-50)) < distance) {
        return [true, -1];
    } else {
        for(let i in map.fireEscapes) {
            if(map.fireEscapes[i].distanceFrom(new Point(parseInt(players[parseInt(ID)][1])+25-10, parseInt(players[parseInt(ID)][2])-50)) < distance) {
                return [true, i];
            }
        }
    }
    return [false, -1];
}

function dropDown(message) {
    shadow.fillStyle = "white";
    shadow.fillRect(400, 50, 200, 100);
    shadow.fillStyle = "black";
    shadow.lineWidth = 4;
    shadow.strokeRect(400, 50, 200, 100);
    shadow.lineWidth = 1;
    shadow.font = "1px Arial";
    let temp = 180/shadow.measureText(message).width;
    if(temp>90) {
        temp = 90;
    }
    shadow.font = temp+"px Arial";
    shadow.fillText(message, 500-shadow.measureText(message).width/2, 100+parseInt(shadow.font.replace("px", "").split(" ")[0])/4);
}

let dungeon = [];

let mouse = new Point(0, 0);
let flashlight = false;

opacityCanvas.addEventListener("mousemove", function(e) {
    mouse.x = e.x - opacityCanvas.getBoundingClientRect().left;
    mouse.y = e.y - opacityCanvas.getBoundingClientRect().top;
});

opacityCanvas.addEventListener("click", function() {
    flashlight = !flashlight;
    socket.emit("click", {});
});

function decodeDungeon(str) {
    let temp = str.split(":");
    for(let i in temp) {
        dungeon.push(temp[i].split(","));
    }
    for(let i in dungeon) {
        for(let j in dungeon[i]) {
            dungeon[i][j] = parseInt(dungeon[i][j]);
        }
    }
    // for(let i in dungeon) {
    //     let str = "";
    //     for(let j = 0;j<dungeon[i].length;j++) {
    //         str+=dungeon[i][j] + " | ";
    //     }
    //     console.log(str);
    //     str="";
    //     for(let j = 0;j<dungeon[i].length*5-5;j++) {
    //         str+="-"
    //     }
    //     console.log(str);
    // }
}

socket.on("dungeonData", function(data) {
    decodeDungeon(data.data);
});

let roomSize = 500;
let wallColor = "gray";

function loadRoom(position) {
    let type = Math.floor(dungeon[position.x][position.y]/10);
    let rotation = dungeon[position.x][position.y]%10;
    paint.save();
    switch(type) {
        case 1: //Entrance Room
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, 50, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(roomSize/2, 50, 20, roomSize/2-50);
            break;
        case 2: //Scrap Room 1
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize);
            break;
        case 3: //Scrap Room 2
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize);
            break;
        case 4: //Scrap Room 3
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(roomSize/2, 50, 20, roomSize/2-50);
            break;
        case 5: //Hallway
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize);
            break;
        case 6: //Bend
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(roomSize/2, 50, 20, roomSize/2-50);
            break;
        case 7:
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, 50, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(roomSize/2, 50, 20, roomSize/2-50);
            break;
        case 8:
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, 50, 20, roomSize/2-50);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, roomSize/2, roomSize/2-50, 20);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize/2-50);
            paint.fillRect(roomSize/2, 50, 20, roomSize/2-50);
            break;
        case 9:
            paint.translate(position.y*roomSize+roomSize/2+cameraX, position.x*roomSize+roomSize/2+cameraY);
            paint.rotate((2*Math.PI)*rotation/4);
            paint.fillStyle = wallColor;
            paint.fillRect(-roomSize/2, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(50, -roomSize/2, roomSize/2-50, 20);
            paint.fillRect(-roomSize/2, roomSize/2, roomSize, 20);
            paint.fillRect(-roomSize/2, -roomSize/2, 20, roomSize);
            paint.fillRect(roomSize/2, -roomSize/2, 20, roomSize);
            break;
    }
    paint.restore();
}

function enterDungeon(entrance) {
    socket.emit("inDungeon");
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

    socket.emit("data", {
        UP:up,
        DOWN:down,
        LEFT:left,
        RIGHT:right
    });

    shadow.fillStyle = "black";
    shadow.fillRect(0, 0, 1000, 562);
    shadow.fillStyle = 'rgba(0,0,0,' + (1 - .1) + ')';
    shadow.globalCompositeOperation = 'xor';
    addLight(shadow, 1.0, 'rgba(0,0,0,' + (1.0 - .5) + ')', parseInt(players[parseInt(ID)][1])+cameraX,  parseInt(players[parseInt(ID)][2])+cameraY, 0, parseInt(players[parseInt(ID)][1])+cameraX,  parseInt(players[parseInt(ID)][2])+cameraY, 70);
    let tempMouse = new Point(mouse.x, mouse.y);
    mouse.subtract(new Point(parseInt(players[parseInt(ID)][1])+cameraX, parseInt(players[parseInt(ID)][2])+cameraY));
    mouse.normalize();
    if(flashlight) {
        socket.emit("flashlight", {
            x:mouse.x,
            y:mouse.y
        });
    }
    shadow.globalCompositeOperation = 'source-over';
    mouse.x = tempMouse.x;
    mouse.y = tempMouse.y;

    paint.fillStyle = "orange";
    for(let i in players) {
        if(players[i][3]==players[parseInt(ID)][3]) {
            paint.fillRect(parseInt(players[i][1])-25+cameraX, parseInt(players[i][2])-25+cameraY, 50, 50);
            if(players[i].length>4) {
                shadow.fillStyle = 'rgba(0,0,0,' + (1 - .1) + ')';
                shadow.globalCompositeOperation = 'xor';
                addLight(shadow, 1.0, 'rgba(0,0,0,' + (1 - .1) + ')', parseInt(players[i][1])+cameraX,  parseInt(players[i][2])+cameraY, 0, parseInt(players[i][1])+cameraX+parseFloat(players[i][4])*120,  parseInt(players[i][2])+cameraY+parseFloat(players[i][5])*120, 200);
                shadow.globalCompositeOperation = 'source-over';
            }
        }
    }

    let isClose = close();
    if(isClose[0]&&players[parseInt(ID)][3]=="0") {
        dropDown("Press E to Enter");
        if(collect) {
            enterDungeon(isClose[1]);
        }
    }
});