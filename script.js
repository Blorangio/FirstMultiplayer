let camera = new Camera(new Point(0, 0));
let player = new Player(genRect(100, 100, 50, 50));

let box = new Shape([new Point(0, 0), new Point(30, 50), new Point(50, 30)]);

let immovableCollisions = [box];

let SPEED = 3;

function gameLoop() {
    clearCanvas();
    move(player);

    for(let i in immovableCollisions) {
        let current = immovableCollisions[i];
        let collisionUpdate = polygonCollision(current, player);
        if(collisionUpdate.isColliding) {
            player.translate(collisionUpdate.depth * collisionUpdate.normal.x, collisionUpdate.depth * collisionUpdate.normal.y);
            camera.position.x = player.getPosition().x - 500;
            camera.position.y = player.getPosition().y - 562/2;
        }
    }

    paint.fillStyle = "orange";
    drawShape(player);
    paint.fillStyle = "black";
    drawShape(box);
}

loop();