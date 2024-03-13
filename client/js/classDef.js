let ID = "";

socket.emit("reqData");

let FPS = 60;

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

class Player extends Shape {
    constructor(shape) {
        super(shape.points);
        this.attributes = ["speed:1", "inventory:-1,-1,-1,-1", "health:100"];
    }
    setAttributes(attributes) {
        this.attributes = attributes;
    }
    addAttributes(attributes) {
        for(let i in attributes) {
            this.attributes.push(attributes[i]);
        }
    }
    addAttribute(attribute) {
        this.addAttributes([attribute]);
    }
    getAttribute(attribute) {
        for(let i in this.attributes) {
            let name = this.attributes[i].split(":")[0];
            let returnVal = this.attributes[i].split(":")[1].split(",");
            if(returnVal.length==1) {
                returnVal = returnVal[0];
            }
            if(name == attribute.split(":")[0]) {
                if(attribute.split(":").length==1) {
                    return returnVal;
                } else {
                    let index = attribute.split(":")[1];
                    return returnVal[index];
                }
            }
        }
        return "None Defined";
    }
    setAttribute(attribute, value) {
        for(let i in this.attributes) {
            let name = this.attributes[i].split(":")[0];
            if(name==attribute.split(":")[0]) {
                let position = 0;
                if(attribute.split(":").length>1) {
                    position = attribute.split(":")[1];
                }
                let values = this.attributes[i].split(":")[1].split(",");
                values[position] = value;
                let valueString = "";
                for(let j in values) {
                    valueString+=values[j];
                    if(j!=values.length-1) {
                        valueString+=",";
                    }
                }
                this.attributes[i] = name + ":" + valueString;
                return;
            }
        }
        return "None Defined";
    }
}

class ColliderResponse {
    constructor(isColliding, normal, depth) {
        this.isColliding = isColliding;
        this.normal = normal;
        this.depth = depth;
    }
}

class Camera {
    constructor(position) {
        this.position = position;
    }
}