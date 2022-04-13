const { Server } = require("udp-server"),
    { Worker } = require("worker_threads"),
    server = new Server();

/**
 * 서버 틱은 초당 20회
 * -> dt = 1000 / 20
 * 벡터 값을 기반으로 계산
 * 클라이언트 틱은 초당 60회(60 fps 고정을 기본으로 제작)
 * -> dt = 1000 / 60
 * 이동은 실시간 처리
 */

//#region 삭제
// /**
//  * @typedef Vector3
//  * @property {number} x
//  * @property {number} y
//  * @property {number} z
//  */

// const Vector = {
//     /**@type {(x: number, y: number, z: number) => Vector3} */
//     New(x, y, z) {
//         return new Object({ x, y, z });
//     },
//     /**@type {(v1: Vector3, v2: Vector3) => Vector3} */
//     Sum(v1, v2) {
//         return new Object({
//             x: v1.x + v2.x,
//             y: v1.y + v2.y,
//             z: v1.z + v2.z,
//         });
//     },
//     /**@type {(v1: Vector3, v2: Vector3) => Vector3} */
//     Def(v1, v2) {
//         return new Object({
//             x: v1.x - v2.x,
//             y: v1.y - v2.y,
//             z: v1.z - v2.z,
//         });
//     },
//     /**@type {(v: Vector3) => Vector3} */
//     Length(v) {
//         return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
//     },
//     /**@type {(v: Vector3) => Vector3} */
//     Normalized(v, n) {
//         if (!n) n = 1;

//         var l = Length(v);

//         return new Object({
//             x: (v.x / l) * n,
//             y: (v.y / l) * n,
//             z: (v.z / l) * n,
//         });
//     },
//     zero: new Object({ x: 0, y: 0, z: 0 }),
//     top: new Object({ x: 0, y: 1, z: 0 }),
//     bottom: new Object({ x: 0, y: -1, z: 0 }),
//     left: new Object({ x: -1, y: 0, z: 0 }),
//     right: new Object({ x: 1, y: 0, z: 0 }),
//     forward: new Object({ x: 0, y: 0, z: 1 }),
//     back: new Object({ x: 0, y: 0, z: -1 }),
// };

// class Map {
//     /**@type {Object} 맵을 구성하는 오브젝트들의 정보를 담는 객체 */
//     objects;
//     constructor(objects) {
//         this.objects = objects;
//     }

//     /**@type {() => void} 맵 최초 initialization */
//     Start() {}

//     /**틱마다 실행 되는 함수
//      * @param {number} dt delta time
//      * @returns {void}
//      */
//     Update(dt) {}
// }

// /**@type {(x: number, y: number, z: number) => object} */
// function Block(x, y, z) {
//     this.position = Vector.New(x, y, z);
// }

// class QuizMap extends Map {
//     // 커스텀 문제 데이터
//     quiz;
//     objects;
//     constructor() {
//         super({
//             blocks: [new Block(4, 0, 1), new Block(2, 0, 1), new Block(0, 0, 1), new Block(-2, 0, 1), new Block(-4, 0, 1)],
//             players: {},
//         });
//     }

//     Join(player) {
//         this.objects.players[player.uuid] = player;
//         console.log(`${player.uuid}님이 접속 하셨습니다.`);
//     }
// }

// /**@type {QuizMap} */
// let map = new QuizMap();
// let users = {};

/**
 * @typedef Player
 * @property {{address: string, port: number}} info
 * @property {Vector3} position 현 위치
 * @property {Vector3} rotation 바라보는 방향
 * @property {Vector3} vector 현재 이동 벡터
 * @property {Boolean} out 퇴장 여부
 */

// /**@type {(uuid: string, info: {address: string, port: number}) => Player} */
// function Player(uuid, info) {
//     return new Object({
//         uuid: uuid,
//         info: info,
//         position: Vector.zero,
//         rotation: Vector.forward,
//         out: false,
//     });
// }
//#endregion

