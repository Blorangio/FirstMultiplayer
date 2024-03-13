function clearCanvas() {
    paint.clearRect(0, 0, 1000, 562);
}

function loop() {
    let currentTime = window.performance.now();

    gameLoop();

    let nextTime = window.performance.now();
    let diff = nextTime - currentTime;
    let delay = 20 - diff;
    setTimeout(loop, delay);
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

function drawShape(shape) {
    paint.beginPath();
    paint.moveTo(shape.points[shape.points.length-1].x - camera.position.x-25, shape.points[shape.points.length-1].y - camera.position.y-25);
    for(let i in shape.points) {
        paint.lineTo(shape.points[i].x - camera.position.x-25, shape.points[i].y - camera.position.y-25);
    }
    paint.fill();
}

function move(player) {
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
    player.translate(movement.x * SPEED, movement.y * SPEED);
    camera.position.x = player.getPosition().x - 500;
    camera.position.y = player.getPosition().y - 562/2;
}

function toObjects(firstArr) {
    let arr = [];
    for(let i in firstArr) {
        arr.push(genRect(parseInt(firstArr[i][1])+25, parseInt(firstArr[i][2])-25, 50, 50));
    }
    return arr;
}