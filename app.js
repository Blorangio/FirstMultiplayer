let express = require("express");
let app = express();
let serv = require('http').Server(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(2000);
console.log("Server started.");

let socketList = [];

function encode(arr) {
    let str = "";
    for(let i in arr) {
        str += arr[i].id + ":" + arr[i].x + ":" + arr[i].y;
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

let io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket) {
    socket.id = socketList.length;
    socket.x = 0;
    socket.y = 0;
    socket.UP = false;
    socket.DOWN = false;
    socket.LEFT = false;
    socket.RIGHT = false;
    socket.SPEED = 3;
    socketList[socket.id] = socket;

    socket.emit("init", {
        msg:socket.id
    });

    socket.on("data", function(data) {
        socket.UP = data.UP;
        socket.DOWN = data.DOWN;
        socket.LEFT = data.LEFT;
        socket.RIGHT = data.RIGHT;
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
            if(i!=j) {
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

    let data = encode(socketList);
    for(let i in socketList) {
        socketList[i].emit("playerData", {
            msg:data
        })
    }
}

loop();