server.on("listening", (address, port) => {
    console.log(`* server is listening at ${address}:${port}`);
});

server.on("error", (error) => {
    console.log(`@ Server Error: ${error}`);
});

server.on(
    "test",
    /**@param {{data: {msg: string}, reply: function}} data */
    (data, sender) => {
        console.log(`data: ${data}`);

        // 둘 다 동일
        server.Send("test", "hi", sender, () => {});
        data.reply("test", "hi");
    }
);

//#region 폐기
server.on(
    "room-create",
    /**@param {{data: {}, reply: function}} data */
    (data, sender) => {}
);

server.on(
    "join",
    /**@param {{data: {id: string, position: Vector3}, reply: function}} payload */
    (payload, sender) => {
        if (!map) {
            map = new QuizMap();
            map.Join(Player(payload.data.id, sender));
            users[payload.data.id] = sender;
            payload.reply("host", {});
        }

        map.objects[payload.data.id] = { position: payload.data.position, vector: Vector.zero };
    }
);

server.on(
    "quiz-get",
    /**@param {{data: { }, reply: function}} data */
    (data, sender) => {
        data.reply("quiz-get", quiz);
    }
);

server.on(
    "quiz-upload",
    /**@param {{data: {quiz: string, options: string[], answers: string[], solution: string}, reply: function}} data */
    (data, sender) => {
        quiz = data.data;

        var i;

        for (i in quiz.answers) {
            quiz.answers[i] = quiz.answers[i].trim();
        }

        for (i in quiz.options) {
            quiz.options[i] = quiz.options[i].trim();
        }

        data.reply("quiz-get", quiz);
    }
);

server.on(
    "move",
    /**@param {{data: {id: string, rotation: Vector3, vector: Vector3}, reply: function}} payload */
    (payload, sender) => {
        var user = map.objects[payload.data.id];
        user.vector = payload.data.vector;
        user.rotation = payload.data.rotation;
        user.position = payload.data.position;

        payload.reply("sync", { keys: Object.keys(map.objects), objects: map.objects });
    }
);
//#endregion

let sockets = {};
let host = undefined;

//#region new
server.on(
    "reset",
    /**@type {(payload: {data: {id: string}, reply: (ev: string, d: Object, callback: () => void) => void}, sender: {address: string, port: number}) => void} */
    (payload, sender) => {
        if (!host) {
            sockets[payload.data.id] = sender;
            host = sender;
            return;
        }

        var s,
            l = Object.keys(sockets);

        for (s of l) {
            server.Send("reset", payload.data, sockets[s]);
        }

        sockets = {};
        sockets[payload.data.id] = sender;

        host = sender;

        // console.log(host);
    }
);

// 클라이언트 응답
server.on(
    "ac",
    (payload, sender) => {
        if (!sockets[payload.data.id] || sockets[payload.data.id] != sender) sockets[payload.data.id] = sender;

        if (!host) return;

        server.Send("ac", payload.data, host);
    }
)

server.on(
    "host",
    /**@type {(payload: {data: {id: string, data: object}, reply: (ev: string, d: Object, callback: () => void) => void}, sender: {address: string, port: number}) => void} */
    (payload, sender) => {
        if (!host) return;
        if (host.address != sender.address) return;

        var l = Object.keys(sockets),
            s;

        // broadcast from host to client
        for (s of l) {
            server.Send("host", payload.data, sockets[s]);
        }
    }
);

server.on(
    "client",
    /**@type {(payload: {data: {id: string, pos: Vecor3, rot: Vector3, animation: number}, reply: (ev: string, d: Object, callback: () => void) => void}, sender: {address: string, port: number}) => void} */
    (payload, sender) => {
        if (!sockets[payload.data.id] || sockets[payload.data.id] != sender) sockets[payload.data.id] = sender;

        if (!host) return;

        // send data to host
        server.Send("client", payload.data, host);
    }
);
//#endregion

server.Start(5500);
