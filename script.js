let camera = new Camera(new Point(0, 0));
let player = new Player(genRect(100, 100, 50, 50));

let SPEED = 3;

function gameLoop() {
    clearCanvas();
    move(player);
    paint.fillStyle = "orange";
    drawShape(player);
}

loop();