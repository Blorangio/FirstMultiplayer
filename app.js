let express = require("express");
const { SocketAddress } = require("net");
let app = express();
let serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2193);
console.log("Server started.");

let socketList = [];

function encode(arr) {
    let str = "";
    for(let i in arr) {
        str += arr[i].id + ":" + arr[i].x + ":" + arr[i].y;
        if(arr[i].inDungeon) {
            str+=":1";
        } else {
            str+=":0";
        }
        if(arr[i].isOn) {
            str+=":" + arr[i].fx + ":" + arr[i].fy;
        }
        if(i!=arr.length-1) {
            str+=",";
        }
    }
    return str;
}

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

}

class Shape {
    constructor(points) {
        this.points = points;
    }
    translate(x, y) {
        for(let i in this.points) {
            this.points[i].add(new Point(x, y));
        }
    }
    getPosition() {
        let total = new Point(0, 0);
        for(let i in this.points) {
            total.add(this.points[i]);
        }
        if(total.x != 0 || total.y != 0) {
            total.divide(this.points.length);
        }
        return total;
    }
    setPosition(x, y) {
        for(let i in this.points) {
            this.points[i].x = x;
            this.points[i].y = y;
        }
    }
}

class ColliderResponse {
    constructor(isColliding, normal, depth) {
        this.isColliding = isColliding;
        this.normal = normal;
        this.depth = depth;
    }
}

function projectPoints(points, axis) {
    let returnValue = [1000000, -1000000];
    axis.normalize();
    for(let i = 0;i<points.length;i++) {
        let projection = points[i].dotProduct(axis);
        returnValue[0] = Math.min(returnValue[0], projection);
        returnValue[1] = Math.max(returnValue[1], projection);
    }
    return returnValue;
}

function polygonCollision(shape1, shape2) {
    let returnDepth = -1;
    let returnNormal = new Point(0, 0);
    let pointsA = shape1.points;
    let pointsB = shape2.points;
    
    for(let i = 0;i<pointsA.length;i++) {
        let va = pointsA[i];
        let vb = pointsA[(i+1)%pointsA.length];
        
        let edge = new Point(vb.x - va.x, vb.y - va.y);
        let axis = new Point(-edge.y, edge.x);
        
        let minMaxA = projectPoints(pointsA, axis);
        let minMaxB = projectPoints(pointsB, axis);
        
        if(minMaxA[0] >= minMaxB[1] || minMaxB[0] >= minMaxA[1]) {
            return new ColliderResponse(false, new Point(0, 0), 0);
        }
        
        let axisDepth = Math.min(minMaxB[1] - minMaxA[0], minMaxA[1] - minMaxB[0]);
        if(axisDepth<returnDepth||returnDepth==-1) {
            returnDepth = axisDepth;
            returnNormal = axis;
        }
    }
    
    for(let i = 0;i<pointsB.length;i++) {
        let va = pointsB[i];
        let vb = pointsB[(i+1)%pointsB.length];
        
        let edge = new Point(vb.x - va.x, vb.y - va.y);
        let axis = new Point(-edge.y, edge.x);
        
        let minMaxA = projectPoints(pointsB, axis);
        let minMaxB = projectPoints(pointsA, axis);
        
        if(minMaxA[0] >= minMaxB[1] || minMaxB[0] >= minMaxA[1]) {
            return new ColliderResponse(false, new Point(0, 0), 0);
        }
        
        let axisDepth = Math.min(minMaxB[1] - minMaxA[0], minMaxA[1] - minMaxB[0]);
        if(axisDepth<returnDepth||returnDepth==-1) {
            returnDepth = axisDepth;
            returnNormal = axis;
        }
    }
    returnNormal.normalize();
    
    let shapeLine = new Point(shape1.getPosition().x - shape2.getPosition().x, shape1.getPosition().y - shape2.getPosition().y);
    let angle = shapeLine.dotProduct(returnNormal);
    
    if(angle > 0) {
        returnNormal.x = -returnNormal.x;
        returnNormal.y = -returnNormal.y;
    }
    return new ColliderResponse(true, returnNormal, returnDepth);
}

function genRect(x, y, width, height) {
    let tempPoints = [];
    tempPoints.push(new Point(x, y));
    tempPoints.push(new Point(x, y+height));
    tempPoints.push(new Point(x+width, y+height));
    tempPoints.push(new Point(x+width, y));
    return new Shape(tempPoints);
}

