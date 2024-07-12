import { _decorator, BoxCollider2D, Camera, Component, EPhysics2DDrawFlags, ERaycast2DType, ERigidBody2DType, EventTouch, Graphics, instantiate, log, Node, PhysicsSystem2D, PolygonCollider2D, Prefab, RenderTexture, RigidBody2D, Sprite, SpriteFrame, UITransform, v2, v3, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

//点距离
const POINT_DISTANCE = 20;
//点角度
const POINT_ANGLE = 2;

@ccclass('Main')
export class Main extends Component {
    @property(Camera)
    camera_water: Camera = null;

    @property(Sprite)
    sp_water_show: Sprite = null;

    @property(Node)
    node_water_layer: Node = null

    @property(Node)
    node_generate: Node = null

    @property(Node)
    glass_line: Node = null;

    @property(Prefab)
    prefab_water: Prefab = null;


    private _water_pool: Node[] = [];
    private _water_pool_active: Node[] = [];

    touchStartPoint: Vec3 = null;
    bIsTouchMoved: boolean = false;

    @property(Prefab)
    graphicsNode: Prefab = null;

    line_point: Vec2[] = [];

    curGrNode: Node = null;
    AllGrNodeArr: Node[] = [];
    lastAngle: number;

    protected onLoad(): void {
        // PhysicsSystem2D.instance.debugDrawFlags = EPhysics2DDrawFlags.Aabb |
        // EPhysics2DDrawFlags.Pair |
        // EPhysics2DDrawFlags.CenterOfMass |
        // EPhysics2DDrawFlags.Joint |
        // EPhysics2DDrawFlags.Shape;

        const spriteFrame = new SpriteFrame();
        const texture = new RenderTexture();
        texture.initialize({width: this.sp_water_show.node.getComponent(UITransform).width, height: this.sp_water_show.node.getComponent(UITransform).height});
        this.camera_water.targetTexture = texture;
        spriteFrame.texture = texture;
        this.sp_water_show.spriteFrame = spriteFrame;

        this.bIsTouchMoved = false;
        this.CreatAGrNode();

        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private _waterGenrateCount = 0;

    private generateWater()
    {
        this.resetWater();
        for (let index = 0; index < 80; index++)
        {
            let node_water = this._water_pool.shift();
            if (!node_water)
            {
                node_water = instantiate(this.prefab_water);
                this.node_water_layer.addChild(node_water);
                node_water.setSiblingIndex(0);
            }
            node_water.active = false;
            node_water.setScale(0.5, 0.5);
            node_water.setPosition(Math.random() * 10 - 5 + this.node_generate.getPosition().x, this.node_generate.getPosition().y);
            node_water.getComponent(RigidBody2D).linearVelocity = v2(0, 0);
            this._water_pool_active.push(node_water);
        }
        this._waterGenrateCount = 0;
        this.schedule(this.scheduleWater, 0.02, this._water_pool_active.length - 1);
    }

    private scheduleWater()
    {
        this._water_pool_active[this._waterGenrateCount++].active = true;
    }

    private resetWater()
    {
        this.unschedule(this.scheduleWater);
        this._water_pool_active.forEach((v) =>
        {
            v.active = false;
            this._water_pool.push(v)
        })
        this._water_pool_active = [];
        // this.glass_line.getComponent(GlassLine).resetLineCrossingNum();
    }

    ResetGame()
    {
        this.resetWater();

        this.AllGrNodeArr.forEach((node)=>{
            node.removeFromParent();
            node.destroy();
        })
        this.AllGrNodeArr = [];
        this.CreatAGrNode();
    }

    onTouchStart(touch: EventTouch)
    {
        let touchPos = touch.getUILocation();
        this.touchStartPoint = this.node_water_layer.getComponent(UITransform).convertToNodeSpaceAR(v3(touchPos.x, touchPos.y, 0))
        this.line_point = [];
        this.curGrNode.getComponent(Graphics).clear();
        this.curGrNode.getComponent(Graphics).moveTo(this.touchStartPoint.x, this.touchStartPoint.y);
        this.line_point.push(v2(this.touchStartPoint.x, this.touchStartPoint.y));
    }

    onTouchMove(touch: EventTouch)
    {
        if (!this.touchStartPoint)
        {
            return;
        }
        this.bIsTouchMoved = true;
        let touchPos = touch.getUILocation();
        let touchStartPoint = this.node_water_layer.getComponent(UITransform).convertToNodeSpaceAR(v3(touchPos.x, touchPos.y, 0));

        this.curGrNode.getComponent(Graphics).lineTo(touchStartPoint.x, touchStartPoint.y);

        //求两点之间的距离
        let subV = new Vec3();
        let lastPoint = this.line_point[this.line_point.length - 1];
        Vec3.subtract(subV, touchStartPoint, v3(lastPoint.x, lastPoint.y, 0))
        let lenV = subV.length();
        if (lenV > POINT_DISTANCE)
        {
            if (this.line_point.length > 1) {
                let secondLastPoint = this.line_point[this.line_point.length - 2];
                let curAngle = Math.atan2(touchStartPoint.y - secondLastPoint.y, touchStartPoint.x - secondLastPoint.x) * 180 / Math.PI;
                if (Math.abs(curAngle - this.lastAngle) > POINT_ANGLE)
                {
                    this.line_point.push(v2(touchStartPoint.x, touchStartPoint.y));
                    this.lastAngle = Math.atan2(touchStartPoint.y - lastPoint.y, touchStartPoint.x - lastPoint.x) * 180 / Math.PI;
                } else {
                    this.line_point[this.line_point.length - 1] = v2(touchStartPoint.x, touchStartPoint.y);
                }
            } else {
                this.line_point.push(v2(touchStartPoint.x, touchStartPoint.y));
                this.lastAngle = Math.atan2(touchStartPoint.y - lastPoint.y, touchStartPoint.x - lastPoint.x) * 180 / Math.PI;
            }
        }

        this.curGrNode.getComponent(Graphics).stroke();
    }

    onTouchEnd(touch: EventTouch)
    {
        if (!this.touchStartPoint)
        {
            return;
        }
        if (!this.bIsTouchMoved)
        {
            return;
        }

        let touchPos = touch.getUILocation();
        let touchStartPoint = this.node_water_layer.getComponent(UITransform).convertToNodeSpaceAR(v3(touchPos.x, touchPos.y, 0));
        this.line_point.push(v2(touchStartPoint.x, touchStartPoint.y));

        this.DrawPathOver();
        this.bIsTouchMoved = false;

        this.CreatAGrNode();
    }

    // 把本次划过的路线做成物理节点
    DrawPathOver()
    {
        let rigibodyLogic = this.curGrNode.addComponent(RigidBody2D);
        rigibodyLogic.gravityScale = 2;

        for (let i = 0; i < this.line_point.length - 1; i++) {
            let posBegin = this.line_point[i];
            let posEnd = this.line_point[i + 1];

            let rectPoints = this.getRectanglePoints(posBegin, posEnd);
            let graphicsBox = this.curGrNode.addComponent(PolygonCollider2D);
            graphicsBox.points = rectPoints;
            graphicsBox.apply();

        }
        
    }

    // 计算矩形的四个顶点
    getRectanglePoints(startPoint: Vec2, endPoint: Vec2): Vec2[]
    {
        let points = [];

        // 计算起始点和结束点之间的角度
        let angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
        // 计算矩形的半高
        let halfH = 10;

        // 计算矩形的四个顶点
        let p1 = new Vec2(
            startPoint.x - halfH * Math.sin(angle),
            startPoint.y + halfH * Math.cos(angle)
        );
        let p2 = new Vec2(
            endPoint.x - halfH * Math.sin(angle),
            endPoint.y + halfH * Math.cos(angle)
        );
        let p3 = new Vec2(
            endPoint.x + halfH * Math.sin(angle),
            endPoint.y - halfH * Math.cos(angle)
        );
        let p4 = new Vec2(
            startPoint.x + halfH * Math.sin(angle),
            startPoint.y - halfH * Math.cos(angle)
        );

        // 将四个顶点添加到数组中
        points.push(p1);
        points.push(p2);
        points.push(p3);
        points.push(p4);

        return points;
    }

    CreatAGrNode()
    {
        this.curGrNode = instantiate(this.graphicsNode);
        this.node_water_layer.addChild(this.curGrNode)
        
        this.AllGrNodeArr.push(this.curGrNode);
    }
}