let MAP = 0;

class Map {
    constructor(mainEntrance, fireEscapes) {
        this.mainEntrance = mainEntrance;
        this.fireEscapes = fireEscapes;
    }
}

let dungeon = [];

/*
Possible Rooms: *Name followed by ID*
    Entrance   0
    Scrap Room
        Variants (1, 2, 3) *Same thing but just a different look*
    Hallway 4
    Bend 5
    Three Way 6
    Four Way 7
    Dead End 8

Possible Addons:
    Vent
    Fire Escape
    Scrap
    Key
    Locked Door
    Door

Possible Scrap: *Name  |  Value Range  |  Spawn Chance*
    Large Bolt    | 20-32  | 2/6
    Cash Register | 80-160 | 1/12
    V-type Engine | 20-56  | 1/12
    Candy         | 6-36   | 2/6
    Present       | 12-28  | 1/12
    Large Axel    | 36-56  | 1/12
 */

let dungeonSize = 20;

let downs =  [11, 12, 13, 20, 22, 32, 41, 42, 50, 52, 61, 62, 71, 72, 73, 80, 81, 82, 83, 92];
let ups =    [10, 11, 13, 20, 22, 30, 40, 43, 50, 52, 60, 63, 70, 71, 73, 80, 81, 82, 83, 90];
let lefts =  [10, 13, 12, 21, 23, 33, 43, 42, 51, 53, 63, 62, 70, 72, 73, 80, 81, 82, 83, 93];
let rights = [10, 11, 12, 21, 23, 31, 40, 41, 51, 53, 60, 61, 70, 71, 72, 80, 81, 82, 83, 91];

class Room {
    constructor(type, position) {
        this.type = type;
        this.position = position;
    }
    loadRoom() {
        
    }
}

function remove(arr, id) {
    let temp = [];
    for(let i in arr) {
        if(i!=id) {
            temp.push(arr[i]);
        }
    }
    return temp;
}

function any(arr, item) {
    for(let i in arr) {
        if(arr[i]==item) {
            return true;
        }
    }
    return false;
}

function getDirectionsForSquare(type) {
    let rtnVal = [];
    rtnVal.push(any(ups, type));
    rtnVal.push(any(rights, type));
    rtnVal.push(any(downs, type));
    rtnVal.push(any(lefts, type));
    return rtnVal;
}

function removeDuplicates(arr) {
    let rtnVal = [];
    for(let i in arr) {
        if(!any(rtnVal, arr[i])) {
            rtnVal.push(arr[i]);
        }
    }
    return rtnVal;
}

function checkOpenPaths(x, y) {
    //Flood fill from the room that you are trying to add to see if it can reach the unfinished squares or if it completes the full grid
    let q = [dungeon[y][x]];
    for(let i = 0;i<q.length;i++) {
        let c = q[i];
        if(c!=undefined) {
            let paths = getDirectionsForSquare(c.type);
            if(paths[0]) {
                q.push(dungeon[c.position.x-1][c.position.y]);
            }
            if(paths[1]) {
                if(c.position.y+1>=dungeon[c.position.x].length) {
                    return false;
                } else {
                    q.push(dungeon[c.position.x][c.position.y+1]);
                }
            }
            if(paths[2]) {
                if(c.position.x+1>=dungeon.length) {
                    return false;
                } else {
                    q.push(dungeon[c.position.x+1][c.position.y]);
                }
            }
            if(paths[3]) {
                q.push(dungeon[c.position.x][c.position.y-1]);
            }
            q = removeDuplicates(q);
        }
    }
    if(q.length==dungeonSize*dungeonSize) {
        return false;
    } else {
        return true;
    }
}

function intersect(arr1, arr2) {
    let rtnVal = [];
    for(let i in arr1) {
        if(any(arr2, arr1[i])) {
            rtnVal.push(arr1[i]);
        }
    }
    return rtnVal;
}

function subtract(arr1, arr2) {
    let rtnVal = [];
    for(let i in arr1) {
        if(!any(arr2, arr1[i])) {
            rtnVal.push(arr1[i]);
        }
    }
    return rtnVal;
}

function add(arr1, arr2) {
    let rtnVal = [];
    for(let i in arr2) {
        if(!any(rtnVal, arr2[i])) {
            rtnVal.push(arr2[i]);
        }
    }
    for(let i in arr1) {
        if(!any(rtnVal, arr1[i])) {
            rtnVal.push(arr1[i]);
        }
    }
    return rtnVal;
}

function contains(arr1, arr2) {
    for(let i in arr1) {
        for(let j in arr1[i]) {
            for(let k in arr2) {
                if(arr1[i][j].type == arr2[k]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function randomType(y, x) {
    //get adjacent rooms information
    //0: up, 1: right, 2: down, 3: left
    //-1 means that it is a wall, 0 means it is currently empty, 1 means that it is a passage
    let available = [0, 0, 0, 0];
    if(y-1<0) {
        available[0] = -1;
    } else {
        if(any(downs, dungeon[y-1][x].type)) {
            available[0] = 1;
        } else {
            available[0] = -1;
        }
    }
    if(y+1>=dungeonSize) {
        available[2] = -1;
    } else {
        if(y+1<dungeon.length) {
            if(any(ups, dungeon[y+1][x].type)) {
                available[2] = 1;
            } else {
                available[2] = -1;
            }
        }
    }
    if(x-1<0) {
        available[3] = -1;
    } else {
        if(any(rights, dungeon[y][x-1].type)) {
            available[3] = 1;
        } else {
            available[3] = -1;
        }
    }
    if(x+1>=dungeonSize) {
        available[1] = -1;
    } else {
        if(!(x+1<dungeon.length)) {
            available[1] = -1;
        }
    }
    //Get a list of all possible rooms that can generate
    let allDirections = [ups, rights, downs, lefts];

    let finalList = [];
    finalList = add(finalList, ups);
    finalList = add(finalList, rights);
    finalList = add(finalList, downs);
    finalList = add(finalList, lefts);
    for(let i in available) {
        if(available[i]==1) {
            if(finalList[0]==0) {
                finalList = allDirections[i];
            } else {
                finalList = intersect(finalList, allDirections[i]);
            }
        }
    }
    for(let i in available) {
        if(available[i] == -1) {
            finalList = subtract(finalList, allDirections[i]);
        }
    }

    if(finalList[0]!=0) {
        if(!((any(finalList, 10)||any(finalList, 11)||any(finalList, 12)||any(finalList, 13))&&!contains(dungeon, [10, 11, 12, 13]))||contains(dungeon, [10, 11, 12, 13])) {
            for(let i = 0;i<finalList.length;i++) {
                if(finalList[i]==10||finalList[i]==11||finalList[i]==12||finalList[i]==13) {
                    finalList = remove(finalList, i);
                    i--;
                }
            }
            let index = parseInt(Math.random() * finalList.length);
            let startIndex = index;
            dungeon[y][x] = new Room(finalList[index], new Point(y, x));
            while(checkOpenPaths(x, y)) {
                index++;
                if(index >= finalList.length) {
                    index = 0;
                }
                if(startIndex == index) {
                    break;
                }
                dungeon[y][x] = new Room(finalList[index], new Point(y, x));
            }
        } else {
            for(let i = 10;i<14;i++) {
                if(any(finalList, i)) {
                    dungeon[y][x] = new Room(i, new Point(y, x));
                }
            }
        }
    } else {
        dungeon[y][x] = new Room(-1, new Point(y, x));
    }
}

function loadDungeon() {
    for(let i = 0;i<dungeonSize;i++) {
        dungeon.push([]);
        for(let j = 0;j<dungeonSize;j++) {
            dungeon[i].push(new Room(randomType(i, j), new Point(i, j)));
        }
    }
}

loadDungeon();

// for(let i in dungeon) {
//     let str = "";
//     for(let j = 0;j<dungeon[i].length-1;j++) {
//         str+=dungeon[i][j].type + " | ";
//     }
//     console.log(str);
//     str="";
//     for(let j = 0;j<dungeon[i].length*5-5;j++) {
//         str+="-"
//     }
//     console.log(str);
// }

function encodeDungeon() {
    let str = "";
    for(let i in dungeon) {
        for(let j = 0;j<dungeon[i].length-1;j++) {
            str+=dungeon[i][j].type+"";
            if(j+1==dungeon[i].length-1) {
                str+=":";
            } else {
                str+=",";
            }
        }
    }
    return str;
}

let maps = [new Map(new Point(200, 200), [new Point(400, 300), new Point(300, 400)])];
let map = new Map(new Point(0, 0), []);
map = maps[MAP];

let io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
    socket.id = socketList.length;
    socket.x = 0;
    socket.y = 0;
    socket.UP = false;
    socket.DOWN = false;
    socket.LEFT = false;
    socket.RIGHT = false;
    socket.fx = 0;
    socket.fy = 0;
    socket.isOn = false;
    socket.inDungeon = false;
    socket.SPEED = 3;
    socketList[socket.id] = socket;

    socket.emit("init", {
        msg:socket.id,
        map:MAP+''
    });

    socket.emit("dungeonData", {
        data:encodeDungeon()
    })

    socket.on("data", function(data) {
        socket.UP = data.UP;
        socket.DOWN = data.DOWN;
        socket.LEFT = data.LEFT;
        socket.RIGHT = data.RIGHT;
    });

    socket.on("flashlight", function(data) {
        socket.fx = data.x;
        socket.fy = data.y;
    });

    socket.on("click", function() {
        socket.isOn = !socket.isOn;
    });

    socket.on("inDungeon", function() {
        socket.inDungeon = true;
        socket.x = 0;
        socket.y = 0;
    });

    console.log('socket connection');
});

let time = new Date();

function loop() {
    let currentTime = time.getMilliseconds();

    gameLoop();

    let nextTime = time.getMilliseconds();
    let diff = nextTime - currentTime;
    let delay = 20 - diff;
    setTimeout(loop, delay);
}

function gameLoop() {
    for(let i in socketList) {
        let up = socketList[i].UP;
        let down = socketList[i].DOWN;
        let left = socketList[i].LEFT;
        let right = socketList[i].RIGHT;
        vX = 0;
        vY = 0;
        if(up==true) {
            vY-=1;
        }
        if(down==true) {
            vY+=1;
        }
        if(left==true) {
            vX-=1;
        }
        if(right==true) {
            vX+=1;
        }
        
        let movement = new Point(vX, vY);
        
        if(vX!=0 && vY!=0) {
            movement.normalize();
        }
        socketList[i].x+=movement.x*socketList[i].SPEED;
        socketList[i].y+=movement.y*socketList[i].SPEED;
    }

    for(let i in socketList) {
        for(let j in socketList) {
            if(i!=j&&socketList[i].inDungeon==socketList[j].inDungeon) {
                let collisionUpdate = polygonCollision(genRect(socketList[i].x, socketList[i].y, 50, 50), genRect(socketList[j].x, socketList[j].y, 50, 50));
                if(collisionUpdate.isColliding) {
                    socketList[i].x -= collisionUpdate.depth * collisionUpdate.normal.x/2;
                    socketList[i].y -= collisionUpdate.depth * collisionUpdate.normal.y/2;
                    socketList[j].x += collisionUpdate.depth * collisionUpdate.normal.x/2;
                    socketList[j].y += collisionUpdate.depth * collisionUpdate.normal.y/2;
                }
            }
        }
    }

    for(let i in socketList) {
        if(!socketList[i].inDungeon) {
            let collisionUpdate = polygonCollision(genRect(map.mainEntrance.x+25, map.mainEntrance.y+25, 20, 100), genRect(socketList[i].x, socketList[i].y, 50, 50));
            if(collisionUpdate.isColliding) {
                socketList[i].x += collisionUpdate.depth * collisionUpdate.normal.x;
                socketList[i].y += collisionUpdate.depth * collisionUpdate.normal.y;
            }
            for(let j in map.fireEscapes) {
                collisionUpdate = polygonCollision(genRect(map.fireEscapes[j].x+25, map.fireEscapes[j].y+25, 20, 100), genRect(socketList[i].x, socketList[i].y, 50, 50));
                if(collisionUpdate.isColliding) {
                    socketList[i].x += collisionUpdate.depth * collisionUpdate.normal.x;
                    socketList[i].y += collisionUpdate.depth * collisionUpdate.normal.y;
                }
            }
        }
    }

    let data = encode(socketList);
    for(let i in socketList) {
        socketList[i].emit("playerData", {
            msg:data
        });
    }
}

loop();